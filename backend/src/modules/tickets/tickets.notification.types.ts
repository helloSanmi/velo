import type { UserRole } from '@prisma/client';
import type { StoredIntakeTicket } from './tickets.store.js';

export type TicketEventType =
  | 'ticket_created'
  | 'ticket_assigned'
  | 'ticket_status_changed'
  | 'ticket_commented'
  | 'ticket_sla_breach'
  | 'ticket_approval_required';

export type NotificationRecipient = {
  userId: string;
  email: string;
  displayName: string;
  role: UserRole;
};

export type DispatchInput = {
  orgId: string;
  actorUserId: string;
  actorName: string;
  eventType: TicketEventType;
  ticketAfter: StoredIntakeTicket;
  ticketBefore?: StoredIntakeTicket | null;
  commentText?: string;
};

export type QueueItem = {
  payload: DispatchInput;
  attempts: number;
  nextAttemptAt: number;
};

export type DigestEntry = {
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

export type SerializedDigestEntry = {
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

export const DEDUP_WINDOWS: Record<TicketEventType, number> = {
  ticket_created: 10 * 60 * 1000,
  ticket_assigned: 5 * 60 * 1000,
  ticket_status_changed: 5 * 60 * 1000,
  ticket_commented: 3 * 60 * 1000,
  ticket_sla_breach: 15 * 60 * 1000,
  ticket_approval_required: 15 * 60 * 1000
};

export const RETRY_BACKOFF_MS = [1000, 4000, 12000];
