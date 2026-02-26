
import { Project, ProjectStage, TaskStatus } from '../types';
import { syncGuardService } from './syncGuardService';
import { realtimeService } from './realtimeService';
import { createId, createShortId } from '../utils/id';
import { backendSyncService } from './backendSyncService';
import { toastService } from './toastService';

const PROJECTS_KEY = 'velo_projects';
export const DEFAULT_PROJECT_STAGES: ProjectStage[] = [
  { id: TaskStatus.TODO, name: 'To Do' },
  { id: TaskStatus.IN_PROGRESS, name: 'In Progress' },
  { id: TaskStatus.DONE, name: 'Done' }
];

const normalizeStages = (stages?: ProjectStage[]): ProjectStage[] => {
  if (!Array.isArray(stages) || stages.length === 0) return DEFAULT_PROJECT_STAGES;
  const normalized = stages
    .filter((stage) => stage?.id && stage?.name)
    .map((stage) => ({ id: stage.id.trim(), name: stage.name.trim() }))
    .filter((stage) => stage.id && stage.name);
  return normalized.length > 0 ? normalized : DEFAULT_PROJECT_STAGES;
};

const normalizeProjectMeta = (meta?: Partial<Project>) => {
  const startDate = meta?.startDate;
  const endDate = meta?.endDate;
  const budgetCost = typeof meta?.budgetCost === 'number' && Number.isFinite(meta.budgetCost) ? Math.max(0, meta.budgetCost) : undefined;
  const hourlyRate = typeof meta?.hourlyRate === 'number' && Number.isFinite(meta.hourlyRate) ? Math.max(0, meta.hourlyRate) : undefined;
  const scopeSize = typeof meta?.scopeSize === 'number' && Number.isFinite(meta.scopeSize) ? Math.max(0, Math.round(meta.scopeSize)) : undefined;
  const scopeSummary = meta?.scopeSummary?.trim() || undefined;
  const completionComment = meta?.completionComment?.trim() || undefined;
  const completionRequestedAt = typeof meta?.completionRequestedAt === 'number' ? meta.completionRequestedAt : undefined;
  const completionRequestedById = meta?.completionRequestedById?.trim() || undefined;
  const completionRequestedByName = meta?.completionRequestedByName?.trim() || undefined;
  const completionRequestedComment = meta?.completionRequestedComment?.trim() || undefined;
  const reopenedAt = typeof meta?.reopenedAt === 'number' ? meta.reopenedAt : undefined;
  const reopenedById = meta?.reopenedById?.trim() || undefined;
  const archivedAt = typeof meta?.archivedAt === 'number' ? meta.archivedAt : undefined;
  const archivedById = meta?.archivedById?.trim() || undefined;
  const completedAt = typeof meta?.completedAt === 'number' ? meta.completedAt : undefined;
  const completedById = meta?.completedById?.trim() || undefined;
  const deletedAt = typeof meta?.deletedAt === 'number' ? meta.deletedAt : undefined;
  const deletedById = meta?.deletedById?.trim() || undefined;

  const integrations =
    meta?.integrations && typeof meta.integrations === 'object'
      ? {
          slack: meta.integrations.slack
            ? {
                enabled: Boolean(meta.integrations.slack.enabled),
                channel: String(meta.integrations.slack.channel || 'general')
              }
            : undefined,
          github: meta.integrations.github
            ? {
                enabled: Boolean(meta.integrations.github.enabled),
                repo: String(meta.integrations.github.repo || '').trim()
              }
            : undefined
        }
      : undefined;

  return {
    startDate,
    endDate: endDate && startDate && endDate < startDate ? startDate : endDate,
    budgetCost,
    hourlyRate,
    scopeSummary,
    scopeSize,
    completionComment,
    completionRequestedAt,
    completionRequestedById,
    completionRequestedByName,
    completionRequestedComment,
    reopenedAt,
    reopenedById,
    archivedAt,
    archivedById,
    completedAt,
    completedById,
    deletedAt,
    deletedById,
    integrations
  };
};

