import { TicketNotificationDeliveryKind, TicketNotificationDeliveryStatus } from '@prisma/client';
import { createId } from '../../lib/ids.js';
import { prisma } from '../../lib/prisma.js';
import { NotificationEventType } from './tickets.notification.policy.store.js';

export const createDeliveryRecord = async (input: {
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

export const dedupWindowForEvent = (eventType: NotificationEventType): number => {
  if (eventType === 'task_due_overdue') return 60 * 60 * 1000;
  if (eventType === 'security_admin_alerts') return 2 * 60 * 1000;
  return 5 * 60 * 1000;
};

