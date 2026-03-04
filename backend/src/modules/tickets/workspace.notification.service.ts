import { TicketNotificationDeliveryStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { ticketsGraphService } from './tickets.graph.service.js';
import { ticketsNotificationStore } from './tickets.notification.store.js';
import { NotificationEventType, ticketsNotificationPolicyStore } from './tickets.notification.policy.store.js';
import { createDeliveryRecord, dedupWindowForEvent } from './workspace.notification.delivery.js';
import { toWorkspaceNotificationHtmlBody } from './workspace.notification.template.js';

type WorkspaceRecipient = {
  userId?: string;
  email: string;
  displayName?: string;
};

const normalizeRecipients = (input: {
  recipients: WorkspaceRecipient[];
  actorUserId?: string;
  includeActorRecipient?: boolean;
}) =>
  input.recipients
    .filter((recipient) => recipient.email)
    .filter((recipient) => input.includeActorRecipient || recipient.userId !== input.actorUserId)
    .map((recipient) => ({ ...recipient, email: recipient.email.trim().toLowerCase() }))
    .filter((recipient, index, rows) => rows.findIndex((row) => row.email === recipient.email) === index);

export const workspaceNotificationService = {
  async notify(input: {
    orgId: string;
    eventType: NotificationEventType;
    actorUserId?: string;
    includeActorRecipient?: boolean;
    title: string;
    summary: string;
    recipients: WorkspaceRecipient[];
    facts?: Array<{ title: string; value: string }>;
    openPath?: string;
    dedupeEntityKey?: string;
  }): Promise<void> {
    const policy = await ticketsNotificationPolicyStore.get(input.orgId);
    if (!policy.enabled) return;

    const eventPolicy = policy.events[input.eventType];
    if (!eventPolicy?.immediate) return;
    if (!policy.channels.email || !eventPolicy.channels.email) return;

    const org = await prisma.organization.findUnique({
      where: { id: input.orgId },
      select: { name: true }
    });

    const recipients = normalizeRecipients({
      recipients: input.recipients,
      actorUserId: input.actorUserId,
      includeActorRecipient: input.includeActorRecipient
    });

    for (const recipient of recipients) {
      const suppressionKey = [
        input.orgId,
        recipient.userId || recipient.email,
        input.eventType,
        input.dedupeEntityKey || input.title
      ].join(':');
      const shouldSend = await ticketsNotificationStore.shouldSend({
        orgId: input.orgId,
        suppressionKey,
        dedupWindowMs: dedupWindowForEvent(input.eventType)
      });
      if (!shouldSend) {
        await createDeliveryRecord({
          orgId: input.orgId,
          eventType: input.eventType,
          status: TicketNotificationDeliveryStatus.suppressed,
          recipientUserId: recipient.userId,
          recipientEmail: recipient.email,
          payload: { reason: 'dedup_window', input }
        });
        continue;
      }

      try {
        await ticketsGraphService.sendWorkspaceEmail({
          orgId: input.orgId,
          to: [recipient.email],
          subject: input.title,
          htmlBody: toWorkspaceNotificationHtmlBody({
            workspaceName: org?.name,
            recipientName: recipient.displayName,
            title: input.title,
            summary: input.summary,
            facts: input.facts,
            openPath: input.openPath
          }),
          threadKey: input.dedupeEntityKey ? `${input.eventType}-${input.dedupeEntityKey}` : input.eventType
        });
        await ticketsNotificationStore.markSent({ orgId: input.orgId, suppressionKey });
        await createDeliveryRecord({
          orgId: input.orgId,
          eventType: input.eventType,
          status: TicketNotificationDeliveryStatus.sent,
          recipientUserId: recipient.userId,
          recipientEmail: recipient.email,
          payload: input
        });
      } catch (error: any) {
        await createDeliveryRecord({
          orgId: input.orgId,
          eventType: input.eventType,
          status: TicketNotificationDeliveryStatus.failed,
          recipientUserId: recipient.userId,
          recipientEmail: recipient.email,
          lastError: String(error?.message || error),
          payload: input
        });
      }
    }
  }
};

