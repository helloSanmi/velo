import { z } from 'zod';

export const orgParamsSchema = z.object({ orgId: z.string().min(1) });
export const ticketParamsSchema = z.object({ orgId: z.string().min(1), ticketId: z.string().min(1) });
export const policyQuerySchema = z.object({ projectId: z.string().min(1).optional() });

export const createTicketSchema = z.object({
  projectId: z.string().optional(),
  title: z.string().min(1),
  description: z.string().default(''),
  requesterName: z.string().min(1),
  requesterEmail: z.string().email().optional(),
  status: z.enum(['new', 'triaged', 'planned', 'in-progress', 'resolved', 'closed', 'converted']).default('new'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  tags: z.array(z.string()).default([]),
  source: z.enum(['workspace', 'email', 'form', 'api']).default('workspace'),
  assigneeId: z.string().nullable().optional(),
  startedAt: z.number().int().positive().optional(),
  metadata: z.record(z.unknown()).optional()
});

export const updateTicketSchema = z.object({
  projectId: z.string().optional(),
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  requesterName: z.string().min(1).optional(),
  requesterEmail: z.string().email().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  status: z.enum(['new', 'triaged', 'planned', 'in-progress', 'resolved', 'closed', 'converted']).optional(),
  tags: z.array(z.string()).optional(),
  assigneeId: z.string().nullable().optional(),
  startedAt: z.number().int().positive().nullable().optional(),
  metadata: z.record(z.unknown()).optional()
});

export const convertTicketSchema = z.object({
  projectId: z.string().optional(),
  status: z.string().default('todo')
});

export const commentSchema = z.object({
  text: z.string().min(1)
});

export const policyUpsertSchema = z.object({
  projectId: z.string().optional(),
  assignmentMode: z.enum(['manual', 'round_robin', 'least_load']),
  assigneePoolIds: z.array(z.string()).default([]),
  slaHours: z.object({
    low: z.number().int().positive(),
    medium: z.number().int().positive(),
    high: z.number().int().positive(),
    urgent: z.number().int().positive()
  }),
  roundRobinCursor: z.number().int().min(0).optional()
});

export const notificationPolicySchema = z.object({
  enabled: z.boolean().optional(),
  quietHoursEnabled: z.boolean().optional(),
  quietHoursStartHour: z.number().int().min(0).max(23).optional(),
  quietHoursEndHour: z.number().int().min(0).max(23).optional(),
  timezoneOffsetMinutes: z.number().int().min(-720).max(840).optional(),
  channels: z
    .object({
      email: z.boolean().optional(),
      teams: z.boolean().optional()
    })
    .optional(),
  digest: z
    .object({
      enabled: z.boolean().optional(),
      cadence: z.enum(['hourly', 'daily']).optional(),
      dailyHourLocal: z.number().int().min(0).max(23).optional()
    })
    .optional(),
  health: z
    .object({
      deadLetterWarningThreshold: z.number().int().min(0).max(1000).optional(),
      deadLetterErrorThreshold: z.number().int().min(1).max(1000).optional(),
      webhookQuietWarningMinutes: z.number().int().min(5).max(10080).optional()
    })
    .optional(),
  events: z
    .record(
      z.enum([
        'ticket_created',
        'ticket_assigned',
        'ticket_status_changed',
        'ticket_commented',
        'ticket_sla_breach',
        'ticket_approval_required',
        'project_completion_actions',
        'task_assignment',
        'task_due_overdue',
        'task_status_changes',
        'security_admin_alerts',
        'user_lifecycle'
      ]),
      z.object({
        immediate: z.boolean().optional(),
        digest: z.boolean().optional(),
        channels: z
          .object({
            email: z.boolean().optional(),
            teams: z.boolean().optional()
          })
          .optional()
      })
    )
    .optional()
});

export const senderPreflightSchema = z.object({
  testRecipientEmail: z.string().email().optional()
});

export const toPsSingleQuoted = (value: string): string => `'${String(value || '').replace(/'/g, "''")}'`;

