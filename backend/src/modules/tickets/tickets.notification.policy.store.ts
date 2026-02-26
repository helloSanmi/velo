import { createId } from '../../lib/ids.js';
import { prisma } from '../../lib/prisma.js';

export type TicketNotificationEventType =
  | 'ticket_created'
  | 'ticket_assigned'
  | 'ticket_status_changed'
  | 'ticket_commented'
  | 'ticket_sla_breach'
  | 'ticket_approval_required';

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
  events: Record<
    TicketNotificationEventType,
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

type TicketNotificationEventPatch = {
  immediate?: boolean;
  digest?: boolean;
  channels?: Partial<{
    email: boolean;
    teams: boolean;
  }>;
};

type TicketNotificationPolicyPatch = Omit<
  Partial<Omit<TicketNotificationPolicy, 'orgId' | 'updatedAt' | 'events' | 'channels' | 'digest'>>,
  never
> & {
  channels?: Partial<TicketNotificationPolicy['channels']>;
  digest?: Partial<TicketNotificationPolicy['digest']>;
  events?: Partial<Record<TicketNotificationEventType, TicketNotificationEventPatch>>;
};

const defaultEvents = (): TicketNotificationPolicy['events'] => ({
  ticket_created: { immediate: true, digest: true, channels: { email: true, teams: true } },
  ticket_assigned: { immediate: true, digest: true, channels: { email: true, teams: false } },
  ticket_status_changed: { immediate: true, digest: true, channels: { email: true, teams: false } },
  ticket_commented: { immediate: true, digest: true, channels: { email: true, teams: false } },
  ticket_sla_breach: { immediate: true, digest: true, channels: { email: true, teams: true } },
  ticket_approval_required: { immediate: true, digest: true, channels: { email: true, teams: true } }
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
  const row = value as Partial<Record<TicketNotificationEventType, Partial<(typeof defaults)[TicketNotificationEventType]>>>;
  const merged = { ...defaults };
  (Object.keys(defaults) as TicketNotificationEventType[]).forEach((eventType) => {
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
      events: {
        ticket_created: {
          ...current.events.ticket_created,
          ...(input.patch.events?.ticket_created || {}),
          channels: {
            ...current.events.ticket_created.channels,
            ...(input.patch.events?.ticket_created?.channels || {})
          }
        },
        ticket_assigned: {
          ...current.events.ticket_assigned,
          ...(input.patch.events?.ticket_assigned || {}),
          channels: {
            ...current.events.ticket_assigned.channels,
            ...(input.patch.events?.ticket_assigned?.channels || {})
          }
        },
        ticket_status_changed: {
          ...current.events.ticket_status_changed,
          ...(input.patch.events?.ticket_status_changed || {}),
          channels: {
            ...current.events.ticket_status_changed.channels,
            ...(input.patch.events?.ticket_status_changed?.channels || {})
          }
        },
        ticket_commented: {
          ...current.events.ticket_commented,
          ...(input.patch.events?.ticket_commented || {}),
          channels: {
            ...current.events.ticket_commented.channels,
            ...(input.patch.events?.ticket_commented?.channels || {})
          }
        },
        ticket_sla_breach: {
          ...current.events.ticket_sla_breach,
          ...(input.patch.events?.ticket_sla_breach || {}),
          channels: {
            ...current.events.ticket_sla_breach.channels,
            ...(input.patch.events?.ticket_sla_breach?.channels || {})
          }
        },
        ticket_approval_required: {
          ...current.events.ticket_approval_required,
          ...(input.patch.events?.ticket_approval_required || {}),
          channels: {
            ...current.events.ticket_approval_required.channels,
            ...(input.patch.events?.ticket_approval_required?.channels || {})
          }
        }
      },
      updatedAt: now
    };

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
        events: { ...(next.events as Record<string, unknown>), __digest: next.digest }
      },
      update: {
        enabled: next.enabled,
        quietHoursEnabled: next.quietHoursEnabled,
        quietHoursStartHour: next.quietHoursStartHour,
        quietHoursEndHour: next.quietHoursEndHour,
        timezoneOffsetMinutes: next.timezoneOffsetMinutes,
        channels: next.channels,
        events: { ...(next.events as Record<string, unknown>), __digest: next.digest }
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
