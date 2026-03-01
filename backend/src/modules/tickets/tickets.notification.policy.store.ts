import { createId } from '../../lib/ids.js';
import { prisma } from '../../lib/prisma.js';

export type NotificationEventType =
  | 'ticket_created'
  | 'ticket_assigned'
  | 'ticket_status_changed'
  | 'ticket_commented'
  | 'ticket_sla_breach'
  | 'ticket_approval_required'
  | 'project_completion_actions'
  | 'task_assignment'
  | 'task_due_overdue'
  | 'task_status_changes'
  | 'security_admin_alerts'
  | 'user_lifecycle';

export type TicketNotificationEventType = NotificationEventType;

export type TicketNotificationChannel = 'email' | 'teams';

export interface TicketNotificationPolicy {
  orgId: string;
  enabled: boolean;
  quietHoursEnabled: boolean;
  quietHoursStartHour: number;
  quietHoursEndHour: number;
  timezoneOffsetMinutes: number;
  channels: {
    email: boolean;
    teams: boolean;
  };
  digest: {
    enabled: boolean;
    cadence: 'hourly' | 'daily';
    dailyHourLocal: number;
  };
  health: {
    deadLetterWarningThreshold: number;
    deadLetterErrorThreshold: number;
    webhookQuietWarningMinutes: number;
  };
  events: Record<
    NotificationEventType,
    {
      immediate: boolean;
      digest: boolean;
      channels: {
        email: boolean;
        teams: boolean;
      };
    }
  >;
  updatedAt: number;
}

type NotificationEventPatch = {
  immediate?: boolean;
  digest?: boolean;
  channels?: Partial<{
    email: boolean;
    teams: boolean;
  }>;
};

type TicketNotificationPolicyPatch = Omit<
  Partial<Omit<TicketNotificationPolicy, 'orgId' | 'updatedAt' | 'events' | 'channels' | 'digest' | 'health'>>,
  never
> & {
  channels?: Partial<TicketNotificationPolicy['channels']>;
  digest?: Partial<TicketNotificationPolicy['digest']>;
  health?: Partial<TicketNotificationPolicy['health']>;
  events?: Partial<Record<NotificationEventType, NotificationEventPatch>>;
};

const defaultEvents = (): TicketNotificationPolicy['events'] => ({
  ticket_created: { immediate: true, digest: true, channels: { email: true, teams: true } },
  ticket_assigned: { immediate: true, digest: true, channels: { email: true, teams: false } },
  ticket_status_changed: { immediate: true, digest: true, channels: { email: true, teams: false } },
  ticket_commented: { immediate: true, digest: true, channels: { email: true, teams: false } },
  ticket_sla_breach: { immediate: true, digest: true, channels: { email: true, teams: true } },
  ticket_approval_required: { immediate: true, digest: true, channels: { email: true, teams: true } },
  project_completion_actions: { immediate: true, digest: false, channels: { email: true, teams: false } },
  task_assignment: { immediate: true, digest: false, channels: { email: true, teams: false } },
  task_due_overdue: { immediate: true, digest: false, channels: { email: true, teams: false } },
  task_status_changes: { immediate: true, digest: false, channels: { email: true, teams: false } },
  security_admin_alerts: { immediate: true, digest: false, channels: { email: true, teams: false } },
  user_lifecycle: { immediate: true, digest: false, channels: { email: true, teams: false } }
});

