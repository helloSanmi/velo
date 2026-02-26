import { Task } from '../../types';
import { backendSyncService } from '../backendSyncService';
import { realtimeService } from '../realtimeService';
import { syncGuardService } from '../syncGuardService';
import { toastService } from '../toastService';
import { enqueueTaskCreate, enqueueTaskDelete, enqueueTaskUpdate } from './syncQueue';

const WORKSPACE_SYNC_REQUIRED_EVENT = 'workspaceSyncRequired';
const isPermissionError = (error: unknown) =>
  error instanceof Error && (error.message.includes('403') || /permission denied/i.test(error.message));
const isAuthError = (error: unknown) =>
  error instanceof Error &&
  (error.message.includes('401') ||
    /unauthori[sz]ed|authentication required|missing or invalid authorization|invalid access token/i.test(error.message));

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

export type TaskBackendPatch = {
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  dueDate?: number | null;
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
};

const buildPatchFromUpdates = (task: Task, updates?: Partial<Omit<Task, 'id' | 'userId' | 'createdAt' | 'order'>>): TaskBackendPatch => {
  if (!updates) return {};
  const patch: TaskBackendPatch = {};

  if (typeof updates.title === 'string') patch.title = updates.title;
  if (typeof updates.description === 'string') patch.description = updates.description;
  if (typeof updates.status === 'string') patch.status = updates.status;
  if (updates.priority !== undefined) patch.priority = updates.priority;
  if ('dueDate' in updates) patch.dueDate = updates.dueDate ?? null;
  if ('assigneeIds' in updates) patch.assigneeIds = Array.isArray(task.assigneeIds) ? task.assigneeIds : [];
  if ('securityGroupIds' in updates)
    patch.securityGroupIds = Array.isArray(task.securityGroupIds) ? task.securityGroupIds : [];
  if ('blockedByIds' in updates) patch.blockedByIds = Array.isArray(task.blockedByIds) ? task.blockedByIds : [];
  if ('tags' in updates) patch.tags = Array.isArray(task.tags) ? task.tags : [];
  if ('comments' in updates)
    patch.comments = Array.isArray(task.comments) ? (task.comments as unknown as Record<string, unknown>[]) : [];
  if ('subtasks' in updates)
    patch.subtasks = Array.isArray(task.subtasks) ? (task.subtasks as unknown as Record<string, unknown>[]) : [];
  if ('auditLog' in updates)
    patch.auditLog = Array.isArray(task.auditLog) ? (task.auditLog as unknown as Record<string, unknown>[]) : [];
  if ('timeLogged' in updates) patch.timeLoggedMs = typeof task.timeLogged === 'number' ? task.timeLogged : 0;
  if ('isTimerRunning' in updates) patch.isTimerRunning = typeof task.isTimerRunning === 'boolean' ? task.isTimerRunning : false;
  if ('timerStartedAt' in updates) patch.timerStartedAt = task.timerStartedAt ?? null;
  if (
    'movedBackAt' in updates ||
    'movedBackBy' in updates ||
    'movedBackReason' in updates ||
    'movedBackFromStatus' in updates ||
    'approvedAt' in updates ||
    'approvedBy' in updates ||
    'estimateMinutes' in updates ||
    'estimateProvidedBy' in updates ||
    'estimateProvidedAt' in updates ||
    'actualMinutes' in updates ||
    'estimateRiskApprovedAt' in updates ||
    'estimateRiskApprovedBy' in updates
  ) {
    patch.metadata = {
      movedBackAt: task.movedBackAt,
      movedBackBy: task.movedBackBy,
      movedBackReason: task.movedBackReason,
      movedBackFromStatus: task.movedBackFromStatus,
      approvedAt: task.approvedAt,
      approvedBy: task.approvedBy,
      estimateMinutes: task.estimateMinutes,
      estimateProvidedBy: task.estimateProvidedBy,
      estimateProvidedAt: task.estimateProvidedAt,
      actualMinutes: task.actualMinutes,
      estimateRiskApprovedAt: task.estimateRiskApprovedAt,
      estimateRiskApprovedBy: task.estimateRiskApprovedBy
    };
  }

  return patch;
};

export const emitTasksUpdated = (orgId: string, actorId?: string, taskId?: string) => {
  realtimeService.publish({
    type: 'TASKS_UPDATED',
    orgId,
    actorId,
    payload: taskId ? { taskId } : undefined
  });
};

