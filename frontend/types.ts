export enum TaskStatus {
  TODO = 'todo',
  IN_PROGRESS = 'in-progress',
  DONE = 'done'
}
export type TaskStageId = TaskStatus | string;

export interface ProjectStage {
  id: string;
  name: string;
}

export enum TaskPriority {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High'
}

export interface Organization {
  id: string;
  name: string;
  loginSubdomain?: string;
  totalSeats: number;
  ownerId: string;
  createdAt: number;
  plan?: 'free' | 'basic' | 'pro';
  seatPrice?: number;
  billingCurrency?: string;
  aiDailyRequestLimit?: number;
  aiDailyTokenLimit?: number;
  allowMicrosoftAuth?: boolean;
  microsoftWorkspaceConnected?: boolean;
}

export interface OrgInvite {
  id: string;
  orgId: string;
  token: string;
  role: 'member' | 'admin';
  createdBy: string;
  createdAt: number;
  expiresAt: number;
  maxUses?: number;
  usedCount: number;
  revoked?: boolean;
  invitedIdentifier?: string;
  deliveryStatus?: 'pending' | 'sent' | 'failed' | 'not_configured' | string;
  deliveryProvider?: 'microsoft' | string;
  deliveryAttempts?: number;
  deliveryLastAttemptAt?: number;
  deliveryDeliveredAt?: number;
  deliveryError?: string;
}

export interface User {
  id: string;
  orgId: string;
  username: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  email?: string;
  role?: 'admin' | 'member' | 'guest';
  licenseActive?: boolean;
  mustChangePassword?: boolean;
}

export type SecurityGroupScope = 'global' | 'project';

export interface SecurityGroup {
  id: string;
  orgId: string;
  name: string;
  scope: SecurityGroupScope;
  projectId?: string;
  memberIds: string[];
  createdBy: string;
  createdAt: number;
  updatedAt: number;
}

export interface Team {
  id: string;
  orgId: string;
  name: string;
  description?: string;
  leadId?: string;
  memberIds: string[];
  createdBy: string;
  createdAt: number;
  updatedAt: number;
}

export interface Project {
  id: string;
  orgId: string;
  createdBy?: string;
  ownerIds?: string[];
  version?: number;
  updatedAt?: number;
  name: string;
  description: string;
  color: string;
  startDate?: number;
  endDate?: number;
  budgetCost?: number;
  hourlyRate?: number;
  scopeSummary?: string;
  scopeSize?: number;
  completionComment?: string;
  completionRequestedAt?: number;
  completionRequestedById?: string;
  completionRequestedByName?: string;
  completionRequestedComment?: string;
  reopenedAt?: number;
  reopenedById?: string;
  stages?: ProjectStage[];
  members: string[];
  isArchived?: boolean;
  archivedAt?: number;
  archivedById?: string;
  isCompleted?: boolean;
  completedAt?: number;
  completedById?: string;
  isDeleted?: boolean;
  deletedAt?: number;
  deletedById?: string;
  guestIds?: string[];
  isPublic?: boolean;
  publicToken?: string;
  integrations?: {
    slack?: { enabled: boolean; channel: string };
    github?: { enabled: boolean; repo: string };
  };
}

export interface Subtask {
  id: string;
  title: string;
  isCompleted: boolean;
  dueDate?: number;
}

export interface Comment {
  id: string;
  userId: string;
  displayName: string;
  text: string;
  timestamp: number;
}

export interface ProjectOwnerMessage {
  id: string;
  orgId: string;
  projectId: string;
  senderId: string;
  senderName: string;
  text: string;
  createdAt: number;
  readBy: string[];
}

export interface AuditEntry {
  id: string;
  userId: string;
  displayName: string;
  action: string; 
  timestamp: number;
}

export interface Task {
  id: string;
  orgId: string;
  version?: number;
  updatedAt?: number;
  userId: string;
  assigneeId?: string;
  assigneeIds?: string[];
  securityGroupIds?: string[];
  projectId: string;
  title: string;
  description: string;
  status: TaskStageId;
  priority: TaskPriority;
  createdAt: number;
  completedAt?: number;
  order: number;
  subtasks: Subtask[];
  tags: string[];
  dueDate?: number;
  comments: Comment[];
  auditLog: AuditEntry[];
  isAtRisk?: boolean;
  timeLogged: number;
  isTimerRunning?: boolean;
  timerStartedAt?: number;
  movedBackAt?: number;
  movedBackBy?: string;
  movedBackReason?: string;
  movedBackFromStatus?: string;
  approvedAt?: number;
  approvedBy?: string;
  estimateMinutes?: number;
  estimateProvidedBy?: string;
  estimateProvidedAt?: number;
  actualMinutes?: number;
  estimateRiskApprovedAt?: number;
  estimateRiskApprovedBy?: string;
  // New: Dependency Tracking
  blockedByIds?: string[];
  blocksIds?: string[];
}