const emitProjectsUpdated = (
  orgId?: string,
  actorId?: string,
  payload?: { projectId?: string; project?: Project; action?: 'created' | 'updated' | 'purged' }
) => {
  realtimeService.publish({
    type: 'PROJECTS_UPDATED',
    orgId,
    actorId,
    payload
  });
};

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));
const isPermissionError = (error: unknown) =>
  error instanceof Error && (error.message.includes('403') || /permission denied/i.test(error.message));
const isAuthError = (error: unknown) =>
  error instanceof Error &&
  (error.message.includes('401') ||
    /unauthori[sz]ed|authentication required|missing or invalid authorization|invalid access token/i.test(error.message));
const isNotFoundError = (error: unknown) =>
  error instanceof Error && (error.message.includes('404') || /not found/i.test(error.message));

const syncProjectMutation = async (label: string, runner: () => Promise<void>) => {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await runner();
      syncGuardService.clearPending();
      window.dispatchEvent(new CustomEvent('workspaceSyncRequired'));
      return;
    } catch (error) {
      lastError = error;
      if (isPermissionError(error) || isAuthError(error)) break;
      await wait(250 * (attempt + 1));
    }
  }
  syncGuardService.markPending();
  if (isAuthError(lastError)) {
    toastService.warning('Session expired', `${label} blocked. Sign in again to resume backend sync.`);
    window.dispatchEvent(new CustomEvent('workspaceSyncRequired', { detail: { reason: 'project-auth-expired' } }));
    return;
  }
  if (isPermissionError(lastError)) {
    toastService.warning('Change rejected', `${label} was denied by backend permissions.`);
    window.dispatchEvent(new CustomEvent('workspaceSyncRequired', { detail: { reason: 'project-permission-denied' } }));
    return;
  }
  const message = lastError instanceof Error ? lastError.message : 'Unknown sync error';
  toastService.warning('Sync pending', `${label} saved locally but not yet synced to backend: ${message}`);
};

