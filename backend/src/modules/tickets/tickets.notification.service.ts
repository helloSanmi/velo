import {
  TicketNotificationDeliveryKind,
  TicketNotificationDeliveryStatus,
  UserRole
} from '@prisma/client';
import { env } from '../../config/env.js';
import { createId } from '../../lib/ids.js';
import { prisma } from '../../lib/prisma.js';
import { ticketsGraphService } from './tickets.graph.service.js';
import { ticketsNotificationStore } from './tickets.notification.store.js';
import type { StoredIntakeTicket } from './tickets.store.js';
import { writeAudit } from '../audit/audit.service.js';
import {
  ticketsNotificationPolicyStore,
  type TicketNotificationPolicy
} from './tickets.notification.policy.store.js';
import { getTicketReference } from './tickets.reference.js';

type TicketEventType =
  | 'ticket_created'
  | 'ticket_assigned'
  | 'ticket_status_changed'
  | 'ticket_commented'
  | 'ticket_sla_breach'
  | 'ticket_approval_required';

type NotificationRecipient = {
  userId: string;
  email: string;
  displayName: string;
  role: UserRole;
};

type DispatchInput = {
  orgId: string;
  actorUserId: string;
  actorName: string;
  eventType: TicketEventType;
  ticketAfter: StoredIntakeTicket;
  ticketBefore?: StoredIntakeTicket | null;
  commentText?: string;
};

type QueueItem = {
  payload: DispatchInput;
  attempts: number;
  nextAttemptAt: number;
};

type DigestEntry = {
  orgId: string;
  recipient: NotificationRecipient;
  eventType: TicketEventType;
  policyTimezoneOffsetMinutes: number;
  cadence: 'hourly' | 'daily';
  dailyHourLocal: number;
  dueAt: number;
  count: number;
  ticketIds: Set<string>;
  ticketTitles: Set<string>;
  lastStatus: string;
  lastPriority: string;
  lastActorName: string;
  lastEventAt: number;
};

type SerializedDigestEntry = {
  orgId: string;
  recipient: NotificationRecipient;
  eventType: TicketEventType;
  policyTimezoneOffsetMinutes: number;
  cadence: 'hourly' | 'daily';
  dailyHourLocal: number;
  dueAt: number;
  count: number;
  ticketIds: string[];
  ticketTitles: string[];
  lastStatus: string;
  lastPriority: string;
  lastActorName: string;
  lastEventAt: number;
};

const DEDUP_WINDOWS: Record<TicketEventType, number> = {
  ticket_created: 10 * 60 * 1000,
  ticket_assigned: 5 * 60 * 1000,
  ticket_status_changed: 5 * 60 * 1000,
  ticket_commented: 3 * 60 * 1000,
  ticket_sla_breach: 15 * 60 * 1000,
  ticket_approval_required: 15 * 60 * 1000
};
const RETRY_BACKOFF_MS = [1000, 4000, 12000];

const queue: QueueItem[] = [];
const digestEntries = new Map<string, DigestEntry>();
let queueTimer: NodeJS.Timeout | null = null;
let digestTimer: NodeJS.Timeout | null = null;
let queueProcessing = false;
let digestProcessing = false;

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const titleForEvent = (eventType: TicketEventType, ticket: StoredIntakeTicket): string => {
  switch (eventType) {
    case 'ticket_created':
      return `New ticket: ${ticket.title}`;
    case 'ticket_assigned':
      return `Assigned to you: ${ticket.title}`;
    case 'ticket_status_changed':
      return `Status changed: ${ticket.title}`;
    case 'ticket_commented':
      return `New comment: ${ticket.title}`;
    case 'ticket_sla_breach':
      return `SLA alert: ${ticket.title}`;
    case 'ticket_approval_required':
      return `Approval required: ${ticket.title}`;
    default:
      return ticket.title;
  }
};

const summaryForEvent = (
  eventType: TicketEventType,
  input: { actorName: string; ticket: StoredIntakeTicket; previousStatus?: string; commentText?: string }
): string => {
  switch (eventType) {
    case 'ticket_created':
      return `${input.actorName} created a new ticket in ${input.ticket.projectId ? 'project scope' : 'workspace scope'}.`;
    case 'ticket_assigned':
      return `${input.actorName} assigned this ticket.`;
    case 'ticket_status_changed':
      return `${input.actorName} changed status from ${input.previousStatus || 'unknown'} to ${input.ticket.status}.`;
    case 'ticket_commented':
      return `${input.actorName} commented: "${(input.commentText || '').slice(0, 120)}"`;
    case 'ticket_sla_breach':
      return 'This ticket is at risk of breaching SLA.';
    case 'ticket_approval_required':
      return 'Ticket requires approval.';
    default:
      return 'Ticket updated.';
  }
};

