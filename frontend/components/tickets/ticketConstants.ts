import { IntakeTicket, IntakeTicketPriority, IntakeTicketStatus } from '../../types';

export const STATUS_OPTIONS: Array<{ value: IntakeTicketStatus; label: string }> = [
  { value: 'new', label: 'New' },
  { value: 'triaged', label: 'Triaged' },
  { value: 'planned', label: 'Planned' },
  { value: 'in-progress', label: 'In progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
  { value: 'converted', label: 'Converted' }
];

export const PRIORITY_OPTIONS: Array<{ value: IntakeTicketPriority; label: string }> = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' }
];

export const openStatuses = new Set<IntakeTicketStatus>(['new', 'triaged', 'planned', 'in-progress']);

export const ticketReference = (ticket: IntakeTicket): string => ticket.ticketCode || ticket.id;

export const toDateTimeLocalInput = (value?: number) => {
  if (!value) return '';
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

export const parseDateTimeLocalInput = (value: string): number | undefined => {
  if (!value.trim()) return undefined;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : undefined;
};

export type ComposerMode = 'reply' | 'note' | 'forward';
export type TicketTableSortKey = 'title' | 'requester' | 'priority' | 'status' | 'assignee' | 'createdAt';

export const NOTE_PREFIX = '[INTERNAL_NOTE]';
export const FORWARD_PREFIX = '[FORWARDED]';

export const parseCommentPresentation = (text: string): { mode: ComposerMode; body: string } => {
  if (text.startsWith(`${NOTE_PREFIX} `)) return { mode: 'note', body: text.replace(`${NOTE_PREFIX} `, '') };
  if (text.startsWith(`${FORWARD_PREFIX} `)) return { mode: 'forward', body: text.replace(`${FORWARD_PREFIX} `, '') };
  return { mode: 'reply', body: text };
};

export const TICKET_TABLE_COLUMNS: TicketTableSortKey[] = ['title', 'requester', 'priority', 'status', 'assignee', 'createdAt'];
export const PRIORITY_RANK: Record<IntakeTicketPriority, number> = { low: 0, medium: 1, high: 2, urgent: 3 };
export const TICKETS_TABLE_PREFS_PREFIX = 'velo_tickets_table_prefs';

export const defaultColumnWidths: Record<TicketTableSortKey, number> = {
  title: 36,
  requester: 16,
  priority: 10,
  status: 12,
  assignee: 16,
  createdAt: 10
};
