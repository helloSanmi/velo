import { ProjectLifecycle } from '@prisma/client';

export type JsonOrg = {
  id: string;
  name: string;
  totalSeats: number;
  plan?: string;
  seatPrice?: number;
  billingCurrency?: string;
  ownerId: string;
  createdAt?: number;
};

export type JsonUser = {
  id: string;
  orgId: string;
  username: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  email?: string;
  role?: 'admin' | 'member' | 'guest';
};

export type JsonProject = {
  id: string;
  orgId: string;
  createdBy?: string;
  name: string;
  description: string;
  color: string;
  members: string[];
  isArchived?: boolean;
  isCompleted?: boolean;
  isDeleted?: boolean;
  isPublic?: boolean;
  publicToken?: string;
  stages?: unknown;
  startDate?: number;
  endDate?: number;
  budgetCost?: number;
  scopeSummary?: string;
  scopeSize?: number;
};

export type JsonTask = {
  id: string;
  orgId: string;
  userId: string;
  assigneeId?: string;
  assigneeIds?: string[];
  securityGroupIds?: string[];
  projectId: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  createdAt?: number;
  completedAt?: number;
  order?: number;
  subtasks?: unknown[];
  tags?: string[];
  dueDate?: number;
  comments?: unknown[];
  auditLog?: unknown[];
  timeLogged?: number;
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
  blockedByIds?: string[];
  blocksIds?: string[];
};

export type JsonGroup = {
  id: string;
  orgId: string;
  name: string;
  scope: string;
  projectId?: string;
  memberIds: string[];
  createdBy: string;
  createdAt: number;
  updatedAt: number;
};

export type JsonTeam = {
  id: string;
  orgId: string;
  name: string;
  description?: string;
  leadId?: string;
  memberIds: string[];
  createdBy: string;
  createdAt: number;
  updatedAt: number;
};

export type JsonInvite = {
  id: string;
  orgId: string;
  token: string;
  role: 'admin' | 'member' | 'guest';
  createdBy: string;
  createdAt: number;
  expiresAt: number;
  maxUses?: number;
  usedCount: number;
  revoked?: boolean;
  invitedIdentifier?: string;
};

export interface SeedData {
  orgs: JsonOrg[];
  users: JsonUser[];
  projects: JsonProject[];
  tasks: JsonTask[];
  groups: JsonGroup[];
  teams: JsonTeam[];
  invites: JsonInvite[];
}

export const lifecycleFromProject = (project: JsonProject): ProjectLifecycle => {
  if (project.isDeleted) return ProjectLifecycle.deleted;
  if (project.isArchived) return ProjectLifecycle.archived;
  if (project.isCompleted) return ProjectLifecycle.completed;
  return ProjectLifecycle.active;
};