export const syncTaskToBackend = (
  orgId: string,
  task: Task,
  updates?: Partial<Omit<Task, 'id' | 'userId' | 'createdAt' | 'order'>>,
  patchOverride?: TaskBackendPatch
) => {
  const patch = patchOverride || buildPatchFromUpdates(task, updates);
  if (Object.keys(patch).length === 0) {
    return;
  }
  if (!navigator.onLine) {
    enqueueTaskUpdate(orgId, task.projectId, task.id, patch);
    syncGuardService.markPending();
    return;
  }
  void (async () => {
    let lastError: unknown;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        await backendSyncService.updateTask(orgId, task.projectId, task.id, patch);
        syncGuardService.clearPending();
        return;
      } catch (error) {
        lastError = error;
        if (isPermissionError(error) || isAuthError(error)) break;
        await wait(200 * (attempt + 1));
      }
    }
    syncGuardService.markPending();
    const message = lastError instanceof Error ? lastError.message : 'Task sync failed';
    if (isAuthError(lastError)) {
      toastService.warning('Session expired', 'Backend sync requires sign-in again. Reloading latest data.');
      window.dispatchEvent(new CustomEvent(WORKSPACE_SYNC_REQUIRED_EVENT, { detail: { orgId, reason: 'task-auth-expired' } }));
      return;
    }
    if (isPermissionError(lastError)) {
      toastService.warning('Change rejected', 'Backend denied this task update. Reloading latest data.');
      window.dispatchEvent(new CustomEvent(WORKSPACE_SYNC_REQUIRED_EVENT, { detail: { orgId, reason: 'task-permission-denied' } }));
      return;
    }
    enqueueTaskUpdate(orgId, task.projectId, task.id, patch);
    toastService.warning('Sync pending', `Task update saved locally but not synced: ${message}`);
  })();
};

export const syncTaskCreateToBackend = (
  orgId: string,
  task: Pick<Task, 'projectId' | 'title' | 'description' | 'status' | 'priority' | 'dueDate' | 'assigneeIds' | 'tags'>
) => {
  const payload = {
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate,
    assigneeIds: task.assigneeIds,
    tags: task.tags
  };
  if (!navigator.onLine) {
    enqueueTaskCreate(orgId, task.projectId, task.id, payload);
    syncGuardService.markPending();
    return;
  }
  void (async () => {
    let lastError: unknown;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        await backendSyncService.createTask(orgId, task.projectId, {
          ...payload
        });
        syncGuardService.clearPending();
        return;
      } catch (error) {
        lastError = error;
        if (isPermissionError(error) || isAuthError(error)) break;
        await wait(200 * (attempt + 1));
      }
    }
    syncGuardService.markPending();
    if (isAuthError(lastError)) {
      toastService.warning('Session expired', 'Backend sync requires sign-in again. Reloading latest data.');
      window.dispatchEvent(new CustomEvent(WORKSPACE_SYNC_REQUIRED_EVENT, { detail: { orgId, reason: 'task-create-auth-expired' } }));
      return;
    }
    if (isPermissionError(lastError)) {
      toastService.warning('Change rejected', 'Backend denied task creation. Reloading latest data.');
      window.dispatchEvent(new CustomEvent(WORKSPACE_SYNC_REQUIRED_EVENT, { detail: { orgId, reason: 'task-create-denied' } }));
      return;
    }
    enqueueTaskCreate(orgId, task.projectId, task.id, payload);
    const message = lastError instanceof Error ? lastError.message : 'Task create sync failed';
    toastService.warning('Sync pending', `Task creation saved locally but not synced: ${message}`);
  })();
};

export const syncTaskDeleteToBackend = (orgId: string, task: Pick<Task, 'id' | 'projectId'>) => {
  if (!navigator.onLine) {
    enqueueTaskDelete(orgId, task.projectId, task.id);
    syncGuardService.markPending();
    return;
  }
  void (async () => {
    let lastError: unknown;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        await backendSyncService.deleteTask(orgId, task.projectId, task.id);
        syncGuardService.clearPending();
        return;
      } catch (error) {
        lastError = error;
        if (isPermissionError(error) || isAuthError(error)) break;
        await wait(200 * (attempt + 1));
      }
    }
    syncGuardService.markPending();
    if (isAuthError(lastError)) {
      toastService.warning('Session expired', 'Backend sync requires sign-in again. Reloading latest data.');
      window.dispatchEvent(new CustomEvent(WORKSPACE_SYNC_REQUIRED_EVENT, { detail: { orgId, reason: 'task-delete-auth-expired' } }));
      return;
    }
    if (isPermissionError(lastError)) {
      toastService.warning('Change rejected', 'Backend denied task deletion. Reloading latest data.');
      window.dispatchEvent(new CustomEvent(WORKSPACE_SYNC_REQUIRED_EVENT, { detail: { orgId, reason: 'task-delete-denied' } }));
      return;
    }
    enqueueTaskDelete(orgId, task.projectId, task.id);
    const message = lastError instanceof Error ? lastError.message : 'Task delete sync failed';
    toastService.warning('Sync pending', `Task deletion saved locally but not synced: ${message}`);
  })();
};
