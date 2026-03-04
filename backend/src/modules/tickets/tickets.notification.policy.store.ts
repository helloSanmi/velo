import { Prisma } from '@prisma/client';
import { createId } from '../../lib/ids.js';
import { prisma } from '../../lib/prisma.js';
import { defaultPolicy } from './tickets.notification.policy.defaults.js';
import {
  applyPolicyPatch,
  toPersistedEventsPayload,
  toPolicy
} from './tickets.notification.policy.mapper.js';
import { TicketNotificationPolicyPatch } from './tickets.notification.policy.types.js';

export type {
  NotificationEventType,
  TicketNotificationChannel,
  TicketNotificationEventType,
  TicketNotificationPolicy
} from './tickets.notification.policy.types.js';

export const ticketsNotificationPolicyStore = {
  async get(orgId: string) {
    const row = await prisma.ticketNotificationPolicy.findUnique({ where: { orgId } });
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

  async upsert(input: { orgId: string; patch: TicketNotificationPolicyPatch }) {
    const current = await this.get(input.orgId);
    const next = applyPolicyPatch({
      current,
      patch: input.patch,
      now: Date.now()
    });

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
        events: toPersistedEventsPayload(next) as Prisma.InputJsonValue
      },
      update: {
        enabled: next.enabled,
        quietHoursEnabled: next.quietHoursEnabled,
        quietHoursStartHour: next.quietHoursStartHour,
        quietHoursEndHour: next.quietHoursEndHour,
        timezoneOffsetMinutes: next.timezoneOffsetMinutes,
        channels: next.channels,
        events: toPersistedEventsPayload(next) as Prisma.InputJsonValue
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
