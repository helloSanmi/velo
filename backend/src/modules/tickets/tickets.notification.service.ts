import {
  TicketNotificationDeliveryKind,
  TicketNotificationDeliveryStatus
} from '@prisma/client';
import { env } from '../../config/env.js';
import { createDeliveryRecord } from './tickets.notification.delivery.js';
import { flushDigest, processDispatch } from './tickets.notification.dispatch.js';
import { RETRY_BACKOFF_MS } from './tickets.notification.types.js';
import type { DigestEntry, DispatchInput, QueueItem } from './tickets.notification.types.js';

const queue: QueueItem[] = [];
const digestEntries = new Map<string, DigestEntry>();
let queueTimer: NodeJS.Timeout | null = null;
let digestTimer: NodeJS.Timeout | null = null;
let queueProcessing = false;
let digestProcessing = false;

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
        await processDispatch(item.payload, item.attempts, digestEntries);
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

const processDigest = async (): Promise<void> => {
  if (digestProcessing) return;
  digestProcessing = true;
  try {
    await flushDigest(digestEntries);
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
    void processDigest();
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
    return processDispatch(input, 0, digestEntries);
  },
  async enqueue(input: DispatchInput): Promise<{ queued: boolean; queueDepth: number }> {
    const nextAttemptAt = Date.now();
    queue.push({
      payload: input,
      attempts: 0,
      nextAttemptAt
    });
    await createDeliveryRecord({
      orgId: input.orgId,
      kind: TicketNotificationDeliveryKind.immediate,
      eventType: input.eventType,
      status: TicketNotificationDeliveryStatus.queued,
      ticketId: input.ticketAfter.id,
      attempts: 0,
      maxAttempts: RETRY_BACKOFF_MS.length,
      nextAttemptAt,
      payload: { dispatch: input }
    });
    return { queued: true, queueDepth: queue.length };
  }
};
