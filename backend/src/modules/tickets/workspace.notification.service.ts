import { TicketNotificationDeliveryKind, TicketNotificationDeliveryStatus } from '@prisma/client';
import { env } from '../../config/env.js';
import { createId } from '../../lib/ids.js';
import { prisma } from '../../lib/prisma.js';
import { ticketsGraphService } from './tickets.graph.service.js';
import { ticketsNotificationStore } from './tickets.notification.store.js';
import { NotificationEventType, ticketsNotificationPolicyStore } from './tickets.notification.policy.store.js';

type WorkspaceRecipient = {
  userId?: string;
  email: string;
  displayName?: string;
};

const escapeHtml = (value: string): string =>
  String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const toHtmlBody = (input: {
  workspaceName?: string;
  recipientName?: string;
  title: string;
  summary: string;
  facts?: Array<{ title: string; value: string }>;
  openPath?: string;
}) => {
  const factRows = (input.facts || [])
    .filter((row) => row.title && row.value)
    .map(
      (row) =>
        `<tr>
          <td style="padding:8px 0;color:#64748b;font-size:13px;vertical-align:top;width:130px;">${escapeHtml(row.title)}</td>
          <td style="padding:8px 0;color:#0f172a;font-size:14px;font-weight:600;">${escapeHtml(row.value)}</td>
        </tr>`
    )
    .join('');
  const openUrl = input.openPath
    ? escapeHtml(`${env.FRONTEND_BASE_URL.replace(/\/$/, '')}${input.openPath}`)
    : '';
  const greeting = input.recipientName ? `Hi ${escapeHtml(input.recipientName)},` : 'Hi,';
  const workspaceName = escapeHtml(input.workspaceName || 'your workspace');
  return `
<div style="font-family:Segoe UI,Inter,system-ui,sans-serif;background:#f8fafc;padding:20px;color:#0f172a;line-height:1.55;">
  <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;">
    <div style="padding:14px 18px;background:#0f172a;color:#ffffff;">
      <div style="font-size:12px;letter-spacing:0.08em;text-transform:uppercase;opacity:0.85;">Velo Workspace Notification</div>
      <div style="margin-top:4px;font-size:15px;font-weight:700;">${workspaceName}</div>
    </div>
    <div style="padding:18px;">
      <p style="margin:0 0 10px;color:#334155;font-size:14px;">${greeting}</p>
      <h2 style="margin:0 0 10px;font-size:24px;line-height:1.25;color:#0f172a;">${escapeHtml(input.title)}</h2>
      <p style="margin:0 0 14px;color:#334155;font-size:15px;">${escapeHtml(input.summary)}</p>
      ${
        factRows
          ? `<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;margin:0 0 16px;">${factRows}</table>`
          : ''
      }
      ${
        openUrl
          ? `<p style="margin:0 0 4px;">
              <a href="${openUrl}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;padding:10px 14px;border-radius:8px;font-weight:600;">
                Open in Velo
              </a>
            </p>`
          : ''
      }
      <p style="margin:14px 0 0;color:#64748b;font-size:12px;">This notification was sent by your workspace policy settings.</p>
    </div>
  </div>
</div>`;
};

const createDeliveryRecord = async (input: {
  orgId: string;
  eventType: NotificationEventType;
  status: TicketNotificationDeliveryStatus;
  recipientUserId?: string;
  recipientEmail?: string;
  attempts?: number;
  lastError?: string;
  payload?: unknown;
}) => {
  await prisma.ticketNotificationDelivery.create({
    data: {
      id: createId('tnd'),
      orgId: input.orgId,
      kind: TicketNotificationDeliveryKind.immediate,
      eventType: input.eventType,
      status: input.status,
      recipientUserId: input.recipientUserId,
      recipientEmail: input.recipientEmail,
      attempts: input.attempts || 1,
      maxAttempts: 1,
      lastError: input.lastError,
      payload: input.payload as any,
      sentAt: input.status === TicketNotificationDeliveryStatus.sent ? new Date() : null,
      resolvedAt: null
    }
  });
};

const dedupWindowForEvent = (eventType: NotificationEventType): number => {
  if (eventType === 'task_due_overdue') return 60 * 60 * 1000;
  if (eventType === 'security_admin_alerts') return 2 * 60 * 1000;
  return 5 * 60 * 1000;
};

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

    const recipients = input.recipients
      .filter((recipient) => recipient.email)
      .filter((recipient) => input.includeActorRecipient || recipient.userId !== input.actorUserId)
      .map((recipient) => ({ ...recipient, email: recipient.email.trim().toLowerCase() }))
      .filter((recipient, index, rows) => rows.findIndex((row) => row.email === recipient.email) === index);

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
          htmlBody: toHtmlBody({
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
