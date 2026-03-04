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

export type NotificationEventPatch = {
  immediate?: boolean;
  digest?: boolean;
  channels?: Partial<{
    email: boolean;
    teams: boolean;
  }>;
};

export type TicketNotificationPolicyPatch = Omit<
  Partial<Omit<TicketNotificationPolicy, 'orgId' | 'updatedAt' | 'events' | 'channels' | 'digest' | 'health'>>,
  never
> & {
  channels?: Partial<TicketNotificationPolicy['channels']>;
  digest?: Partial<TicketNotificationPolicy['digest']>;
  health?: Partial<TicketNotificationPolicy['health']>;
  events?: Partial<Record<NotificationEventType, NotificationEventPatch>>;
};

