export type IntakeTicketStatus =
  | 'new'
  | 'triaged'
  | 'planned'
  | 'in-progress'
  | 'resolved'
  | 'closed'
  | 'converted';

export type IntakeTicketPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface StoredTicketComment {
  id: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: number;
}

export interface StoredIntakeTicket {
  id: string;
  orgId: string;
  ticketCode?: string;
  ticketNumber?: number;
  projectId?: string;
  title: string;
  description: string;
  requesterName: string;
  requesterEmail?: string;
  requesterUserId?: string;
  status: IntakeTicketStatus;
  priority: IntakeTicketPriority;
  assigneeId?: string;
  tags: string[];
  source: 'workspace' | 'email' | 'form' | 'api';
  convertedTaskId?: string;
  convertedProjectId?: string;
  convertedAt?: number;
  convertedBy?: string;
  startedAt?: number;
  slaDueAt?: number;
  firstResponseAt?: number;
  resolvedAt?: number;
  comments: StoredTicketComment[];
  metadata?: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}