export type EstimationConfidence = 'low' | 'medium' | 'high';
export type EstimationContextType = 'global' | 'project' | 'stage' | 'tag';

export interface EstimationProfile {
  id: string;
  orgId: string;
  userId: string;
  contextType: EstimationContextType;
  contextKey: string;
  biasFactor: number;
  confidence: EstimationConfidence;
  sampleSize: number;
  varianceScore: number;
  trendDelta: number;
  windowStart: number;
  windowEnd: number;
  updatedAt: number;
}

export interface EstimationAdjustmentPreview {
  estimatedMinutes: number;
  adjustedMinutes: number;
  biasFactorUsed: number;
  confidence: EstimationConfidence;
  sampleSize: number;
  explanation: string;
  requiresApproval: boolean;
}

// Workflow Automation Types
export type WorkflowTrigger = 'TASK_CREATED' | 'STATUS_CHANGED' | 'PRIORITY_CHANGED';
export type WorkflowAction = 'SET_PRIORITY' | 'ASSIGN_USER' | 'ADD_TAG' | 'NOTIFY_OWNER';

export interface WorkflowRule {
  id: string;
  orgId: string;
  projectId?: string;
  name: string;
  isActive: boolean;
  trigger: WorkflowTrigger;
  triggerValue?: string;
  action: WorkflowAction;
  actionValue?: string;
}

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  tasks: Array<{
    title: string;
    description: string;
    priority: TaskPriority;
    status: TaskStatus;
    tags: string[];
  }>;
}

export type IntakeTicketStatus = 'new' | 'triaged' | 'planned' | 'in-progress' | 'resolved' | 'closed' | 'converted';
export type IntakeTicketPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface IntakeTicket {
  id: string;
  orgId: string;
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
  comments?: Array<{
    id: string;
    userId: string;
    userName: string;
    text: string;
    createdAt: number;
  }>;
  metadata?: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

export type TicketAssignmentMode = 'manual' | 'round_robin' | 'least_load';

export interface TicketPolicy {
  orgId: string;
  projectId?: string;
  assignmentMode: TicketAssignmentMode;
  assigneePoolIds: string[];
  slaHours: {
    low: number;
    medium: number;
    high: number;
    urgent: number;
  };
  roundRobinCursor: number;
  updatedAt: number;
}

export type TicketNotificationEventType =
  | 'ticket_created'
  | 'ticket_assigned'
  | 'ticket_status_changed'
  | 'ticket_commented'
  | 'ticket_sla_breach'
  | 'ticket_approval_required';

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

export type TicketNotificationDeliveryStatus = 'queued' | 'sent' | 'failed' | 'suppressed' | 'dead_letter';

export interface TicketNotificationDelivery {
  id: string;
  orgId: string;
  kind: 'immediate' | 'digest';
  eventType: string;
  status: TicketNotificationDeliveryStatus;
  ticketId?: string;
  recipientUserId?: string;
  recipientEmail?: string;
  attempts: number;
  maxAttempts: number;
  nextAttemptAt?: number;
  lastError?: string;
  createdAt: number;
  updatedAt: number;
  sentAt?: number;
  resolvedAt?: number;
}

export interface TicketNotificationDiagnostics {
  orgId: string;
  microsoft: {
    connected: boolean;
    ssoEnabled: boolean;
    tenantId?: string;
    hasRefreshToken: boolean;
    accessTokenExpiresAt?: string;
    tokenStatus: 'ok' | 'expiring' | 'expired' | 'missing' | 'error';
    tokenError?: string;
  };
  subscription: {
    id?: string;
    expiresAt?: string;
    minutesRemaining?: number;
    status: 'ok' | 'expiring' | 'expired' | 'missing' | 'unknown';
  };
  webhook: {
    clientStateConfigured: boolean;
    lastSyncAt?: string;
    lastWebhookAt?: string;
    inboundSeenLast24h: number;
    inboundSeenTotal: number;
  };
  delivery: {
    queued: number;
    digestPending: number;
    failedLast24h: number;
    deadLetterOpen: number;
    lastSentAt?: string;
    lastFailureAt?: string;
  };
}

export interface TicketNotificationActiveHealthCheck {
  ranAt: string;
  checks: Array<{
    key: 'connection' | 'token_refresh' | 'graph_me' | 'subscription_read' | 'webhook_client_state' | 'delivery_dead_letter';
    ok: boolean;
    detail: string;
    remediation?: string;
  }>;
  ok: boolean;
}

export type MainViewType =
  | 'board'
  | 'projects'
  | 'analytics'
  | 'roadmap'
  | 'workflows'
  | 'templates'
  | 'resources'
  | 'integrations'
  | 'tickets';
