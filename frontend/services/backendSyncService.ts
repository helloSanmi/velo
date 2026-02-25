import { Project, Task, User, Organization } from '../types';
import { apiRequest, clearAuthTokens } from './apiClient';
import { DEFAULT_PROJECT_STAGES } from './projectService';
import { writeStoredTasks } from './task-service/storage';

const USERS_KEY = 'velo_users';
const ORGS_KEY = 'velo_orgs';
const PROJECTS_KEY = 'velo_projects';
const SESSION_KEY = 'velo_session';

interface BackendProject {
  id: string;
  orgId: string;
  createdBy: string;
  ownerId: string;
  name: string;
  description: string;
  color: string;
  memberIds: string[];
  stageDefs?: { id: string; name: string }[];
  lifecycle: 'active' | 'completed' | 'archived' | 'deleted';
  isPublic: boolean;
  publicToken?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

interface BackendTask {
  id: string;
  orgId: string;
  projectId: string;
  createdBy: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  assigneeIds?: string[];
  securityGroupIds?: string[];
  tags?: string[];
  blockedByIds?: string[];
  blocksIds?: string[];
  subtasks?: any[];
  comments?: any[];
  auditLog?: any[];
  metadata?: Record<string, unknown>;
  dueDate?: string | null;
  completedAt?: string | null;
  orderIndex: number;
  timeLoggedMs: number;
  timerStartedAt?: string | null;
  isTimerRunning: boolean;
  createdAt: string;
  updatedAt: string;
}

const toMs = (value?: string | null): number | undefined => (value ? new Date(value).getTime() : undefined);

const normalizeComment = (raw: any, fallbackUserId: string, index: number) => ({
  id: String(raw?.id || `c-${index}`),
  userId: String(raw?.userId || raw?.authorId || fallbackUserId),
  displayName: String(raw?.displayName || raw?.authorName || 'User'),
  text: String(raw?.text || raw?.content || raw?.message || ''),
  timestamp: Number(raw?.timestamp || (raw?.createdAt ? new Date(raw.createdAt).getTime() : Date.now()))
});

const normalizeAudit = (raw: any, fallbackUserId: string, index: number) => ({
  id: String(raw?.id || `a-${index}`),
  userId: String(raw?.userId || raw?.actorId || fallbackUserId),
  displayName: String(raw?.displayName || raw?.actorName || 'System'),
  action: String(raw?.action || raw?.event || ''),
  timestamp: Number(raw?.timestamp || (raw?.createdAt ? new Date(raw.createdAt).getTime() : Date.now()))
});

const mapProject = (project: BackendProject): Project => {
  const metadata = project.metadata || {};
  const integrationMeta =
    metadata.integrations && typeof metadata.integrations === 'object'
      ? (metadata.integrations as Record<string, unknown>)
      : {};
  const slackMeta =
    integrationMeta.slack && typeof integrationMeta.slack === 'object'
      ? (integrationMeta.slack as Record<string, unknown>)
      : null;
  const githubMeta =
    integrationMeta.github && typeof integrationMeta.github === 'object'
      ? (integrationMeta.github as Record<string, unknown>)
      : null;
  const metadataOwnerIds = Array.isArray(metadata.ownerIds)
    ? (metadata.ownerIds as unknown[]).filter((value): value is string => typeof value === 'string')
    : [];
  const ownerIds = Array.from(new Set([project.ownerId, ...metadataOwnerIds].filter(Boolean)));
  return {
    id: project.id,
    orgId: project.orgId,
    createdBy: project.ownerId || project.createdBy,
    ownerIds: ownerIds.length > 0 ? ownerIds : undefined,
    name: project.name,
    description: project.description,
    color: project.color,
    members: Array.isArray(project.memberIds) ? project.memberIds : [],
    stages: Array.isArray(project.stageDefs) && project.stageDefs.length > 0 ? project.stageDefs : DEFAULT_PROJECT_STAGES,
    isArchived: project.lifecycle === 'archived',
    isCompleted: project.lifecycle === 'completed',
    isDeleted: project.lifecycle === 'deleted',
    isPublic: project.isPublic,
    publicToken: project.publicToken,
    startDate: typeof metadata.startDate === 'number' ? metadata.startDate : undefined,
    endDate: typeof metadata.endDate === 'number' ? metadata.endDate : undefined,
    budgetCost: typeof metadata.budgetCost === 'number' ? metadata.budgetCost : undefined,
    hourlyRate: typeof metadata.hourlyRate === 'number' ? metadata.hourlyRate : undefined,
    scopeSummary: typeof metadata.scopeSummary === 'string' ? metadata.scopeSummary : undefined,
    scopeSize: typeof metadata.scopeSize === 'number' ? metadata.scopeSize : undefined,
    completionComment: typeof metadata.completionComment === 'string' ? metadata.completionComment : undefined,
    completionRequestedAt: typeof metadata.completionRequestedAt === 'number' ? metadata.completionRequestedAt : undefined,
    completionRequestedById: typeof metadata.completionRequestedById === 'string' ? metadata.completionRequestedById : undefined,
    completionRequestedByName: typeof metadata.completionRequestedByName === 'string' ? metadata.completionRequestedByName : undefined,
    completionRequestedComment: typeof metadata.completionRequestedComment === 'string' ? metadata.completionRequestedComment : undefined,
    reopenedAt: typeof metadata.reopenedAt === 'number' ? metadata.reopenedAt : undefined,
    reopenedById: typeof metadata.reopenedById === 'string' ? metadata.reopenedById : undefined,
    archivedAt: typeof metadata.archivedAt === 'number' ? metadata.archivedAt : undefined,
    archivedById: typeof metadata.archivedById === 'string' ? metadata.archivedById : undefined,
    completedAt: typeof metadata.completedAt === 'number' ? metadata.completedAt : undefined,
    completedById: typeof metadata.completedById === 'string' ? metadata.completedById : undefined,
    deletedAt: typeof metadata.deletedAt === 'number' ? metadata.deletedAt : undefined,
    deletedById: typeof metadata.deletedById === 'string' ? metadata.deletedById : undefined,
    integrations:
      slackMeta || githubMeta
        ? {
            slack: slackMeta
              ? {
                  enabled: Boolean(slackMeta.enabled),
                  channel: typeof slackMeta.channel === 'string' ? slackMeta.channel : 'general'
                }
              : undefined,
            github: githubMeta
              ? {
                  enabled: Boolean(githubMeta.enabled),
                  repo: typeof githubMeta.repo === 'string' ? githubMeta.repo : ''
                }
              : undefined
          }
        : undefined,
    version: 1,
    updatedAt: toMs(project.updatedAt) || Date.now()
  };
};

const mapTask = (task: BackendTask): Task => {
  const metadata = task.metadata || {};
  const assignees = Array.isArray(task.assigneeIds) ? task.assigneeIds : [];
  return {
    id: task.id,
    orgId: task.orgId,
    userId: task.createdBy,
    assigneeId: assignees[0],
    assigneeIds: assignees,
    securityGroupIds: Array.isArray(task.securityGroupIds) ? task.securityGroupIds : [],
    projectId: task.projectId,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority as Task['priority'],
    createdAt: toMs(task.createdAt) || Date.now(),
    completedAt: toMs(task.completedAt),
    order: task.orderIndex || 0,
    subtasks: Array.isArray(task.subtasks) ? task.subtasks : [],
    tags: Array.isArray(task.tags) ? task.tags : [],
    dueDate: toMs(task.dueDate),
    comments: Array.isArray(task.comments)
      ? task.comments.map((comment, index) => normalizeComment(comment, task.createdBy, index)).filter((comment) => comment.text.trim().length > 0)
      : [],
    auditLog: Array.isArray(task.auditLog)
      ? task.auditLog.map((entry, index) => normalizeAudit(entry, task.createdBy, index)).filter((entry) => entry.action.trim().length > 0)
      : [],
    timeLogged: task.timeLoggedMs || 0,
    isTimerRunning: Boolean(task.isTimerRunning),
    timerStartedAt: toMs(task.timerStartedAt),
    blockedByIds: Array.isArray(task.blockedByIds) ? task.blockedByIds : [],
    blocksIds: Array.isArray(task.blocksIds) ? task.blocksIds : [],
    movedBackAt: typeof metadata.movedBackAt === 'number' ? metadata.movedBackAt : undefined,
    movedBackBy: typeof metadata.movedBackBy === 'string' ? metadata.movedBackBy : undefined,
    movedBackReason: typeof metadata.movedBackReason === 'string' ? metadata.movedBackReason : undefined,
    movedBackFromStatus: typeof metadata.movedBackFromStatus === 'string' ? metadata.movedBackFromStatus : undefined,
    approvedAt: typeof metadata.approvedAt === 'number' ? metadata.approvedAt : undefined,
    approvedBy: typeof metadata.approvedBy === 'string' ? metadata.approvedBy : undefined,
    estimateMinutes: typeof metadata.estimateMinutes === 'number' ? metadata.estimateMinutes : undefined,
    estimateProvidedBy: typeof metadata.estimateProvidedBy === 'string' ? metadata.estimateProvidedBy : undefined,
    estimateProvidedAt: typeof metadata.estimateProvidedAt === 'number' ? metadata.estimateProvidedAt : undefined,
    actualMinutes: typeof metadata.actualMinutes === 'number' ? metadata.actualMinutes : undefined,
    estimateRiskApprovedAt: typeof metadata.estimateRiskApprovedAt === 'number' ? metadata.estimateRiskApprovedAt : undefined,
    estimateRiskApprovedBy: typeof metadata.estimateRiskApprovedBy === 'string' ? metadata.estimateRiskApprovedBy : undefined,
    version: 1,
    updatedAt: toMs(task.updatedAt) || Date.now()
  };
};

const persistWorkspaceSnapshot = (org: Organization, users: User[], projects: Project[], tasks: Task[]): void => {
  localStorage.setItem(ORGS_KEY, JSON.stringify([org]));
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
  writeStoredTasks(tasks);
};

type WorkspaceSnapshot = { org: Organization; users: User[]; projects: Project[]; tasks: Task[] };
const HYDRATE_DEDUP_WINDOW_MS = 1500;
const hydrateInFlightByOrg = new Map<string, Promise<WorkspaceSnapshot>>();
const hydrateCacheByOrg = new Map<string, { at: number; snapshot: WorkspaceSnapshot }>();

export const backendSyncService = {
  async hydrateWorkspace(orgId: string): Promise<WorkspaceSnapshot> {
    const cached = hydrateCacheByOrg.get(orgId);
    if (cached && Date.now() - cached.at < HYDRATE_DEDUP_WINDOW_MS) {
      return cached.snapshot;
    }
    const inFlight = hydrateInFlightByOrg.get(orgId);
    if (inFlight) return inFlight;

    const hydrationPromise = (async () => {
      const [orgRaw, usersRaw, projectsRaw, tasksRaw] = await Promise.all([
        apiRequest<any>(`/orgs/${orgId}`),
        apiRequest<any[]>(`/orgs/${orgId}/users`),
        apiRequest<BackendProject[]>(`/orgs/${orgId}/projects`),
        apiRequest<BackendTask[]>(`/orgs/${orgId}/tasks`)
      ]);

      const org: Organization = {
        id: orgRaw.id,
        name: orgRaw.name,
        loginSubdomain: orgRaw.loginSubdomain,
        totalSeats: orgRaw.totalSeats,
        ownerId: orgRaw.ownerId,
        createdAt: toMs(orgRaw.createdAt) || Date.now(),
        plan: orgRaw.plan,
        seatPrice: orgRaw.seatPrice,
        billingCurrency: orgRaw.billingCurrency,
        aiDailyRequestLimit: typeof orgRaw.aiDailyRequestLimit === 'number' ? orgRaw.aiDailyRequestLimit : undefined,
        aiDailyTokenLimit: typeof orgRaw.aiDailyTokenLimit === 'number' ? orgRaw.aiDailyTokenLimit : undefined,
        allowGoogleAuth: Boolean(orgRaw.allowGoogleAuth),
        allowMicrosoftAuth: Boolean(orgRaw.allowMicrosoftAuth),
        googleWorkspaceConnected: Boolean(orgRaw.googleWorkspaceConnected),
        microsoftWorkspaceConnected: Boolean(orgRaw.microsoftWorkspaceConnected)
      };

      const users: User[] = usersRaw.map((u) => ({
        id: u.id,
        orgId: u.orgId,
        username: u.username,
        displayName: u.displayName,
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        avatar: u.avatar,
        role: u.role,
        licenseActive: u.licenseActive !== false,
        mustChangePassword: Boolean(u.mustChangePassword)
      }));

      const projects = projectsRaw.map(mapProject);
      const tasks = tasksRaw.map(mapTask);
      const snapshot: WorkspaceSnapshot = { org, users, projects, tasks };
      persistWorkspaceSnapshot(org, users, projects, tasks);
      hydrateCacheByOrg.set(orgId, { at: Date.now(), snapshot });
      return snapshot;
    })();

    hydrateInFlightByOrg.set(orgId, hydrationPromise);
    try {
      return await hydrationPromise;
    } finally {
      hydrateInFlightByOrg.delete(orgId);
    }
  },

  clearAuthSession() {
    clearAuthTokens();
    localStorage.removeItem(SESSION_KEY);
  },

  async createProject(
    orgId: string,
    payload: {
      id?: string;
      name: string;
      description: string;
      color: string;
      isPublic?: boolean;
      publicToken?: string;
      memberIds: string[];
      metadata?: {
        startDate?: number;
        endDate?: number;
        budgetCost?: number;
        hourlyRate?: number;
        scopeSummary?: string;
        scopeSize?: number;
      };
    }
  ) {
    await apiRequest(`/orgs/${orgId}/projects`, {
      method: 'POST',
      body: payload
    });
  },

  async listProjects(orgId: string): Promise<Project[]> {
    const projectsRaw = await apiRequest<BackendProject[]>(`/orgs/${orgId}/projects`);
    return projectsRaw.map(mapProject);
  },

  async updateProject(orgId: string, projectId: string, patch: Record<string, unknown>) {
    await apiRequest(`/orgs/${orgId}/projects/${projectId}`, {
      method: 'PATCH',
      body: patch
    });
  },

  async deleteProject(orgId: string, projectId: string) {
    await apiRequest(`/orgs/${orgId}/projects/${projectId}`, {
      method: 'DELETE'
    });
  },

  async createTask(
    orgId: string,
    projectId: string,
    payload: {
      title: string;
      description: string;
      status: string;
      priority: string;
      dueDate?: number;
      assigneeIds?: string[];
      tags?: string[];
    }
  ) {
    await apiRequest(`/orgs/${orgId}/projects/${projectId}/tasks`, {
      method: 'POST',
      body: {
        ...payload,
        dueDate: payload.dueDate ? new Date(payload.dueDate).toISOString() : undefined
      }
    });
  },

  async updateTask(
    orgId: string,
    projectId: string,
    taskId: string,
    patch: {
      title?: string;
      description?: string;
      status?: string;
      priority?: string;
      dueDate?: number;
      assigneeIds?: string[];
      securityGroupIds?: string[];
      blockedByIds?: string[];
      tags?: string[];
      comments?: Record<string, unknown>[];
      subtasks?: Record<string, unknown>[];
      auditLog?: Record<string, unknown>[];
      timeLoggedMs?: number;
      isTimerRunning?: boolean;
      timerStartedAt?: number | null;
      metadata?: Record<string, unknown>;
    }
  ) {
    await apiRequest(`/orgs/${orgId}/projects/${projectId}/tasks/${taskId}`, {
      method: 'PATCH',
      body: {
        ...patch,
        dueDate: patch.dueDate ? new Date(patch.dueDate).toISOString() : patch.dueDate === undefined ? undefined : null,
        timerStartedAt:
          patch.timerStartedAt === undefined
            ? undefined
            : patch.timerStartedAt === null
              ? null
              : new Date(patch.timerStartedAt).toISOString()
      }
    });
  },

  async deleteTask(orgId: string, projectId: string, taskId: string) {
    await apiRequest(`/orgs/${orgId}/projects/${projectId}/tasks/${taskId}`, {
      method: 'DELETE'
    });
  }
};
