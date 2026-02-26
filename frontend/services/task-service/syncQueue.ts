import { backendSyncService } from '../backendSyncService';

const KEY = 'velo_task_sync_queue_v1';
const EVENT = 'taskSyncQueueUpdated';

export type QueuedTaskPatch = {
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

type QueuedCreatePayload = {
  title: string;
  description: string;
  status: string;
  priority: string;
  dueDate?: number;
  assigneeIds?: string[];
  tags?: string[];
};

type TaskSyncJob =
  | {
      id: string;
      kind: 'update';
      orgId: string;
      projectId: string;
      taskId: string;
      patch: QueuedTaskPatch;
      enqueuedAt: number;
    }
  | {
      id: string;
      kind: 'create';
      orgId: string;
      projectId: string;
      taskId: string;
      payload: QueuedCreatePayload;
      enqueuedAt: number;
    }
  | {
      id: string;
      kind: 'delete';
      orgId: string;
      projectId: string;
      taskId: string;
      enqueuedAt: number;
    };

const readQueue = (): TaskSyncJob[] => {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(parsed) ? (parsed as TaskSyncJob[]) : [];
  } catch {
    return [];
  }
};

const writeQueue = (jobs: TaskSyncJob[]) => {
  localStorage.setItem(KEY, JSON.stringify(jobs));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(EVENT, { detail: { total: jobs.length } }));
  }
};

const mergeCreateWithPatch = (payload: QueuedCreatePayload, patch: QueuedTaskPatch): QueuedCreatePayload => ({
  ...payload,
  title: patch.title ?? payload.title,
  description: patch.description ?? payload.description,
  status: patch.status ?? payload.status,
  priority: patch.priority ?? payload.priority,
  dueDate: patch.dueDate === null ? undefined : patch.dueDate ?? payload.dueDate,
  assigneeIds: patch.assigneeIds ?? payload.assigneeIds,
  tags: patch.tags ?? payload.tags
});

export const enqueueTaskCreate = (
  orgId: string,
  projectId: string,
  taskId: string,
  payload: QueuedCreatePayload
) => {
  const queue = readQueue();
  const withoutSameTask = queue.filter((job) => !(job.orgId === orgId && job.projectId === projectId && job.taskId === taskId));
  withoutSameTask.push({
    id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
    kind: 'create',
    orgId,
    projectId,
    taskId,
    payload,
    enqueuedAt: Date.now()
  });
  writeQueue(withoutSameTask);
};

export const enqueueTaskUpdate = (
  orgId: string,
  projectId: string,
  taskId: string,
  patch: QueuedTaskPatch
) => {
  const queue = readQueue();
  const next = [...queue];

  const createIndex = next.findIndex(
    (job) => job.kind === 'create' && job.orgId === orgId && job.projectId === projectId && job.taskId === taskId
  );
  if (createIndex >= 0) {
    const createJob = next[createIndex] as Extract<TaskSyncJob, { kind: 'create' }>;
    next[createIndex] = { ...createJob, payload: mergeCreateWithPatch(createJob.payload, patch) };
    writeQueue(next);
    return;
  }

  const existingUpdateIndex = next.findIndex(
    (job) => job.kind === 'update' && job.orgId === orgId && job.projectId === projectId && job.taskId === taskId
  );
  if (existingUpdateIndex >= 0) {
    const existing = next[existingUpdateIndex] as Extract<TaskSyncJob, { kind: 'update' }>;
    next[existingUpdateIndex] = { ...existing, patch: { ...existing.patch, ...patch } };
    writeQueue(next);
    return;
  }

  const hasDelete = next.some(
    (job) => job.kind === 'delete' && job.orgId === orgId && job.projectId === projectId && job.taskId === taskId
  );
  if (hasDelete) return;

  next.push({
    id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
    kind: 'update',
    orgId,
    projectId,
    taskId,
    patch,
    enqueuedAt: Date.now()
  });
  writeQueue(next);
};

export const enqueueTaskDelete = (orgId: string, projectId: string, taskId: string) => {
  const queue = readQueue();
  const withoutTaskJobs = queue.filter(
    (job) => !(job.orgId === orgId && job.projectId === projectId && job.taskId === taskId)
  );

  const hadCreate = queue.some(
    (job) => job.kind === 'create' && job.orgId === orgId && job.projectId === projectId && job.taskId === taskId
  );
  if (hadCreate) {
    writeQueue(withoutTaskJobs);
    return;
  }

  withoutTaskJobs.push({
    id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
    kind: 'delete',
    orgId,
    projectId,
    taskId,
    enqueuedAt: Date.now()
  });
  writeQueue(withoutTaskJobs);
};

const isAuthOrPermissionError = (error: unknown) =>
  error instanceof Error &&
  (error.message.includes('401') ||
    error.message.includes('403') ||
    /unauthori[sz]ed|authentication required|missing or invalid authorization|invalid access token|permission denied/i.test(
      error.message
    ));

const isNotFoundError = (error: unknown) =>
  error instanceof Error && (error.message.includes('404') || /not found/i.test(error.message));

export const flushQueuedTaskMutations = async (orgId?: string): Promise<{ flushed: number; remaining: number }> => {
  const queue = readQueue();
  if (queue.length === 0) return { flushed: 0, remaining: 0 };

  let flushed = 0;
  const remaining: TaskSyncJob[] = [];

  for (const job of queue) {
    if (orgId && job.orgId !== orgId) {
      remaining.push(job);
      continue;
    }
    try {
      if (job.kind === 'create') {
        await backendSyncService.createTask(job.orgId, job.projectId, job.payload);
      } else if (job.kind === 'update') {
        await backendSyncService.updateTask(job.orgId, job.projectId, job.taskId, job.patch);
      } else {
        await backendSyncService.deleteTask(job.orgId, job.projectId, job.taskId);
      }
      flushed += 1;
    } catch (error) {
      if (job.kind === 'delete' && isNotFoundError(error)) {
        flushed += 1;
        continue;
      }
      remaining.push(job);
      if (isAuthOrPermissionError(error)) {
        const untouched = queue.slice(queue.indexOf(job) + 1).filter((item) => !orgId || item.orgId !== orgId);
        writeQueue([...remaining, ...untouched]);
        return { flushed, remaining: remaining.length + untouched.length };
      }
    }
  }

  writeQueue(remaining);
  return { flushed, remaining: remaining.length };
};

export const queuedTaskMutationCount = (orgId?: string): number => {
  const queue = readQueue();
  if (!orgId) return queue.length;
  return queue.filter((job) => job.orgId === orgId).length;
};

export const taskSyncQueueUpdatedEvent = EVENT;
