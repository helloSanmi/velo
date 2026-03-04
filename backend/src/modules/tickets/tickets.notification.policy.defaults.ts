import { NotificationEventType, TicketNotificationPolicy } from './tickets.notification.policy.types.js';

export const defaultEvents = (): TicketNotificationPolicy['events'] => ({
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

export const defaultPolicy = (orgId: string): TicketNotificationPolicy => ({
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

export const eventTypes = (): NotificationEventType[] => Object.keys(defaultEvents()) as NotificationEventType[];

