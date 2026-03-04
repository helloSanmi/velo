import { eventTypes } from './tickets.notification.policy.defaults.js';
import {
  TicketNotificationPolicy,
  TicketNotificationPolicyPatch
} from './tickets.notification.policy.types.js';

export const applyPolicyPatch = (input: {
  current: TicketNotificationPolicy;
  patch: TicketNotificationPolicyPatch;
  now: number;
}): TicketNotificationPolicy => {
  const next: TicketNotificationPolicy = {
    ...input.current,
    ...input.patch,
    channels: {
      email: input.patch.channels?.email ?? input.current.channels.email,
      teams: input.patch.channels?.teams ?? input.current.channels.teams
    },
    digest: {
      enabled: input.patch.digest?.enabled ?? input.current.digest.enabled,
      cadence:
        input.patch.digest?.cadence === 'daily' || input.patch.digest?.cadence === 'hourly'
          ? input.patch.digest.cadence
          : input.current.digest.cadence,
      dailyHourLocal:
        typeof input.patch.digest?.dailyHourLocal === 'number'
          ? Math.max(0, Math.min(23, Math.trunc(input.patch.digest.dailyHourLocal)))
          : input.current.digest.dailyHourLocal
    },
    health: {
      deadLetterWarningThreshold:
        typeof input.patch.health?.deadLetterWarningThreshold === 'number'
          ? Math.max(0, Math.trunc(input.patch.health.deadLetterWarningThreshold))
          : input.current.health.deadLetterWarningThreshold,
      deadLetterErrorThreshold:
        typeof input.patch.health?.deadLetterErrorThreshold === 'number'
          ? Math.max(1, Math.trunc(input.patch.health.deadLetterErrorThreshold))
          : input.current.health.deadLetterErrorThreshold,
      webhookQuietWarningMinutes:
        typeof input.patch.health?.webhookQuietWarningMinutes === 'number'
          ? Math.max(5, Math.min(10080, Math.trunc(input.patch.health.webhookQuietWarningMinutes)))
          : input.current.health.webhookQuietWarningMinutes
    },
    events: eventTypes().reduce((acc, eventType) => {
      acc[eventType] = {
        ...input.current.events[eventType],
        ...(input.patch.events?.[eventType] || {}),
        channels: {
          ...input.current.events[eventType].channels,
          ...(input.patch.events?.[eventType]?.channels || {})
        }
      };
      return acc;
    }, {} as TicketNotificationPolicy['events']),
    updatedAt: input.now
  };

  if (next.health.deadLetterWarningThreshold > next.health.deadLetterErrorThreshold) {
    next.health.deadLetterWarningThreshold = next.health.deadLetterErrorThreshold;
  }

  return next;
};

export const toPersistedEventsPayload = (policy: TicketNotificationPolicy): Record<string, unknown> => ({
  ...(policy.events as Record<string, unknown>),
  __digest: policy.digest,
  __health: policy.health
});
