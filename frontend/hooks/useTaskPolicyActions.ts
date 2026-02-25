import { useMemo, useState } from 'react';
import { Task, TaskPriority, TaskStatus, User, Project } from '../types';
import { toastService } from '../services/toastService';
import { dialogService } from '../services/dialogService';
import { estimationService } from '../services/estimationService';
import { isTaskAssignedToUser } from '../services/permissionService';
import { DEFAULT_PROJECT_STAGES } from '../services/projectService';
import { shouldEnforceCompletionApprovalLock } from '../services/completionFlowService';

interface UseTaskPolicyActionsParams {
  user: User;
  tasks: Task[];
  projects: Project[];
  ensureTaskPermission: (taskId: string, action: 'complete' | 'rename' | 'delete' | 'assign') => boolean;
  canManageProject: (project?: Project) => boolean;
  moveTask: (taskId: string, targetStatus: string, targetTaskId?: string) => void;
  updateStatus: (id: string, status: string, username?: string) => void;
  updateTask: (
    id: string,
    updates: Partial<Omit<Task, 'id' | 'userId' | 'createdAt' | 'order'>>,
    username?: string
  ) => void;
  addComment: (taskId: string, text: string) => void;
  deleteTask: (id: string) => void;
  toggleTimer: (id: string) => void;
  createTask: (
    title: string,
    description: string,
    priority: TaskPriority,
    tags?: string[],
    dueDate?: number,
    projectId?: string,
    assigneeIds?: string[],
    securityGroupIds?: string[],
    estimateMinutes?: number,
    estimateProvidedBy?: string,
    creationAuditAction?: string
  ) => void;
}

