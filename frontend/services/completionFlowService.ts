import { Project, Task } from '../types';

const normalize = (value?: string) => (value || '').toLowerCase().trim();

export const isTaskInFinalStage = (task: Task, finalStageId: string, finalStageName?: string) => {
  const normalizedStatus = normalize(String(task.status));
  const normalizedFinalId = normalize(finalStageId);
  const normalizedFinalName = normalize(finalStageName);
  return (
    task.status === finalStageId ||
    normalizedStatus === normalizedFinalId ||
    (normalizedFinalName ? normalizedStatus === normalizedFinalName : false) ||
    normalizedStatus === 'done' ||
    normalizedStatus === 'completed'
  );
};

export const areAllTasksInFinalStage = (tasks: Task[], finalStageId: string, finalStageName?: string) =>
  tasks.length > 0 && tasks.every((task) => isTaskInFinalStage(task, finalStageId, finalStageName));

export const hasTasksOutsideFinalStage = (tasks: Task[], finalStageId: string, finalStageName?: string) =>
  tasks.some((task) => !isTaskInFinalStage(task, finalStageId, finalStageName));

export const getCompletionActionLabel = (canManageProject: boolean) =>
  canManageProject ? 'Finish project' : 'Request approval';

export const isProjectLockedForCompletionApproval = (params: {
  completionRequestedAt?: number;
  completionRequestedById?: string;
}) => {
  const { completionRequestedAt, completionRequestedById } = params;
  return Boolean(completionRequestedAt) && Boolean(completionRequestedById);
};

export const shouldEnforceCompletionApprovalLock = (params: {
  completionRequestedAt?: number;
  completionRequestedById?: string;
  isArchived?: boolean;
  isCompleted?: boolean;
  isDeleted?: boolean;
  tasks: Task[];
  finalStageId: string;
  finalStageName?: string;
}) => {
  const {
    completionRequestedAt,
    completionRequestedById,
    isArchived,
    isCompleted,
    isDeleted,
    tasks,
    finalStageId,
    finalStageName
  } = params;
  if (!completionRequestedAt || !completionRequestedById) return false;
  if (isArchived || isCompleted || isDeleted) return false;
  if (tasks.length === 0) return false;
  return areAllTasksInFinalStage(tasks, finalStageId, finalStageName);
};

export const getCompletionPromptMode = (params: {
  canManageProject: boolean;
  currentUserId: string;
  completionRequestedAt?: number;
  completionRequestedById?: string;
}): 'direct' | 'request' | 'approve' => {
  const { canManageProject, currentUserId, completionRequestedAt, completionRequestedById } = params;
  const shouldApprove =
    Boolean(completionRequestedAt) &&
    Boolean(completionRequestedById) &&
    canManageProject &&
    completionRequestedById !== currentUserId;
  if (shouldApprove) return 'approve';
  return canManageProject ? 'direct' : 'request';
};

export const shouldShowCompletionPostponed = (params: {
  hasDismissedSignature: boolean;
  isArchived?: boolean;
  isCompleted?: boolean;
  isDeleted?: boolean;
  tasks: Task[];
  finalStageId: string;
  finalStageName?: string;
}) => {
  const { hasDismissedSignature, isArchived, isCompleted, isDeleted, tasks, finalStageId, finalStageName } = params;
  if (!hasDismissedSignature) return false;
  if (isArchived || isCompleted || isDeleted) return false;
  if (tasks.length === 0) return false;
  if (tasks.some((task) => Boolean(task.isTimerRunning))) return false;
  return areAllTasksInFinalStage(tasks, finalStageId, finalStageName);
};

export const shouldAutoOpenCompletionPrompt = (params: {
  latestFinalMoveActorId?: string;
  currentUserId: string;
  canManageProject: boolean;
  completionRequestedById?: string;
}) => {
  const { latestFinalMoveActorId, currentUserId, canManageProject, completionRequestedById } = params;
  if (!latestFinalMoveActorId) return false;
  if (latestFinalMoveActorId === currentUserId) return true;
  return canManageProject && completionRequestedById === currentUserId;
};