const shouldNotifyEvent = (eventType: TicketEventType, ticket: StoredIntakeTicket): boolean => {
  if (eventType === 'ticket_created') return true;
  if (eventType === 'ticket_assigned') return true;
  if (eventType === 'ticket_status_changed') return true;
  if (eventType === 'ticket_commented') return true;
  if (eventType === 'ticket_sla_breach') return true;
  if (eventType === 'ticket_approval_required') return true;
  return ticket.priority === 'high' || ticket.priority === 'urgent';
};

const isWithinQuietHours = (input: {
  quietHoursEnabled: boolean;
  quietHoursStartHour: number;
  quietHoursEndHour: number;
  timezoneOffsetMinutes: number;
}): boolean => {
  if (!input.quietHoursEnabled) return false;
  const offsetMs = input.timezoneOffsetMinutes * 60_000;
  const localHour = new Date(Date.now() + offsetMs).getUTCHours();
  if (input.quietHoursStartHour === input.quietHoursEndHour) return true;
  if (input.quietHoursStartHour < input.quietHoursEndHour) {
    return localHour >= input.quietHoursStartHour && localHour < input.quietHoursEndHour;
  }
  return localHour >= input.quietHoursStartHour || localHour < input.quietHoursEndHour;
};

const ticketUrl = (ticketId: string): string =>
  `${env.FRONTEND_BASE_URL.replace(/\/$/, '')}/app?tickets=${encodeURIComponent(ticketId)}`;

const toHtmlBody = (input: {
  title: string;
  summary: string;
  ticket: StoredIntakeTicket;
  workspaceName?: string;
  recipientName?: string;
}): string => {
  const greeting = input.recipientName ? `Hi ${escapeHtml(input.recipientName)},` : 'Hi,';
  const workspaceName = escapeHtml(input.workspaceName || 'your workspace');
  return `
<div style="font-family:Segoe UI,Inter,system-ui,sans-serif;background:#f8fafc;padding:20px;color:#0f172a;line-height:1.55;">
  <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;">
    <div style="padding:14px 18px;background:#0f172a;color:#ffffff;">
      <div style="font-size:12px;letter-spacing:0.08em;text-transform:uppercase;opacity:0.85;">Velo Ticket Update</div>
      <div style="margin-top:4px;font-size:15px;font-weight:700;">${workspaceName}</div>
    </div>
    <div style="padding:18px;">
      <p style="margin:0 0 10px;color:#334155;font-size:14px;">${greeting}</p>
      <h2 style="margin:0 0 10px;font-size:24px;line-height:1.25;color:#0f172a;">${escapeHtml(input.title)}</h2>
      <p style="margin:0 0 14px;color:#334155;font-size:15px;">${escapeHtml(input.summary)}</p>
      <table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;margin:0 0 16px;">
        <tr>
          <td style="padding:8px 0;color:#64748b;font-size:13px;vertical-align:top;width:130px;">Reference</td>
          <td style="padding:8px 0;color:#0f172a;font-size:14px;font-weight:600;">${escapeHtml(getTicketReference(input.ticket))}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#64748b;font-size:13px;vertical-align:top;width:130px;">Priority</td>
          <td style="padding:8px 0;color:#0f172a;font-size:14px;font-weight:600;text-transform:capitalize;">${escapeHtml(input.ticket.priority)}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#64748b;font-size:13px;vertical-align:top;width:130px;">Status</td>
          <td style="padding:8px 0;color:#0f172a;font-size:14px;font-weight:600;">${escapeHtml(input.ticket.status)}</td>
        </tr>
      </table>
      <p style="margin:0 0 4px;">
        <a href="${escapeHtml(ticketUrl(input.ticket.id))}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;padding:10px 14px;border-radius:8px;font-weight:600;">
          Open ticket
        </a>
      </p>
      <p style="margin:14px 0 0;color:#64748b;font-size:12px;">You are receiving this because ticket notifications are enabled for your workspace role.</p>
    </div>
  </div>
</div>`;
};

