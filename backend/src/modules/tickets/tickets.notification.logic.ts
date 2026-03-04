import type { TicketNotificationPolicy } from './tickets.notification.policy.store.js';
import type {
  DigestEntry,
  DispatchInput,
  NotificationRecipient,
  SerializedDigestEntry,
  TicketEventType
} from './tickets.notification.types.js';
import type { StoredIntakeTicket } from './tickets.store.js';

export const shouldNotifyEvent = (eventType: TicketEventType, ticket: StoredIntakeTicket): boolean => {
  if (eventType === 'ticket_created') return true;
  if (eventType === 'ticket_assigned') return true;
  if (eventType === 'ticket_status_changed') return true;
  if (eventType === 'ticket_commented') return true;
  if (eventType === 'ticket_sla_breach') return true;
  if (eventType === 'ticket_approval_required') return true;
  return ticket.priority === 'high' || ticket.priority === 'urgent';
};

export const isWithinQuietHours = (input: {
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

export const serializeDigestEntry = (entry: DigestEntry): SerializedDigestEntry => ({
  ...entry,
  ticketIds: Array.from(entry.ticketIds),
  ticketTitles: Array.from(entry.ticketTitles)
});

export const computeDigestDueAt = (input: {
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

export const addDigestEntry = (input: {
  payload: DispatchInput;
  recipient: NotificationRecipient;
  policy: TicketNotificationPolicy;
  digestEntries: Map<string, DigestEntry>;
}) => {
  const key = `${input.payload.orgId}:${input.recipient.userId}:${input.payload.eventType}`;
  const now = Date.now();
  const existing = input.digestEntries.get(key);
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
  input.digestEntries.set(key, entry);
};
