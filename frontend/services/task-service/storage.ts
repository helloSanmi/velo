import { Task } from '../../types';

export const TASKS_STORAGE_KEY = 'velo_data';

export const getTaskAssigneeIds = (task: Task): string[] => {
  if (Array.isArray(task.assigneeIds) && task.assigneeIds.length > 0) return task.assigneeIds;
  if (task.assigneeId) return [task.assigneeId];
  return [];
};

export const withVersion = (task: Task): Task => ({
  ...task,
  version: Number.isFinite(task.version as number) ? Math.max(1, Number(task.version)) : 1,
  updatedAt: task.updatedAt || task.createdAt || Date.now()
});

export const normalizeTaskForRead = (task: Task): Task =>
  withVersion({
    ...task,
    assigneeIds: getTaskAssigneeIds(task),
    assigneeId: getTaskAssigneeIds(task)[0],
    comments: Array.isArray(task.comments)
      ? task.comments
          .map((comment: any, index: number) => ({
            id: String(comment?.id || `c-${task.id}-${index}`),
            userId: String(comment?.userId || comment?.authorId || task.userId),
            displayName: String(comment?.displayName || comment?.authorName || 'User'),
            text: String(comment?.text || comment?.content || comment?.message || ''),
            timestamp: Number(comment?.timestamp || comment?.createdAt || Date.now())
          }))
          .filter((comment: any) => comment.text.trim().length > 0)
      : [],
    auditLog: Array.isArray(task.auditLog)
      ? task.auditLog
          .map((entry: any, index: number) => ({
            id: String(entry?.id || `a-${task.id}-${index}`),
            userId: String(entry?.userId || entry?.actorId || task.userId),
            displayName: String(entry?.displayName || entry?.actorName || 'System'),
            action: String(entry?.action || entry?.event || ''),
            timestamp: Number(entry?.timestamp || entry?.createdAt || Date.now())
          }))
          .filter((entry: any) => entry.action.trim().length > 0)
      : [],
    subtasks: task.subtasks || [],
    tags: task.tags || [],
    securityGroupIds: Array.isArray(task.securityGroupIds) ? Array.from(new Set(task.securityGroupIds.filter(Boolean))) : [],
    timeLogged: task.timeLogged || 0,
    blockedByIds: task.blockedByIds || [],
    estimateMinutes:
      typeof task.estimateMinutes === 'number' && Number.isFinite(task.estimateMinutes) && task.estimateMinutes > 0
        ? Math.round(task.estimateMinutes)
        : undefined,
    estimateProvidedBy: task.estimateProvidedBy || task.userId,
    estimateProvidedAt: task.estimateProvidedAt || task.createdAt || Date.now(),
    actualMinutes:
      typeof task.actualMinutes === 'number' && Number.isFinite(task.actualMinutes) && task.actualMinutes > 0
        ? Math.round(task.actualMinutes)
        : undefined
  });

export const readStoredTasks = (): Task[] => {
  const data = localStorage.getItem(TASKS_STORAGE_KEY);
  return data ? JSON.parse(data) : [];
};

export const writeStoredTasks = (tasks: Task[]) => {
  localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
};