export const pickTaskToMoveBackOnRejection = (params: {
  tasks: Task[];
  finalStageId: string;
  finalStageName?: string;
  requesterId?: string;
}): Task | undefined => {
  const { tasks, finalStageId, finalStageName, requesterId } = params;
  const finalStageTasks = tasks.filter((task) => isTaskInFinalStage(task, finalStageId, finalStageName));
  if (finalStageTasks.length === 0) return undefined;

  const normalizedFinalTokens = new Set(
    [finalStageId, finalStageName || '', finalStageId.replace(/-/g, ' ')]
      .map((value) =>
        value
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
      )
      .filter(Boolean)
  );

  const scoreTask = (task: Task) => {
    let latest = 0;
    (task.auditLog || []).forEach((entry) => {
      const action = (entry.action || '').toLowerCase().trim();
      if (!action.startsWith('moved task to ')) return;
      if (requesterId && entry.userId !== requesterId) return;
      const movedTo = action.replace('moved task to ', '').trim();
      const normalized = movedTo.replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
      const isFinal = Array.from(normalizedFinalTokens).some((token) => normalized === token || normalized.endsWith(token));
      if (!isFinal) return;
      if (entry.timestamp > latest) latest = entry.timestamp;
    });
    return latest || task.updatedAt || task.createdAt || 0;
  };

  return [...finalStageTasks].sort((a, b) => scoreTask(b) - scoreTask(a))[0];
};

export const getStalePendingApprovalProjectIds = (projects: Project[], tasks: Task[]): string[] =>
  projects
    .filter((project) => {
      if (!project.completionRequestedAt || !project.completionRequestedById) return false;
      if (project.isArchived || project.isCompleted || project.isDeleted) return false;
      const projectTasks = tasks.filter((task) => task.projectId === project.id);
      if (projectTasks.length === 0) return false;
      const finalStageId = project.stages?.length ? project.stages[project.stages.length - 1].id : 'done';
      const finalStageName = project.stages?.length ? project.stages[project.stages.length - 1].name : 'Done';
      return hasTasksOutsideFinalStage(projectTasks, finalStageId, finalStageName);
    })
    .map((project) => project.id);

export const getReopenReleaseProjectIds = (projects: Project[], tasks: Task[]): string[] =>
  projects
    .filter((project) => {
      if (!project.reopenedById && !project.reopenedAt) return false;
      if (project.isArchived || project.isCompleted || project.isDeleted) return false;
      const projectTasks = tasks.filter((task) => task.projectId === project.id);
      if (projectTasks.length === 0) return false;
      const finalStageId = project.stages?.length ? project.stages[project.stages.length - 1].id : 'done';
      const finalStageName = project.stages?.length ? project.stages[project.stages.length - 1].name : 'Done';
      return hasTasksOutsideFinalStage(projectTasks, finalStageId, finalStageName);
    })
    .map((project) => project.id);

export const computeCompletionPromptResetState = (params: {
  projects: Project[];
  previousLifecycle: Record<string, 'active' | 'completed' | 'archived' | 'deleted'>;
  previousPendingApproval: Record<string, boolean>;
  previousCutoff: Record<string, number>;
  now?: number;
}) => {
  const { projects, previousLifecycle, previousPendingApproval, previousCutoff, now = Date.now() } = params;
  const nextLifecycle: Record<string, 'active' | 'completed' | 'archived' | 'deleted'> = {};
  const nextPendingApproval: Record<string, boolean> = {};
  const nextCutoff = { ...previousCutoff };

  projects.forEach((project) => {
    const lifecycle: 'active' | 'completed' | 'archived' | 'deleted' =
      project.isDeleted ? 'deleted' : project.isArchived ? 'archived' : project.isCompleted ? 'completed' : 'active';
    nextLifecycle[project.id] = lifecycle;

    const pendingApproval = Boolean(project.completionRequestedAt && project.completionRequestedById);
    nextPendingApproval[project.id] = pendingApproval;

    const previous = previousLifecycle[project.id];
    if (previous && previous !== 'active' && lifecycle === 'active') {
      const resetAt = project.reopenedAt || project.updatedAt || now;
      nextCutoff[project.id] = Math.max(nextCutoff[project.id] || 0, resetAt);
    }

    const previousPending = previousPendingApproval[project.id];
    if (previousPending && !pendingApproval) {
      const resetAt = project.updatedAt || now;
      nextCutoff[project.id] = Math.max(nextCutoff[project.id] || 0, resetAt);
    }
  });

  return {
    nextLifecycle,
    nextPendingApproval,
    nextCutoff: Object.fromEntries(
      Object.entries(nextCutoff).filter(([projectId]) => Boolean(nextLifecycle[projectId]))
    )
  };
};
