import { defaultEvents, defaultPolicy, eventTypes } from './tickets.notification.policy.defaults.js';
import {
  NotificationEventType,
  TicketNotificationPolicy
} from './tickets.notification.policy.types.js';

const normalizeChannels = (value: unknown): TicketNotificationPolicy['channels'] => {
  if (!value || typeof value !== 'object') return { email: true, teams: true };
  const row = value as { email?: unknown; teams?: unknown };
  return {
    email: row.email === false ? false : true,
    teams: row.teams === false ? false : true
  };
};

const normalizeEvents = (value: unknown): TicketNotificationPolicy['events'] => {
  const defaults = defaultEvents();
  if (!value || typeof value !== 'object') return defaults;

  const row = value as Partial<Record<NotificationEventType, Partial<(typeof defaults)[NotificationEventType]>>>;
  const merged = { ...defaults };
  eventTypes().forEach((eventType) => {
    const event = row[eventType];
    if (!event) return;
    merged[eventType] = {
      immediate: typeof event.immediate === 'boolean' ? event.immediate : defaults[eventType].immediate,
      digest: typeof event.digest === 'boolean' ? event.digest : defaults[eventType].digest,
      channels: {
        email:
          typeof event.channels?.email === 'boolean'
            ? event.channels.email
            : defaults[eventType].channels.email,
        teams:
          typeof event.channels?.teams === 'boolean'
            ? event.channels.teams
            : defaults[eventType].channels.teams
      }
    };
  });
  return merged;
};

const normalizeDigest = (value: unknown): TicketNotificationPolicy['digest'] => {
  const fallback = { enabled: true, cadence: 'hourly' as const, dailyHourLocal: 9 };
  if (!value || typeof value !== 'object') return fallback;
  const row = value as { enabled?: unknown; cadence?: unknown; dailyHourLocal?: unknown };
  return {
    enabled: typeof row.enabled === 'boolean' ? row.enabled : fallback.enabled,
    cadence: row.cadence === 'daily' ? 'daily' : 'hourly',
    dailyHourLocal:
      typeof row.dailyHourLocal === 'number'
        ? Math.max(0, Math.min(23, Math.trunc(row.dailyHourLocal)))
        : fallback.dailyHourLocal
  };
};

const normalizeHealth = (value: unknown): TicketNotificationPolicy['health'] => {
  const fallback = { deadLetterWarningThreshold: 1, deadLetterErrorThreshold: 5, webhookQuietWarningMinutes: 120 };
  if (!value || typeof value !== 'object') return fallback;
  const row = value as {
    deadLetterWarningThreshold?: unknown;
    deadLetterErrorThreshold?: unknown;
    webhookQuietWarningMinutes?: unknown;
  };
  const warning =
    typeof row.deadLetterWarningThreshold === 'number'
      ? Math.max(0, Math.trunc(row.deadLetterWarningThreshold))
      : fallback.deadLetterWarningThreshold;
  const error =
    typeof row.deadLetterErrorThreshold === 'number'
      ? Math.max(1, Math.trunc(row.deadLetterErrorThreshold))
      : fallback.deadLetterErrorThreshold;
  const webhookQuietWarningMinutes =
    typeof row.webhookQuietWarningMinutes === 'number'
      ? Math.max(5, Math.min(10080, Math.trunc(row.webhookQuietWarningMinutes)))
      : fallback.webhookQuietWarningMinutes;

  return {
    deadLetterWarningThreshold: Math.min(warning, error),
    deadLetterErrorThreshold: Math.max(error, warning || 1),
    webhookQuietWarningMinutes
  };
};

export const toPolicy = (input: {
  orgId: string;
  enabled: boolean;
  quietHoursEnabled: boolean;
  quietHoursStartHour: number;
  quietHoursEndHour: number;
  timezoneOffsetMinutes: number;
  channels: unknown;
  events: unknown;
  updatedAt: Date;
}): TicketNotificationPolicy => {
  const fallback = defaultPolicy(input.orgId);
  const eventsRow =
    input.events && typeof input.events === 'object' ? (input.events as Record<string, unknown>) : undefined;

  return {
    ...fallback,
    orgId: input.orgId,
    enabled: input.enabled,
    quietHoursEnabled: input.quietHoursEnabled,
    quietHoursStartHour: input.quietHoursStartHour,
    quietHoursEndHour: input.quietHoursEndHour,
    timezoneOffsetMinutes: input.timezoneOffsetMinutes,
    channels: normalizeChannels(input.channels),
    digest: normalizeDigest(eventsRow?.__digest),
    health: normalizeHealth(eventsRow?.__health),
    events: normalizeEvents(input.events),
    updatedAt: input.updatedAt.getTime()
  };
};