export const useTaskPolicyActions = ({
  user,
  tasks,
  projects,
  ensureTaskPermission,
  canManageProject,
  moveTask,
  updateStatus,
  updateTask,
  addComment,
  deleteTask,
  toggleTimer,
  createTask
}: UseTaskPolicyActionsParams) => {
  const emitFinalStageMove = (projectId: string) => {
    window.dispatchEvent(
      new CustomEvent('projectFinalStageTaskMoved', {
        detail: {
          projectId,
          actorId: user.id,
          timestamp: Date.now()
        }
      })
    );
  };
  const [moveBackRequest, setMoveBackRequest] = useState<{ taskId: string; targetStatus: string; targetTaskId?: string } | null>(null);
  const [moveBackReason, setMoveBackReason] = useState('');
  const [moveBackReasonError, setMoveBackReasonError] = useState('');

  const updateMoveBackReason = (value: string) => {
    setMoveBackReason(value);
    if (moveBackReasonError) setMoveBackReasonError('');
  };

  const getProjectDoneStageId = (projectId: string) => {
    const project = projects.find((item) => item.id === projectId);
    return project?.stages?.length ? project.stages[project.stages.length - 1].id : TaskStatus.DONE;
  };

  const getProjectStages = (projectId: string) => {
    const project = projects.find((item) => item.id === projectId);
    return project?.stages?.length ? project.stages : DEFAULT_PROJECT_STAGES;
  };

  const getStageIndex = (projectId: string, stageId: string) => {
    return getProjectStages(projectId).findIndex((stage) => stage.id === stageId);
  };

  const getStageName = (projectId: string, stageId: string) => {
    const stage = getProjectStages(projectId).find((item) => item.id === stageId);
    return stage?.name || stageId;
  };

  const getDependencyBlockMessage = (task: Task, targetStatus: string) => {
    const dependencyIds = Array.isArray(task.blockedByIds) ? task.blockedByIds : [];
    if (dependencyIds.length === 0) return null;
    const targetStageIndex = getStageIndex(task.projectId, targetStatus);
    if (targetStageIndex < 0) return null;
    const dependencyTasks = dependencyIds
      .map((dependencyId) => tasks.find((item) => item.id === dependencyId))
      .filter((dependency): dependency is Task => Boolean(dependency));

    for (const dependencyTask of dependencyTasks) {
      if (dependencyTask.projectId !== task.projectId) continue;
      const dependencyStageIndex = getStageIndex(task.projectId, dependencyTask.status);
      if (dependencyStageIndex < 0) continue;
      if (targetStageIndex > dependencyStageIndex) {
        return `Blocked by "${dependencyTask.title}" in ${getStageName(task.projectId, dependencyTask.status)}. Move dependency forward first.`;
      }
    }
    return null;
  };

  const buildProspectiveDependencyMap = (
    taskId: string,
    nextBlockedByIds: string[]
  ): Map<string, string[]> => {
    const graph = new Map<string, string[]>();
    tasks.forEach((item) => {
      graph.set(
        item.id,
        item.id === taskId ? nextBlockedByIds : (Array.isArray(item.blockedByIds) ? item.blockedByIds : [])
      );
    });
    return graph;
  };

  const createsDependencyCycle = (taskId: string, nextBlockedByIds: string[]) => {
    const graph = buildProspectiveDependencyMap(taskId, nextBlockedByIds);
    const visited = new Set<string>();
    const inStack = new Set<string>();

    const dfs = (nodeId: string): boolean => {
      if (inStack.has(nodeId)) return true;
      if (visited.has(nodeId)) return false;
      visited.add(nodeId);
      inStack.add(nodeId);
      const edges = graph.get(nodeId) || [];
      for (const edge of edges) {
        if (dfs(edge)) return true;
      }
      inStack.delete(nodeId);
      return false;
    };

    return dfs(taskId);
  };

  const validateDependencyUpdate = (task: Task, proposedBlockedByIds: string[]) => {
    const deduped = Array.from(new Set(proposedBlockedByIds.filter(Boolean)));
    if (deduped.length !== proposedBlockedByIds.length) {
      return 'Duplicate dependencies are not allowed.';
    }
    if (deduped.includes(task.id)) {
      return 'A task cannot depend on itself.';
    }
    const dependencyTasks = deduped.map((id) => tasks.find((item) => item.id === id));
    if (dependencyTasks.some((item) => !item)) {
      return 'One or more dependencies no longer exist. Refresh and try again.';
    }
    if (dependencyTasks.some((item) => item!.projectId !== task.projectId)) {
      return 'Dependencies must be within the same project.';
    }
    if (createsDependencyCycle(task.id, deduped)) {
      return 'Dependency loop detected. This would create a circular dependency.';
    }
    return null;
  };

  const isAssignedActor = (task?: Task) => {
    return isTaskAssignedToUser(user, task);
  };

  const canActOnTask = (task?: Task) => {
    if (!task) return false;
    const project = projects.find((item) => item.id === task.projectId);
    return isAssignedActor(task) || canManageProject(project);
  };

  const isReadOnlyPublicViewerForProject = (project?: Project) => {
    if (!project) return false;
    if (!project.isPublic) return false;
    if (canManageProject(project)) return false;
    const isMember = Array.isArray(project.members) && project.members.includes(user.id);
    return !isMember;
  };

  const isProjectApprovalLocked = (projectId: string) => {
    const project = projects.find((item) => item.id === projectId);
    if (!project) return false;
    const finalStageId = project.stages?.length ? project.stages[project.stages.length - 1].id : TaskStatus.DONE;
    const finalStageName = project.stages?.length ? project.stages[project.stages.length - 1].name : 'Done';
    const projectTasks = tasks.filter((task) => task.projectId === projectId);
    return shouldEnforceCompletionApprovalLock({
      completionRequestedAt: project.completionRequestedAt,
      completionRequestedById: project.completionRequestedById,
      isArchived: project.isArchived,
      isCompleted: project.isCompleted,
      isDeleted: project.isDeleted,
      tasks: projectTasks,
      finalStageId,
      finalStageName
    });
  };

  const ensureProjectUnlockedForTaskChange = (projectId: string) => {
    if (!isProjectApprovalLocked(projectId)) return true;
    toastService.info(
      'Project locked for approval',
      'Task changes are locked while completion approval is pending. Wait for owner/admin approval or rejection.'
    );
    return false;
  };

  const requiresApproval = (task: Task, targetStatus: string) => {
    const doneStageId = getProjectDoneStageId(task.projectId);
    return targetStatus === doneStageId && task.priority === TaskPriority.HIGH && !task.approvedAt;
  };

  const ensureDueDateBeforeDone = (task: Task, targetStatus: string, nextDueDate?: number) => {
    const doneStageId = getProjectDoneStageId(task.projectId);
    if (targetStatus !== doneStageId) return true;
    const dueDate = nextDueDate !== undefined ? nextDueDate : task.dueDate;
    if (dueDate) return true;
    const finalStageName = getStageName(task.projectId, doneStageId);
    toastService.warning('Due date required', `Set a due date before moving this task to "${finalStageName}".`);
    return false;
  };

  const requiresEstimateApproval = (task: Task, targetStatus: string) => {
    const doneStageId = getProjectDoneStageId(task.projectId);
    if (targetStatus !== doneStageId) return false;
    if (task.estimateRiskApprovedAt) return false;
    return estimationService.shouldRequireApprovalForDone(task);
  };

  const isBackwardFromDone = (task: Task, targetStatus: string) => {
    const doneStageId = getProjectDoneStageId(task.projectId);
    return task.status === doneStageId && targetStatus !== doneStageId;
  };

  const openMoveBackPrompt = (taskId: string, targetStatus: string, targetTaskId?: string) => {
    setMoveBackRequest({ taskId, targetStatus, targetTaskId });
    setMoveBackReason('');
    setMoveBackReasonError('');
  };

  const handleMoveTaskWithPolicy = (taskId: string, targetStatus: string, targetTaskId?: string) => {
    const task = tasks.find((item) => item.id === taskId);
    if (!task) return;
    if (!ensureProjectUnlockedForTaskChange(task.projectId)) return;
    if (!canActOnTask(task)) {
      toastService.warning('Permission denied', 'Only assigned members, project owners, or admins can move this task.');
      return;
    }
    const doneStageIdForPermission = getProjectDoneStageId(task.projectId);
    if ((targetStatus === doneStageIdForPermission || task.status === doneStageIdForPermission) && !ensureTaskPermission(taskId, 'complete')) return;
    if (!ensureDueDateBeforeDone(task, targetStatus)) return;
    if (requiresApproval(task, targetStatus)) {
      dialogService.notice('This high-priority task requires admin approval before moving to Done.', { title: 'Approval required' });
      return;
    }
    if (requiresEstimateApproval(task, targetStatus)) {
      const project = projects.find((item) => item.id === task.projectId);
      if (!canManageProject(project)) {
        dialogService.notice('Tracked vs planned effort risk is high. Project owner/admin must approve before completion.', { title: 'Estimate approval required' });
        return;
      }
      updateTask(task.id, { estimateRiskApprovedAt: Date.now(), estimateRiskApprovedBy: user.displayName }, user.displayName);
    }
    if (isBackwardFromDone(task, targetStatus)) {
      openMoveBackPrompt(taskId, targetStatus, targetTaskId);
      return;
    }
    const dependencyBlock = getDependencyBlockMessage(task, targetStatus);
    if (dependencyBlock) {
      toastService.warning('Dependency blocked', dependencyBlock);
      return;
    }
    moveTask(taskId, targetStatus, targetTaskId);
    const doneStageId = getProjectDoneStageId(task.projectId);
    if (targetStatus === doneStageId) {
      emitFinalStageMove(task.projectId);
    }
    if (targetStatus === doneStageId && (task.movedBackAt || task.movedBackReason || task.movedBackFromStatus)) {
      updateTask(
        task.id,
        {
          movedBackAt: undefined,
          movedBackBy: undefined,
          movedBackReason: undefined,
          movedBackFromStatus: undefined
        },
        user.displayName
      );
    }
  };

  const handleStatusUpdateWithPolicy = (taskId: string, targetStatus: string) => {
    const task = tasks.find((item) => item.id === taskId);
    if (!task) return;
    if (!ensureProjectUnlockedForTaskChange(task.projectId)) return;
    if (!canActOnTask(task)) {
      toastService.warning('Permission denied', 'Only assigned members, project owners, or admins can update status.');
      return;
    }
    const doneStageIdForPermission = getProjectDoneStageId(task.projectId);
    if ((targetStatus === doneStageIdForPermission || task.status === doneStageIdForPermission) && !ensureTaskPermission(taskId, 'complete')) return;
    if (!ensureDueDateBeforeDone(task, targetStatus)) return;
    if (requiresApproval(task, targetStatus)) {
      dialogService.notice('This high-priority task requires admin approval before moving to Done.', { title: 'Approval required' });
      return;
    }
    if (requiresEstimateApproval(task, targetStatus)) {
      const project = projects.find((item) => item.id === task.projectId);
      if (!canManageProject(project)) {
        dialogService.notice('Tracked vs planned effort risk is high. Project owner/admin must approve before completion.', { title: 'Estimate approval required' });
        return;
      }
      updateTask(task.id, { estimateRiskApprovedAt: Date.now(), estimateRiskApprovedBy: user.displayName }, user.displayName);
    }
    if (isBackwardFromDone(task, targetStatus)) {
      openMoveBackPrompt(taskId, targetStatus);
      return;
    }
    const dependencyBlock = getDependencyBlockMessage(task, targetStatus);
    if (dependencyBlock) {
      toastService.warning('Dependency blocked', dependencyBlock);
      return;
    }
    updateStatus(taskId, targetStatus, user.displayName);
    const doneStageId = getProjectDoneStageId(task.projectId);
    if (targetStatus === doneStageId) {
      emitFinalStageMove(task.projectId);
    }
    if (targetStatus === doneStageId && (task.movedBackAt || task.movedBackReason || task.movedBackFromStatus)) {
      updateTask(
        task.id,
        {
          movedBackAt: undefined,
          movedBackBy: undefined,
          movedBackReason: undefined,
          movedBackFromStatus: undefined
        },
        user.displayName
      );
    }
  };

  const submitMoveBackReason = () => {
    if (!moveBackRequest) return;
    if (!ensureTaskPermission(moveBackRequest.taskId, 'complete')) return;
    const reason = moveBackReason.trim();
    if (!reason) {
      setMoveBackReasonError('A comment is required before moving a completed task backward.');
      return;
    }
    const task = tasks.find((item) => item.id === moveBackRequest.taskId);
    if (!task) {
      setMoveBackRequest(null);
      setMoveBackReason('');
      setMoveBackReasonError('');
      return;
    }
    const fromStatus = task.status;
    updateTask(
      task.id,
      {
        status: moveBackRequest.targetStatus,
        movedBackAt: Date.now(),
        movedBackBy: user.displayName,
        movedBackReason: reason,
        movedBackFromStatus: fromStatus
      },
      user.displayName
    );
    addComment(task.id, `Moved backward from ${fromStatus} to ${moveBackRequest.targetStatus}: ${reason}`);
    toastService.info('Task moved backward', 'Reason saved on task history.');
    setMoveBackRequest(null);
    setMoveBackReason('');
    setMoveBackReasonError('');
  };

  const closeMoveBackPrompt = () => {
    setMoveBackRequest(null);
    setMoveBackReason('');
    setMoveBackReasonError('');
  };

  const handleUpdateTaskWithPolicy = (id: string, updates: Partial<Omit<Task, 'id' | 'userId' | 'createdAt' | 'order'>>) => {
    const task = tasks.find((item) => item.id === id);
    if (!task) return;
    if (!ensureProjectUnlockedForTaskChange(task.projectId)) return;
    const targetProject = projects.find((project) => project.id === task.projectId);
    const canManageTaskData = user.role === 'admin' || canManageProject(targetProject);
    const hasAssignmentUpdate =
      typeof updates.assigneeId === 'string' ||
      Array.isArray(updates.assigneeIds) ||
      Array.isArray(updates.securityGroupIds);
    const hasRenameUpdate = typeof updates.title === 'string' && updates.title !== task.title;
    const hasDescriptionUpdate = typeof updates.description === 'string' && updates.description !== task.description;
    const hasDependencyUpdate = Array.isArray(updates.blockedByIds);
    const hasSubtaskUpdate = Array.isArray(updates.subtasks);
    const hasAuditUpdate = typeof updates.isAtRisk === 'boolean';
    const hasEstimateUpdate =
      typeof updates.estimateMinutes === 'number' ||
      updates.estimateMinutes === undefined ||
      typeof updates.estimateProvidedBy === 'string' ||
      typeof updates.estimateRiskApprovedAt === 'number';
    const hasOwnerRestrictedUpdate =
      hasAssignmentUpdate || hasRenameUpdate || hasDescriptionUpdate || hasDependencyUpdate || hasSubtaskUpdate || hasAuditUpdate || hasEstimateUpdate;

    if (hasOwnerRestrictedUpdate && !canManageTaskData) {
      toastService.warning('Permission denied', 'Only project owners or admins can modify this part of the task.');
      return;
    }

    if (!hasAssignmentUpdate && !hasOwnerRestrictedUpdate && !isAssignedActor(task) && !canManageTaskData) {
      toastService.warning('Permission denied', 'Only assigned members can edit this task.');
      return;
    }
    if (hasAssignmentUpdate && !ensureTaskPermission(id, 'assign')) return;
    if (hasRenameUpdate && !ensureTaskPermission(id, 'rename')) return;
    if (hasDependencyUpdate) {
      const dependencyError = validateDependencyUpdate(task, updates.blockedByIds || []);
      if (dependencyError) {
        toastService.warning('Invalid dependency', dependencyError);
        return;
      }
    }
    if (typeof updates.status === 'string' && updates.status !== task.status) {
      const doneStageId = getProjectDoneStageId(task.projectId);
      if ((updates.status === doneStageId || task.status === doneStageId) && !ensureTaskPermission(id, 'complete')) return;
      if (!ensureDueDateBeforeDone(task, updates.status, updates.dueDate)) return;
      const dependencyBlock = getDependencyBlockMessage(task, updates.status);
      if (dependencyBlock) {
        toastService.warning('Dependency blocked', dependencyBlock);
        return;
      }
    }
    updateTask(id, updates, user.displayName);
  };

  const handleDeleteTaskWithPolicy = async (id: string) => {
    const task = tasks.find((item) => item.id === id);
    if (task && !ensureProjectUnlockedForTaskChange(task.projectId)) return;
    if (!ensureTaskPermission(id, 'delete')) return;
    const confirmed = await dialogService.confirm(`Delete task "${task?.title || 'this task'}"?`, {
      title: 'Delete task',
      confirmText: 'Delete',
      danger: true
    });
    if (!confirmed) return;
    deleteTask(id);
  };

  const handleToggleTimerWithPolicy = (id: string) => {
    const task = tasks.find((item) => item.id === id);
    if (!task) return;
    if (!ensureProjectUnlockedForTaskChange(task.projectId)) return;
    if (!canActOnTask(task)) {
      toastService.warning('Permission denied', 'Only assigned members, project owners, or admins can start or stop timer.');
      return;
    }
    toggleTimer(id);
  };

  const handleCommentOnTaskWithPolicy = (id: string, text: string) => {
    const task = tasks.find((item) => item.id === id);
    if (!task) return;
    const project = projects.find((item) => item.id === task.projectId);
    if (isReadOnlyPublicViewerForProject(project) && !isAssignedActor(task)) {
      toastService.info('Read-only project', 'Public viewers can only comment on tasks they are assigned to.');
      return;
    }
    addComment(id, text);
  };

  const handleCreateTaskWithPolicy = (
    title: string,
    description: string,
    priority: TaskPriority,
    tags: string[] = [],
    dueDate?: number,
    projectId: string = 'p1',
    assigneeIds: string[] = [],
    securityGroupIds: string[] = [],
    estimateMinutes?: number,
    estimateProvidedBy?: string,
    creationAuditAction?: string
  ) => {
    const targetProject = projects.find((project) => project.id === projectId);
    if (isReadOnlyPublicViewerForProject(targetProject)) {
      toastService.info(
        'Read-only project',
        'This public project is read-only for viewers. Only project members/owners/admins can create tasks.'
      );
      return;
    }
    if (isProjectApprovalLocked(projectId)) {
      toastService.info(
        'Project locked for approval',
        'You cannot add tasks while completion approval is pending.'
      );
      return;
    }
    if ((assigneeIds.length > 0 || securityGroupIds.length > 0) && !canManageProject(targetProject)) {
      toastService.warning('Permission denied', 'Only admins or the project creator can assign task members.');
      createTask(title, description, priority, tags, dueDate, projectId, [], [], estimateMinutes, estimateProvidedBy, creationAuditAction);
      return;
    }
    createTask(title, description, priority, tags, dueDate, projectId, assigneeIds, securityGroupIds, estimateMinutes, estimateProvidedBy, creationAuditAction);
  };

  const doneStageIds = useMemo(
    () => new Set(tasks.map((task) => getProjectDoneStageId(task.projectId))),
    [tasks, projects]
  );

  return {
    moveBackRequest,
    moveBackReason,
    moveBackReasonError,
    setMoveBackReason: updateMoveBackReason,
    closeMoveBackPrompt,
    submitMoveBackReason,
    handleMoveTaskWithPolicy,
    handleStatusUpdateWithPolicy,
    handleUpdateTaskWithPolicy,
    handleDeleteTaskWithPolicy,
    handleToggleTimerWithPolicy,
    handleCommentOnTaskWithPolicy,
    handleCreateTaskWithPolicy,
    doneStageIds
  };
};
