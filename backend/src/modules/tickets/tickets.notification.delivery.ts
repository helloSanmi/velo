import {
  TicketNotificationDeliveryKind,
  TicketNotificationDeliveryStatus
} from '@prisma/client';
import { createId } from '../../lib/ids.js';
import { prisma } from '../../lib/prisma.js';
import { RETRY_BACKOFF_MS } from './tickets.notification.types.js';

export const createDeliveryRecord = async (input: {
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