const toDigestHtmlBody = (input: { entry: DigestEntry; workspaceName?: string; recipientName?: string }): string => {
  const ticketIdRows = Array.from(input.entry.ticketIds)
    .slice(0, 12)
    .map((id) => `<li style="margin:0 0 4px;">${escapeHtml(id)}</li>`)
    .join('');
  const titleRows = Array.from(input.entry.ticketTitles)
    .slice(0, 8)
    .map((title) => `<li style="margin:0 0 4px;">${escapeHtml(title)}</li>`)
    .join('');
  const greeting = input.recipientName ? `Hi ${escapeHtml(input.recipientName)},` : 'Hi,';
  const workspaceName = escapeHtml(input.workspaceName || 'your workspace');
  return `
<div style="font-family:Segoe UI,Inter,system-ui,sans-serif;background:#f8fafc;padding:20px;color:#0f172a;line-height:1.55;">
  <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;">
    <div style="padding:14px 18px;background:#0f172a;color:#ffffff;">
      <div style="font-size:12px;letter-spacing:0.08em;text-transform:uppercase;opacity:0.85;">Velo Ticket Digest</div>
      <div style="margin-top:4px;font-size:15px;font-weight:700;">${workspaceName}</div>
    </div>
    <div style="padding:18px;">
      <p style="margin:0 0 10px;color:#334155;font-size:14px;">${greeting}</p>
      <h2 style="margin:0 0 10px;font-size:24px;line-height:1.25;color:#0f172a;">Ticket digest: ${escapeHtml(input.entry.eventType.replaceAll('_', ' '))}</h2>
      <p style="margin:0 0 14px;color:#334155;font-size:15px;">${input.entry.count} updates in this digest window.</p>
      <table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;margin:0 0 16px;">
        <tr>
          <td style="padding:8px 0;color:#64748b;font-size:13px;vertical-align:top;width:130px;">Last actor</td>
          <td style="padding:8px 0;color:#0f172a;font-size:14px;font-weight:600;">${escapeHtml(input.entry.lastActorName)}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#64748b;font-size:13px;vertical-align:top;width:130px;">Last status</td>
          <td style="padding:8px 0;color:#0f172a;font-size:14px;font-weight:600;">${escapeHtml(input.entry.lastStatus)}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#64748b;font-size:13px;vertical-align:top;width:130px;">Last priority</td>
          <td style="padding:8px 0;color:#0f172a;font-size:14px;font-weight:600;text-transform:capitalize;">${escapeHtml(input.entry.lastPriority)}</td>
        </tr>
      </table>
      <p style="margin:0 0 8px;color:#334155;font-size:13px;font-weight:600;">References</p>
      <ul style="margin:0 0 12px 18px;color:#334155;">${ticketIdRows || '<li>No references captured</li>'}</ul>
      <p style="margin:0 0 8px;color:#334155;font-size:13px;font-weight:600;">Ticket titles</p>
      <ul style="margin:0 0 4px 18px;color:#334155;">${titleRows || '<li>No titles captured</li>'}</ul>
    </div>
  </div>
</div>`;
};

const serializeDigestEntry = (entry: DigestEntry): SerializedDigestEntry => ({
  ...entry,
  ticketIds: Array.from(entry.ticketIds),
  ticketTitles: Array.from(entry.ticketTitles)
});

const computeDigestDueAt = (input: {
  now: number;
  cadence: 'hourly' | 'daily';
  dailyHourLocal: number;
  timezoneOffsetMinutes: number;
}): number => {
  const offsetMs = input.timezoneOffsetMinutes * 60_000;
  const localNow = new Date(input.now + offsetMs);
  if (input.cadence === 'hourly') {
    const next = new Date(localNow);
    next.setUTCMinutes(0, 0, 0);
    next.setUTCHours(next.getUTCHours() + 1);
    return next.getTime() - offsetMs;
  }
  const next = new Date(localNow);
  next.setUTCHours(input.dailyHourLocal, 0, 0, 0);
  if (next.getTime() <= localNow.getTime()) next.setUTCDate(next.getUTCDate() + 1);
  return next.getTime() - offsetMs;
};

