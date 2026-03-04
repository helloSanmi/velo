import { TicketNotificationEventType } from '../../types';

export const toggleClass = (active: boolean) =>
  `w-10 h-5 rounded-full p-1 transition-colors ${active ? 'bg-slate-900' : 'bg-slate-300'}`;

export const thumbClass = (active: boolean) =>
  `block w-3 h-3 rounded-full bg-white transition-transform ${active ? 'translate-x-5' : ''}`;

export const EVENT_ROWS: Array<{ key: TicketNotificationEventType; label: string; help: string }> = [
  { key: 'ticket_created', label: 'New tickets', help: 'Notify when a new ticket is created.' },
  { key: 'ticket_assigned', label: 'Assignments', help: 'Notify when tickets are assigned/reassigned.' },
  { key: 'ticket_status_changed', label: 'Status changes', help: 'Notify on ticket status movement.' },
  { key: 'ticket_commented', label: 'Comments & replies', help: 'Notify on ticket comments and responses.' },
  { key: 'ticket_sla_breach', label: 'SLA alerts', help: 'Notify when ticket SLA is at risk or breached.' },
  { key: 'ticket_approval_required', label: 'Ticket approvals', help: 'Notify when ticket approval action is needed.' },
  {
    key: 'project_completion_actions',
    label: 'Project completion actions',
    help: 'Notify owner/admin on completion requests and completion approvals.'
  },
  { key: 'task_assignment', label: 'Task assignment', help: 'Notify assigned users when tasks are assigned.' },
  { key: 'task_due_overdue', label: 'Task due/overdue', help: 'Notify assigned users when tasks are due soon or overdue.' },
  { key: 'task_status_changes', label: 'Task status updates', help: 'Notify assigned users when task status changes.' },
  {
    key: 'security_admin_alerts',
    label: 'Security/admin alerts',
    help: 'Notify admins on sensitive workspace/user/team changes.'
  },
  {
    key: 'user_lifecycle',
    label: 'User lifecycle updates',
    help: 'Notify users when they are licensed, unlicensed, added/removed from team, or removed from workspace.'
  }
];
