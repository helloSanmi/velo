import {
  TicketNotificationDeliveryKind,
  TicketNotificationDeliveryStatus
} from '@prisma/client';
import { ticketsGraphService } from './tickets.graph.service.js';
import { ticketsNotificationStore } from './tickets.notification.store.js';
import { getTicketReference } from './tickets.reference.js';
import { createDeliveryRecord } from './tickets.notification.delivery.js';
import { toHtmlBody } from './tickets.notification.templates.js';
import { RETRY_BACKOFF_MS } from './tickets.notification.types.js';
import type {
  DispatchInput,
  NotificationRecipient,
  TicketEventType
} from './tickets.notification.types.js';

export const sendImmediateForRecipient = async (input: {
  payload: DispatchInput;
  recipient: NotificationRecipient;
  title: string;
  summary: string;
  workspaceName?: string;
  dedupWindowMs: number;
  queueAttempt: number;
  allowImmediateEmail: boolean;
}): Promise<{ delivered: number; suppressed: number }> => {
  const { payload, recipient } = input;
  if (!input.allowImmediateEmail) {
    await createDeliveryRecord({
      orgId: payload.orgId,
      kind: TicketNotificationDeliveryKind.immediate,
      eventType: payload.eventType,
      status: TicketNotificationDeliveryStatus.suppressed,
      ticketId: payload.ticketAfter.id,
      recipientUserId: recipient.userId,
      recipientEmail: recipient.email,
      attempts: input.queueAttempt + 1,
      payload: { dispatch: payload, reason: 'channel_or_quiet_hours' }
    });
    return { delivered: 0, suppressed: 1 };
  }

  const suppressionKey = [
    payload.orgId,
    recipient.userId,
    payload.eventType,
    payload.ticketAfter.id,
    payload.ticketAfter.status
  ].join(':');
  const shouldSend = await ticketsNotificationStore.shouldSend({
    orgId: payload.orgId,
    suppressionKey,
    dedupWindowMs: input.dedupWindowMs
  });

  if (!shouldSend) {
    await createDeliveryRecord({
      orgId: payload.orgId,
      kind: TicketNotificationDeliveryKind.immediate,
      eventType: payload.eventType,
      status: TicketNotificationDeliveryStatus.suppressed,
      ticketId: payload.ticketAfter.id,
      recipientUserId: recipient.userId,
      recipientEmail: recipient.email,
      attempts: input.queueAttempt + 1,
      payload: { dispatch: payload, reason: 'dedup_window' }
    });
    return { delivered: 0, suppressed: 1 };
  }

  await ticketsGraphService.sendTicketEmail({
    orgId: payload.orgId,
    to: [recipient.email],
    subject: input.title,
    htmlBody: toHtmlBody({
      title: input.title,
      summary: input.summary,
      ticket: payload.ticketAfter,
      workspaceName: input.workspaceName,
      recipientName: recipient.displayName
    }),
    ticketId: payload.ticketAfter.id,
    ticketCode: payload.ticketAfter.ticketCode
  });
  await ticketsNotificationStore.markSent({ orgId: payload.orgId, suppressionKey });
  await createDeliveryRecord({
    orgId: payload.orgId,
    kind: TicketNotificationDeliveryKind.immediate,
    eventType: payload.eventType,
    status: TicketNotificationDeliveryStatus.sent,
    ticketId: payload.ticketAfter.id,
    recipientUserId: recipient.userId,
    recipientEmail: recipient.email,
    attempts: input.queueAttempt + 1,
    sentAt: Date.now(),
    payload: { dispatch: payload }
  });
  return { delivered: 1, suppressed: 0 };
};

export const sendTeamsCardIfEligible = async (input: {
  payload: DispatchInput;
  eventType: TicketEventType;
  enabled: boolean;
  title: string;
  summary: string;
}) => {
  if (!input.enabled) return;
  if (!['ticket_created', 'ticket_sla_breach', 'ticket_approval_required'].includes(input.eventType)) return;
  await ticketsGraphService.sendTicketTeamsCard({
    orgId: input.payload.orgId,
    title: input.title,
    summary: input.summary,
    ticketId: input.payload.ticketAfter.id,
    facts: [
      { title: 'Reference', value: getTicketReference(input.payload.ticketAfter) },
      { title: 'Status', value: input.payload.ticketAfter.status },
      { title: 'Priority', value: input.payload.ticketAfter.priority }
    ]
  });
};

export const createFailedDeliveryRecord = async (input: {
  payload: DispatchInput;
  recipient: NotificationRecipient;
  queueAttempt: number;
  error: unknown;
}) => {
  await createDeliveryRecord({
    orgId: input.payload.orgId,
    kind: TicketNotificationDeliveryKind.immediate,
    eventType: input.payload.eventType,
    status: TicketNotificationDeliveryStatus.failed,
    ticketId: input.payload.ticketAfter.id,
    recipientUserId: input.recipient.userId,
    recipientEmail: input.recipient.email,
    attempts: input.queueAttempt + 1,
    nextAttemptAt:
      Date.now() + (RETRY_BACKOFF_MS[Math.min(input.queueAttempt, RETRY_BACKOFF_MS.length - 1)] || 1000),
    lastError: String((input.error as any)?.message || input.error),
    payload: { dispatch: input.payload }
  });
};