const resolveRecipients = async (input: {
  orgId: string;
  actorUserId: string;
  eventType: TicketEventType;
  ticketAfter: StoredIntakeTicket;
}): Promise<NotificationRecipient[]> => {
  const users = await prisma.user.findMany({
    where: { orgId: input.orgId, licenseActive: true },
    select: { id: true, email: true, displayName: true, role: true }
  });
  const byId = new Map(users.map((user) => [user.id, user]));
  const recipientIds = new Set<string>();
  const add = (userId?: string, options?: { allowActor?: boolean }) => {
    if (!userId) return;
    if (!options?.allowActor && userId === input.actorUserId) return;
    if (byId.has(userId)) recipientIds.add(userId);
  };
  if (input.eventType === 'ticket_created') {
    // If creator assigns ticket to self, still notify for explicit assignment trail.
    add(input.ticketAfter.assigneeId, { allowActor: true });
    users.filter((user) => user.role === 'admin').forEach((user) => add(user.id));
  }
  if (input.eventType === 'ticket_assigned') add(input.ticketAfter.assigneeId, { allowActor: true });
  if (input.eventType === 'ticket_status_changed' || input.eventType === 'ticket_commented') {
    add(input.ticketAfter.requesterUserId);
    add(input.ticketAfter.assigneeId);
  }
  if (input.eventType === 'ticket_sla_breach' || input.eventType === 'ticket_approval_required') {
    users.filter((user) => user.role === 'admin').forEach((user) => add(user.id));
  }
  return Array.from(recipientIds)
    .map((id) => byId.get(id))
    .filter((user): user is NonNullable<typeof user> => Boolean(user))
    .filter((user) => Boolean(user.email))
    .map((user) => ({ userId: user.id, email: user.email, displayName: user.displayName, role: user.role }));
};

const createDeliveryRecord = async (input: {
  orgId: string;
  kind: TicketNotificationDeliveryKind;
  eventType: string;
  status: TicketNotificationDeliveryStatus;
  ticketId?: string;
  recipientUserId?: string;
  recipientEmail?: string;
  attempts?: number;
  maxAttempts?: number;
  nextAttemptAt?: number;
  lastError?: string;
  payload?: unknown;
  sentAt?: number;
  resolvedAt?: number;
}) => {
  await prisma.ticketNotificationDelivery.create({
    data: {
      id: createId('tnd'),
      orgId: input.orgId,
      kind: input.kind,
      eventType: input.eventType,
      status: input.status,
      ticketId: input.ticketId,
      recipientUserId: input.recipientUserId,
      recipientEmail: input.recipientEmail,
      attempts: input.attempts || 0,
      maxAttempts: input.maxAttempts || RETRY_BACKOFF_MS.length,
      nextAttemptAt: input.nextAttemptAt ? new Date(input.nextAttemptAt) : null,
      lastError: input.lastError,
      payload: input.payload as any,
      sentAt: input.sentAt ? new Date(input.sentAt) : null,
      resolvedAt: input.resolvedAt ? new Date(input.resolvedAt) : null
    }
  });
};

const addDigestEntry = (input: { payload: DispatchInput; recipient: NotificationRecipient; policy: TicketNotificationPolicy }) => {
  const key = `${input.payload.orgId}:${input.recipient.userId}:${input.payload.eventType}`;
  const now = Date.now();
  const existing = digestEntries.get(key);
  const dueAt =
    existing?.dueAt ??
    computeDigestDueAt({
      now,
      cadence: input.policy.digest.cadence,
      dailyHourLocal: input.policy.digest.dailyHourLocal,
      timezoneOffsetMinutes: input.policy.timezoneOffsetMinutes
    });
  const entry: DigestEntry = existing || {
    orgId: input.payload.orgId,
    recipient: input.recipient,
    eventType: input.payload.eventType,
    policyTimezoneOffsetMinutes: input.policy.timezoneOffsetMinutes,
    cadence: input.policy.digest.cadence,
    dailyHourLocal: input.policy.digest.dailyHourLocal,
    dueAt,
    count: 0,
    ticketIds: new Set<string>(),
    ticketTitles: new Set<string>(),
    lastStatus: input.payload.ticketAfter.status,
    lastPriority: input.payload.ticketAfter.priority,
    lastActorName: input.payload.actorName,
    lastEventAt: now
  };
  entry.count += 1;
  entry.ticketIds.add(input.payload.ticketAfter.id);
  entry.ticketTitles.add(input.payload.ticketAfter.title);
  entry.lastStatus = input.payload.ticketAfter.status;
  entry.lastPriority = input.payload.ticketAfter.priority;
  entry.lastActorName = input.payload.actorName;
  entry.lastEventAt = now;
  entry.cadence = input.policy.digest.cadence;
  entry.dailyHourLocal = input.policy.digest.dailyHourLocal;
  entry.policyTimezoneOffsetMinutes = input.policy.timezoneOffsetMinutes;
  digestEntries.set(key, entry);
};