export const projectService = {
  getProjects: (orgId?: string): Project[] => {
    try {
      const data = localStorage.getItem(PROJECTS_KEY);
      if (!data) return [];
      const all: Project[] = JSON.parse(data) || [];
      if (!Array.isArray(all)) return [];
      const normalizedProjects = all.map((project) => ({
        ...project,
        createdBy: project.createdBy,
        ownerIds: Array.from(
          new Set(
            [
              ...(Array.isArray(project.ownerIds) ? project.ownerIds : []),
              ...(project.createdBy ? [project.createdBy] : [])
            ].filter(Boolean)
          )
        ),
        stages: normalizeStages(project.stages),
        version: Number.isFinite(project.version as number) ? Math.max(1, Number(project.version)) : 1,
        updatedAt: project.updatedAt || Date.now()
      }));
      if (orgId) return normalizedProjects.filter(p => p.orgId === orgId);
      return normalizedProjects;
    } catch (e) {
      console.error("Error parsing projects:", e);
      return [];
    }
  },

  getProjectByToken: (token: string): Project | undefined => {
    const all = projectService.getProjects();
    return all.find(p => p.publicToken === token && p.isPublic && !p.isArchived && !p.isCompleted && !p.isDeleted);
  },

  getProjectsForUser: (userId: string, orgId: string): Project[] => {
    const projects = projectService.getProjects(orgId);
    return projects.filter(
      p =>
        p.members &&
        p.members.includes(userId) &&
        !p.isArchived &&
        !p.isCompleted &&
        !p.isDeleted
    );
  },

  createProject: (
    orgId: string,
    name: string,
    description: string,
    color: string,
    members: string[],
    meta?: Partial<Project>,
    createdBy?: string
  ): Project => {
    const projects = projectService.getProjects();
    const normalizedMeta = normalizeProjectMeta(meta);
    const normalizedMembers = Array.from(new Set([...members, ...(createdBy ? [createdBy] : [])]));
    const initialIsPublic = Boolean(meta?.isPublic);
    const initialPublicToken = createShortId(8);
    const newProject: Project = {
      id: createId(),
      orgId,
      createdBy: createdBy || normalizedMembers[0],
      ownerIds: Array.from(new Set([createdBy || normalizedMembers[0]].filter(Boolean))),
      name,
      description,
      color,
      ...normalizedMeta,
      stages: DEFAULT_PROJECT_STAGES,
      members: normalizedMembers,
      version: 1,
      updatedAt: Date.now(),
      isArchived: false,
      isCompleted: false,
      isDeleted: false,
      isPublic: initialIsPublic,
      publicToken: initialPublicToken
    };
    localStorage.setItem(PROJECTS_KEY, JSON.stringify([...projects, newProject]));
    void syncProjectMutation('Project create', () =>
      backendSyncService.createProject(orgId, {
        id: newProject.id,
        name,
        description,
        color,
        isPublic: initialIsPublic,
        publicToken: initialPublicToken,
        memberIds: normalizedMembers,
        metadata: normalizedMeta
      })
    );
    syncGuardService.markLocalMutation();
    emitProjectsUpdated(orgId, createdBy || normalizedMembers[0], { projectId: newProject.id, project: newProject, action: 'created' });
    return newProject;
  },

  togglePublicAccess: (id: string): Project | undefined => {
    const projects = projectService.getProjects();
    let updated: Project | undefined;
    const newList = projects.map(p => {
      if (p.id === id) {
        updated = { ...p, isPublic: !p.isPublic, publicToken: p.publicToken || createShortId(8) };
        return updated;
      }
      return p;
    });
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(newList));
    syncGuardService.markLocalMutation();
    emitProjectsUpdated(updated?.orgId, undefined, updated ? { projectId: id, project: updated, action: 'updated' } : { projectId: id, action: 'updated' });
    return updated;
  },

  updateProject: (id: string, updates: Partial<Project>, options?: { sync?: boolean }) => {
    const normalizedMeta = normalizeProjectMeta(updates);
    let updatedOrgId: string | undefined;
    let backendPatch: Record<string, unknown> | null = null;
    const projects = projectService.getProjects().map(p => {
      if (p.id !== id) return p;
      updatedOrgId = p.orgId;
      const nextIsPublic = typeof updates.isPublic === 'boolean' ? updates.isPublic : p.isPublic;
      const nextPublicToken = nextIsPublic ? (updates.publicToken || p.publicToken || createShortId(8)) : p.publicToken;
      const nextLifecycle =
        updates.isDeleted ? 'deleted' :
        updates.isArchived ? 'archived' :
        updates.isCompleted ? 'completed' :
        'active';
      const hasMetaUpdate =
        'startDate' in updates ||
        'endDate' in updates ||
        'budgetCost' in updates ||
        'hourlyRate' in updates ||
        'scopeSummary' in updates ||
        'scopeSize' in updates ||
        'completionComment' in updates ||
        'completionRequestedAt' in updates ||
        'completionRequestedById' in updates ||
        'completionRequestedByName' in updates ||
        'completionRequestedComment' in updates ||
        'reopenedAt' in updates ||
        'reopenedById' in updates ||
        'archivedAt' in updates ||
        'archivedById' in updates ||
        'completedAt' in updates ||
        'completedById' in updates ||
        'deletedAt' in updates ||
        'deletedById' in updates ||
        'ownerIds' in updates ||
        'integrations' in updates;
      const nextOwnerIds = Array.isArray(updates.ownerIds)
        ? Array.from(new Set(updates.ownerIds.filter(Boolean)))
        : undefined;
      backendPatch = {
        name: updates.name,
        description: updates.description,
        color: updates.color,
        ownerId: updates.createdBy || nextOwnerIds?.[0],
        memberIds: updates.members,
        stageDefs: Array.isArray(updates.stages)
          ? normalizeStages(updates.stages).map((stage) => ({ id: stage.id, name: stage.name }))
          : undefined,
        isPublic: nextIsPublic,
        publicToken: nextPublicToken,
        lifecycle: nextLifecycle,
        metadata: hasMetaUpdate
          ? {
            ...normalizedMeta,
            ...(nextOwnerIds ? { ownerIds: nextOwnerIds } : {})
          }
          : undefined
      };
      return {
        ...p,
        ...updates,
        isPublic: nextIsPublic,
        publicToken: nextPublicToken,
        ownerIds: nextOwnerIds || p.ownerIds,
        ...normalizedMeta,
        stages: normalizeStages(updates.stages || p.stages),
        version: (p.version || 1) + 1,
        updatedAt: Date.now()
      };
    });
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
    const shouldSync = options?.sync !== false;
    if (shouldSync && updatedOrgId && backendPatch) {
      void syncProjectMutation('Project update', () => backendSyncService.updateProject(updatedOrgId!, id, backendPatch!));
    }
    syncGuardService.markLocalMutation();
    const updatedProject = projects.find((p) => p.id === id);
    emitProjectsUpdated(updatedOrgId, undefined, updatedProject ? { projectId: id, project: updatedProject, action: 'updated' } : { projectId: id, action: 'updated' });
    return updatedProject;
  },

  renameProject: (id: string, name: string): Project | undefined => {
    return projectService.updateProject(id, { name: name.trim() });
  },

  archiveProject: (id: string, archivedById?: string): Project | undefined => {
    return projectService.updateProject(id, {
      isArchived: true,
      archivedAt: Date.now(),
      archivedById,
      isCompleted: false,
      completedAt: undefined,
      completedById: undefined,
      isDeleted: false,
      deletedAt: undefined,
      deletedById: undefined
    });
  },

  unarchiveProject: (id: string): Project | undefined => {
    return projectService.updateProject(id, { isArchived: false, archivedAt: undefined, archivedById: undefined });
  },

  completeProject: (id: string, completedById?: string): Project | undefined => {
    return projectService.updateProject(id, {
      isCompleted: true,
      completedAt: Date.now(),
      completedById,
      completionRequestedAt: undefined,
      completionRequestedById: undefined,
      completionRequestedByName: undefined,
      completionRequestedComment: undefined,
      reopenedAt: undefined,
      reopenedById: undefined,
      isArchived: false,
      archivedAt: undefined,
      archivedById: undefined,
      isDeleted: false,
      deletedAt: undefined,
      deletedById: undefined
    });
  },

  reopenProject: (id: string, reopenedById?: string): Project | undefined => {
    return projectService.updateProject(id, {
      isCompleted: false,
      completedAt: undefined,
      completionRequestedAt: undefined,
      completionRequestedById: undefined,
      completionRequestedByName: undefined,
      completionRequestedComment: undefined,
      reopenedAt: Date.now(),
      reopenedById
    });
  },

  restoreProject: (id: string, reopenedById?: string): Project | undefined => {
    return projectService.updateProject(id, {
      isArchived: false,
      archivedAt: undefined,
      archivedById: undefined,
      isCompleted: false,
      completedAt: undefined,
      completedById: undefined,
      completionRequestedAt: undefined,
      completionRequestedById: undefined,
      completionRequestedByName: undefined,
      completionRequestedComment: undefined,
      reopenedAt: Date.now(),
      reopenedById,
      isDeleted: false,
      deletedAt: undefined,
      deletedById: undefined
    });
  },

  deleteProject: (id: string, deletedById?: string) => {
    return projectService.updateProject(id, {
      isDeleted: true,
      deletedAt: Date.now(),
      deletedById,
      isArchived: false,
      archivedAt: undefined,
      archivedById: undefined,
      isCompleted: false,
      completedAt: undefined,
      completedById: undefined
    });
  },

  purgeProject: (id: string) => {
    const allProjects = projectService.getProjects();
    const target = allProjects.find((project) => project.id === id);
    if (!target?.orgId) return;
    const projects = allProjects.filter(p => p.id !== id);
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
    void syncProjectMutation('Project purge', async () => {
      try {
        await backendSyncService.deleteProject(target.orgId, id);
      } catch (error) {
        if (!isNotFoundError(error)) throw error;
        const remoteProjects = await backendSyncService.listProjects(target.orgId);
        const fallbackMatch = remoteProjects.find(
          (project) =>
            project.name === target.name &&
            project.description === target.description &&
            project.color === target.color &&
            project.createdBy === target.createdBy
        );
        if (!fallbackMatch) throw error;
        await backendSyncService.deleteProject(target.orgId, fallbackMatch.id);
      }
    });
    syncGuardService.markLocalMutation();
    emitProjectsUpdated(target.orgId, undefined, { projectId: id, action: 'purged' });
  }
};
