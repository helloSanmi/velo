import {
  TicketNotificationDeliveryKind,
  TicketNotificationDeliveryStatus
} from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { writeAudit } from '../audit/audit.service.js';
import { createDeliveryRecord } from './tickets.notification.delivery.js';
import { addDigestEntry, serializeDigestEntry, shouldNotifyEvent, isWithinQuietHours } from './tickets.notification.logic.js';
import { resolveRecipients } from './tickets.notification.recipients.js';
import { summaryForEvent, titleForEvent, toDigestHtmlBody } from './tickets.notification.templates.js';
import { ticketsGraphService } from './tickets.graph.service.js';
import { ticketsNotificationPolicyStore } from './tickets.notification.policy.store.js';
import { DEDUP_WINDOWS } from './tickets.notification.types.js';
import {
  createFailedDeliveryRecord,
  sendImmediateForRecipient,
  sendTeamsCardIfEligible
} from './tickets.notification.dispatch.immediate.js';
import type { DigestEntry, DispatchInput } from './tickets.notification.types.js';

export const processDispatch = async (
  input: DispatchInput,
  queueAttempt: number,
  digestEntries: Map<string, DigestEntry>
): Promise<{ delivered: number; suppressed: number }> => {
  if (!shouldNotifyEvent(input.eventType, input.ticketAfter)) return { delivered: 0, suppressed: 0 };
  const policy = await ticketsNotificationPolicyStore.get(input.orgId);
  if (!policy.enabled) return { delivered: 0, suppressed: 0 };
  const org = await prisma.organization.findUnique({ where: { id: input.orgId }, select: { name: true } });
  const eventPolicy = policy.events[input.eventType];
  if (!eventPolicy || (!eventPolicy.immediate && !eventPolicy.digest)) return { delivered: 0, suppressed: 0 };

  const inQuietHours = isWithinQuietHours({
    quietHoursEnabled: policy.quietHoursEnabled,
    quietHoursStartHour: policy.quietHoursStartHour,
    quietHoursEndHour: policy.quietHoursEndHour,
    timezoneOffsetMinutes: policy.timezoneOffsetMinutes
  });
  const criticalEvent = input.eventType === 'ticket_sla_breach' || input.eventType === 'ticket_approval_required';
  const recipients = await resolveRecipients({
    orgId: input.orgId,
    actorUserId: input.actorUserId,
    eventType: input.eventType,
    ticketAfter: input.ticketAfter
  });

  const title = titleForEvent(input.eventType, input.ticketAfter);
  const summary = summaryForEvent(input.eventType, {
    actorName: input.actorName,
    ticket: input.ticketAfter,
    previousStatus: input.ticketBefore?.status,
    commentText: input.commentText
  });

  let delivered = 0;
  let suppressed = 0;
  let firstError: Error | null = null;

  for (const recipient of recipients) {
    try {
      const stats = await sendImmediateForRecipient({
        payload: input,
        recipient,
        title,
        summary,
        workspaceName: org?.name,
        dedupWindowMs: DEDUP_WINDOWS[input.eventType],
        queueAttempt,
        allowImmediateEmail:
          policy.channels.email &&
          eventPolicy.channels.email &&
          eventPolicy.immediate &&
          (!inQuietHours || criticalEvent)
      });
      delivered += stats.delivered;
      suppressed += stats.suppressed;
    } catch (error: any) {
      firstError = firstError || new Error(error?.message || 'Ticket notification send failed.');
      await createFailedDeliveryRecord({ payload: input, recipient, queueAttempt, error });
    }

    if (policy.digest.enabled && policy.channels.email && eventPolicy.channels.email && eventPolicy.digest) {
      addDigestEntry({ payload: input, recipient, policy, digestEntries });
    }
  }

  try {
    await sendTeamsCardIfEligible({
      payload: input,
      eventType: input.eventType,
      enabled: policy.channels.teams && eventPolicy.channels.teams,
      title,
      summary
    });
  } catch {
    // Optional channel.
  }

  await writeAudit({
    orgId: input.orgId,
    userId: input.actorUserId,
    actionType: 'task_updated',
    action: `Ticket notification dispatch: ${input.eventType}`,
    entityType: 'intake_ticket',
    entityId: input.ticketAfter.id,
    metadata: { eventType: input.eventType, delivered, suppressed }
  });

  if (firstError) throw firstError;
  return { delivered, suppressed };
};

export const flushDigest = async (digestEntries: Map<string, DigestEntry>): Promise<void> => {
  const now = Date.now();
  const entries = Array.from(digestEntries.entries()).filter(([, row]) => row.dueAt <= now);
  for (const [key, entry] of entries) {
    if (entry.count <= 0) {
      digestEntries.delete(key);
      continue;
    }
    try {
      const digestOrg = await prisma.organization.findUnique({ where: { id: entry.orgId }, select: { name: true } });
      await ticketsGraphService.sendTicketEmail({
        orgId: entry.orgId,
        to: [entry.recipient.email],
        subject: `Ticket digest (${entry.eventType.replaceAll('_', ' ')})`,
        htmlBody: toDigestHtmlBody({
          entry,
          workspaceName: digestOrg?.name,
          recipientName: entry.recipient.displayName
        }),
        ticketId: Array.from(entry.ticketIds)[0] || 'digest'
      });
      await createDeliveryRecord({
        orgId: entry.orgId,
        kind: TicketNotificationDeliveryKind.digest,
        eventType: entry.eventType,
        status: TicketNotificationDeliveryStatus.sent,
        ticketId: Array.from(entry.ticketIds)[0],
        recipientUserId: entry.recipient.userId,
        recipientEmail: entry.recipient.email,
        attempts: 1,
        sentAt: Date.now(),
        payload: { digest: serializeDigestEntry(entry) }
      });
    } catch (error: any) {
      await createDeliveryRecord({
        orgId: entry.orgId,
        kind: TicketNotificationDeliveryKind.digest,
        eventType: entry.eventType,
        status: TicketNotificationDeliveryStatus.dead_letter,
        ticketId: Array.from(entry.ticketIds)[0],
        recipientUserId: entry.recipient.userId,
        recipientEmail: entry.recipient.email,
        attempts: 1,
        maxAttempts: 1,
        lastError: String(error?.message || error),
        payload: { digest: serializeDigestEntry(entry) }
      });
      continue;
    }
    digestEntries.delete(key);
  }
};