const processDispatch = async (
  input: DispatchInput,
  queueAttempt = 0
): Promise<{ delivered: number; suppressed: number }> => {
  if (!shouldNotifyEvent(input.eventType, input.ticketAfter)) return { delivered: 0, suppressed: 0 };
  const policy = await ticketsNotificationPolicyStore.get(input.orgId);
  if (!policy.enabled) return { delivered: 0, suppressed: 0 };
  const org = await prisma.organization.findUnique({
    where: { id: input.orgId },
    select: { name: true }
  });
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
  const dedupWindowMs = DEDUP_WINDOWS[input.eventType];

  for (const recipient of recipients) {
      const allowImmediateEmail =
      policy.channels.email &&
      eventPolicy.channels.email &&
      eventPolicy.immediate &&
      (!inQuietHours || criticalEvent);

    if (allowImmediateEmail) {
      const suppressionKey = [
        input.orgId,
        recipient.userId,
        input.eventType,
        input.ticketAfter.id,
        input.ticketAfter.status
      ].join(':');
      const shouldSend = await ticketsNotificationStore.shouldSend({
        orgId: input.orgId,
        suppressionKey,
        dedupWindowMs
      });
      if (shouldSend) {
        try {
          await ticketsGraphService.sendTicketEmail({
            orgId: input.orgId,
            to: [recipient.email],
            subject: title,
            htmlBody: toHtmlBody({
              title,
              summary,
              ticket: input.ticketAfter,
              workspaceName: org?.name,
              recipientName: recipient.displayName
            }),
            ticketId: input.ticketAfter.id,
            ticketCode: input.ticketAfter.ticketCode
          });
          await ticketsNotificationStore.markSent({ orgId: input.orgId, suppressionKey });
          delivered += 1;
          await createDeliveryRecord({
            orgId: input.orgId,
            kind: TicketNotificationDeliveryKind.immediate,
            eventType: input.eventType,
            status: TicketNotificationDeliveryStatus.sent,
            ticketId: input.ticketAfter.id,
            recipientUserId: recipient.userId,
            recipientEmail: recipient.email,
            attempts: queueAttempt + 1,
            sentAt: Date.now(),
            payload: { dispatch: input }
          });
        } catch (error: any) {
          firstError = firstError || new Error(error?.message || 'Ticket notification send failed.');
          await createDeliveryRecord({
            orgId: input.orgId,
            kind: TicketNotificationDeliveryKind.immediate,
            eventType: input.eventType,
            status: TicketNotificationDeliveryStatus.failed,
            ticketId: input.ticketAfter.id,
            recipientUserId: recipient.userId,
            recipientEmail: recipient.email,
            attempts: queueAttempt + 1,
            nextAttemptAt: Date.now() + (RETRY_BACKOFF_MS[Math.min(queueAttempt, RETRY_BACKOFF_MS.length - 1)] || 1000),
            lastError: String(error?.message || error),
            payload: { dispatch: input }
          });
        }
      } else {
        suppressed += 1;
        await createDeliveryRecord({
          orgId: input.orgId,
          kind: TicketNotificationDeliveryKind.immediate,
          eventType: input.eventType,
          status: TicketNotificationDeliveryStatus.suppressed,
          ticketId: input.ticketAfter.id,
          recipientUserId: recipient.userId,
          recipientEmail: recipient.email,
          attempts: queueAttempt + 1,
          payload: { dispatch: input, reason: 'dedup_window' }
        });
      }
    } else {
      suppressed += 1;
      await createDeliveryRecord({
        orgId: input.orgId,
        kind: TicketNotificationDeliveryKind.immediate,
        eventType: input.eventType,
        status: TicketNotificationDeliveryStatus.suppressed,
        ticketId: input.ticketAfter.id,
        recipientUserId: recipient.userId,
        recipientEmail: recipient.email,
        attempts: queueAttempt + 1,
        payload: { dispatch: input, reason: 'channel_or_quiet_hours' }
      });
    }

    const allowDigestEmail =
      policy.digest.enabled && policy.channels.email && eventPolicy.channels.email && eventPolicy.digest;
    if (allowDigestEmail) {
      addDigestEntry({ payload: input, recipient, policy });
    }
  }

  if (
    policy.channels.teams &&
    eventPolicy.channels.teams &&
    ['ticket_created', 'ticket_sla_breach', 'ticket_approval_required'].includes(input.eventType)
  ) {
    try {
      await ticketsGraphService.sendTicketTeamsCard({
        orgId: input.orgId,
        title,
        summary,
        ticketId: input.ticketAfter.id,
        facts: [
          { title: 'Reference', value: getTicketReference(input.ticketAfter) },
          { title: 'Status', value: input.ticketAfter.status },
          { title: 'Priority', value: input.ticketAfter.priority }
        ]
      });
    } catch {
      // Optional channel.
    }
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

const processQueue = async (): Promise<void> => {
  if (queueProcessing) return;
  queueProcessing = true;
  try {
    while (true) {
      const now = Date.now();
      const index = queue.findIndex((row) => row.nextAttemptAt <= now);
      if (index < 0) break;
      const item = queue.splice(index, 1)[0];
      try {
        await processDispatch(item.payload, item.attempts);
      } catch (error: any) {
        const nextAttempt = item.attempts + 1;
        if (nextAttempt < RETRY_BACKOFF_MS.length) {
          queue.push({
            payload: item.payload,
            attempts: nextAttempt,
            nextAttemptAt: Date.now() + RETRY_BACKOFF_MS[nextAttempt]
          });
        } else {
          await createDeliveryRecord({
            orgId: item.payload.orgId,
            kind: TicketNotificationDeliveryKind.immediate,
            eventType: item.payload.eventType,
            status: TicketNotificationDeliveryStatus.dead_letter,
            ticketId: item.payload.ticketAfter.id,
            attempts: nextAttempt + 1,
            maxAttempts: RETRY_BACKOFF_MS.length,
            lastError: String(error?.message || error),
            payload: { dispatch: item.payload }
          });
        }
      }
    }
  } finally {
    queueProcessing = false;
  }
};

const flushDigest = async (): Promise<void> => {
  if (digestProcessing) return;
  digestProcessing = true;
  try {
    const now = Date.now();
    const entries = Array.from(digestEntries.entries()).filter(([, row]) => row.dueAt <= now);
    for (const [key, entry] of entries) {
      if (entry.count <= 0) {
        digestEntries.delete(key);
        continue;
      }
      try {
        const digestOrg = await prisma.organization.findUnique({
          where: { id: entry.orgId },
          select: { name: true }
        });
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
  } finally {
    digestProcessing = false;
  }
};

export const startTicketsNotificationQueue = () => {
  if (!env.TICKETS_NOTIFICATION_QUEUE_ENABLED || env.NODE_ENV === 'test') return () => {};
  const queuePollMs = Math.max(1000, env.TICKETS_NOTIFICATION_QUEUE_POLL_MS);
  const digestFlushMs = Math.max(5000, env.TICKETS_NOTIFICATION_DIGEST_FLUSH_MS);

  queueTimer = setInterval(() => {
    void processQueue();
  }, queuePollMs);
  queueTimer.unref?.();

  digestTimer = setInterval(() => {
    void flushDigest();
  }, digestFlushMs);
  digestTimer.unref?.();

  return () => {
    if (queueTimer) clearInterval(queueTimer);
    if (digestTimer) clearInterval(digestTimer);
    queueTimer = null;
    digestTimer = null;
  };
};

export const ticketsNotificationService = {
  async dispatch(input: DispatchInput): Promise<{ delivered: number; suppressed: number }> {
    return processDispatch(input, 0);
  },
  async enqueue(input: DispatchInput): Promise<{ queued: boolean; queueDepth: number }> {
    queue.push({
      payload: input,
      attempts: 0,
      nextAttemptAt: Date.now()
    });
    await createDeliveryRecord({
      orgId: input.orgId,
      kind: TicketNotificationDeliveryKind.immediate,
      eventType: input.eventType,
      status: TicketNotificationDeliveryStatus.queued,
      ticketId: input.ticketAfter.id,
      attempts: 0,
      maxAttempts: RETRY_BACKOFF_MS.length,
      nextAttemptAt: Date.now(),
      payload: { dispatch: input }
    });
    return { queued: true, queueDepth: queue.length };
  }
};