const defaultPolicy = (orgId: string): TicketNotificationPolicy => ({
  orgId,
  enabled: true,
  quietHoursEnabled: false,
  quietHoursStartHour: 22,
  quietHoursEndHour: 7,
  timezoneOffsetMinutes: 0,
  channels: {
    email: true,
    teams: true
  },
  digest: {
    enabled: true,
    cadence: 'hourly',
    dailyHourLocal: 9
  },
  health: {
    deadLetterWarningThreshold: 1,
    deadLetterErrorThreshold: 5,
    webhookQuietWarningMinutes: 120
  },
  events: defaultEvents(),
  updatedAt: Date.now()
});

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
  (Object.keys(defaults) as NotificationEventType[]).forEach((eventType) => {
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
  const row = value as { deadLetterWarningThreshold?: unknown; deadLetterErrorThreshold?: unknown; webhookQuietWarningMinutes?: unknown };
  const warning = typeof row.deadLetterWarningThreshold === 'number' ? Math.max(0, Math.trunc(row.deadLetterWarningThreshold)) : fallback.deadLetterWarningThreshold;
  const error = typeof row.deadLetterErrorThreshold === 'number' ? Math.max(1, Math.trunc(row.deadLetterErrorThreshold)) : fallback.deadLetterErrorThreshold;
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

const toPolicy = (input: {
  orgId: string;
  enabled: boolean;
  quietHoursEnabled: boolean;
  quietHoursStartHour: number;
  quietHoursEndHour: number;
  timezoneOffsetMinutes: number;
  channels: unknown;
  events: unknown;
  updatedAt: Date;
}): TicketNotificationPolicy => ({
  ...defaultPolicy(input.orgId),
  orgId: input.orgId,
  enabled: input.enabled,
  quietHoursEnabled: input.quietHoursEnabled,
  quietHoursStartHour: input.quietHoursStartHour,
  quietHoursEndHour: input.quietHoursEndHour,
  timezoneOffsetMinutes: input.timezoneOffsetMinutes,
  channels: normalizeChannels(input.channels),
  digest:
    input.events && typeof input.events === 'object'
      ? normalizeDigest((input.events as Record<string, unknown>).__digest)
      : defaultPolicy(input.orgId).digest,
  health:
    input.events && typeof input.events === 'object'
      ? normalizeHealth((input.events as Record<string, unknown>).__health)
      : defaultPolicy(input.orgId).health,
  events: normalizeEvents(input.events),
  updatedAt: input.updatedAt.getTime()
});

export const ticketsNotificationPolicyStore = {
  async get(orgId: string): Promise<TicketNotificationPolicy> {
    const row = await prisma.ticketNotificationPolicy.findUnique({
      where: { orgId }
    });
    if (!row) return defaultPolicy(orgId);
    return toPolicy({
      orgId: row.orgId,
      enabled: row.enabled,
      quietHoursEnabled: row.quietHoursEnabled,
      quietHoursStartHour: row.quietHoursStartHour,
      quietHoursEndHour: row.quietHoursEndHour,
      timezoneOffsetMinutes: row.timezoneOffsetMinutes,
      channels: row.channels,
      events: row.events,
      updatedAt: row.updatedAt
    });
  },

  async upsert(input: { orgId: string; patch: TicketNotificationPolicyPatch }): Promise<TicketNotificationPolicy> {
    const current = await this.get(input.orgId);
    const now = Date.now();
    const next: TicketNotificationPolicy = {
      ...current,
      ...input.patch,
      channels: {
        email: input.patch.channels?.email ?? current.channels.email,
        teams: input.patch.channels?.teams ?? current.channels.teams
      },
      digest: {
        enabled: input.patch.digest?.enabled ?? current.digest.enabled,
        cadence:
          input.patch.digest?.cadence === 'daily' || input.patch.digest?.cadence === 'hourly'
            ? input.patch.digest.cadence
            : current.digest.cadence,
        dailyHourLocal:
          typeof input.patch.digest?.dailyHourLocal === 'number'
            ? Math.max(0, Math.min(23, Math.trunc(input.patch.digest.dailyHourLocal)))
            : current.digest.dailyHourLocal
      },
      health: {
        deadLetterWarningThreshold:
          typeof input.patch.health?.deadLetterWarningThreshold === 'number'
            ? Math.max(0, Math.trunc(input.patch.health.deadLetterWarningThreshold))
            : current.health.deadLetterWarningThreshold,
        deadLetterErrorThreshold:
          typeof input.patch.health?.deadLetterErrorThreshold === 'number'
            ? Math.max(1, Math.trunc(input.patch.health.deadLetterErrorThreshold))
            : current.health.deadLetterErrorThreshold,
        webhookQuietWarningMinutes:
          typeof input.patch.health?.webhookQuietWarningMinutes === 'number'
            ? Math.max(5, Math.min(10080, Math.trunc(input.patch.health.webhookQuietWarningMinutes)))
            : current.health.webhookQuietWarningMinutes
      },
      events: (Object.keys(current.events) as NotificationEventType[]).reduce((acc, eventType) => {
        acc[eventType] = {
          ...current.events[eventType],
          ...(input.patch.events?.[eventType] || {}),
          channels: {
            ...current.events[eventType].channels,
            ...(input.patch.events?.[eventType]?.channels || {})
          }
        };
        return acc;
      }, {} as TicketNotificationPolicy['events']),
      updatedAt: now
    };
    if (next.health.deadLetterWarningThreshold > next.health.deadLetterErrorThreshold) {
      next.health.deadLetterWarningThreshold = next.health.deadLetterErrorThreshold;
    }

    const updated = await prisma.ticketNotificationPolicy.upsert({
      where: { orgId: input.orgId },
      create: {
        id: createId('tnp'),
        orgId: input.orgId,
        enabled: next.enabled,
        quietHoursEnabled: next.quietHoursEnabled,
        quietHoursStartHour: next.quietHoursStartHour,
        quietHoursEndHour: next.quietHoursEndHour,
        timezoneOffsetMinutes: next.timezoneOffsetMinutes,
        channels: next.channels,
        events: { ...(next.events as Record<string, unknown>), __digest: next.digest, __health: next.health }
      },
      update: {
        enabled: next.enabled,
        quietHoursEnabled: next.quietHoursEnabled,
        quietHoursStartHour: next.quietHoursStartHour,
        quietHoursEndHour: next.quietHoursEndHour,
        timezoneOffsetMinutes: next.timezoneOffsetMinutes,
        channels: next.channels,
        events: { ...(next.events as Record<string, unknown>), __digest: next.digest, __health: next.health }
      }
    });

    return toPolicy({
      orgId: updated.orgId,
      enabled: updated.enabled,
      quietHoursEnabled: updated.quietHoursEnabled,
      quietHoursStartHour: updated.quietHoursStartHour,
      quietHoursEndHour: updated.quietHoursEndHour,
      timezoneOffsetMinutes: updated.timezoneOffsetMinutes,
      channels: updated.channels,
      events: updated.events,
      updatedAt: updated.updatedAt
    });
  }
};
