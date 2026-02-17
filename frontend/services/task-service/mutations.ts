import { Comment, Task, TaskPriority, TaskStatus } from '../../types';
import { createId } from '../../utils/id';
import { estimationService } from '../estimationService';
import { groupService } from '../groupService';
import { notificationService } from '../notificationService';
import { projectService } from '../projectService';
import { syncGuardService } from '../syncGuardService';
import { userService } from '../userService';
import { getTasksForViewer } from './query';
import { emitTasksUpdated, syncTaskCreateToBackend, syncTaskDeleteToBackend, syncTaskToBackend } from './sync';
import {
  createAuditEntry,
  formatDuration,
  isAdminOrLeadMention,
  isDoneStatusForProject,
  resolveActorDisplayName,
  stageLabel,
  buildUpdateAuditActions
} from './taskHelpers';
import { getTaskAssigneeIds, readStoredTasks, TASKS_STORAGE_KEY, writeStoredTasks } from './storage';

export const createTaskMutation = (
  userId: string,
  orgId: string,
  projectId: string,
  title: string,
  description: string,
  priority: TaskPriority,
  tags: string[] = [],
  dueDate?: number,
  assigneeIds: string[] = [],
  securityGroupIds: string[] = [],
  estimateMinutes?: number,
  estimateProvidedBy?: string,
  creationAuditAction?: string
): Task => {
  const allTasks = readStoredTasks();
  const maxOrder = allTasks.length > 0 ? Math.max(...allTasks.map((task) => task.order)) : 0;
  const allUsers = userService.getUsers(orgId);
  const allProjects = projectService.getProjects(orgId);
  const resolvedAssignments = groupService.resolveAssigneeIdsFromGroups(
    orgId,
    projectId || 'general',
    assigneeIds,
    securityGroupIds,
    allUsers,
    allProjects
  );
  const normalizedAssigneeIds = resolvedAssignments.assigneeIds;
  const project = projectService.getProjects(orgId).find((item) => item.id === projectId);
  const defaultStage = project?.stages?.[0]?.id || TaskStatus.TODO;
  const actorDisplayName = resolveActorDisplayName(orgId, userId);

  const newTask: Task = {
    id: createId(),
    orgId,
    userId,
    assigneeId: normalizedAssigneeIds[0],
    assigneeIds: normalizedAssigneeIds,
    securityGroupIds: resolvedAssignments.securityGroupIds,
    projectId: projectId || 'general',
    title,
    description,
    status: defaultStage,
    priority,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    version: 1,
    order: maxOrder + 1,
    subtasks: [],
    tags,
    dueDate,
    comments: [],
    auditLog: [
      {
        id: createId(),
        userId,
        displayName: actorDisplayName,
        action: 'created this task',
        timestamp: Date.now()
      },
      ...(creationAuditAction?.trim()
        ? [
            {
              id: createId(),
              userId,
              displayName: actorDisplayName,
              action: creationAuditAction.trim(),
              timestamp: Date.now()
            }
          ]
        : [])
    ],
    timeLogged: 0,
    blockedByIds: [],
    estimateMinutes: estimateMinutes && estimateMinutes > 0 ? Math.round(estimateMinutes) : undefined,
    estimateProvidedBy: estimateProvidedBy || userId,
    estimateProvidedAt: estimateMinutes && estimateMinutes > 0 ? Date.now() : undefined
  };

  writeStoredTasks([...allTasks, newTask]);
  syncTaskCreateToBackend(orgId, newTask);
  syncGuardService.markLocalMutation();
  estimationService.recomputeOrgProfiles(orgId, [...allTasks, newTask]);
  emitTasksUpdated(orgId, userId, newTask.id);
  normalizedAssigneeIds.forEach((assigneeId) =>
    notificationService.addNotification({
      orgId,
      userId: assigneeId,
      title: 'Node Provisioned',
      message: `Assigned: ${title}`,
      type: 'ASSIGNMENT',
      category: 'assigned',
      urgent: priority === TaskPriority.HIGH,
      linkId: newTask.id
    })
  );
  return newTask;
};

export const updateTaskMutation = (
  userId: string,
  orgId: string,
  id: string,
  updates: Partial<Omit<Task, 'id' | 'userId' | 'createdAt' | 'order'>>,
  displayName?: string
): Task[] => {
  const allTasks = readStoredTasks();
  let notifyAssigneeIds: string[] = [];
  let notifyUnassignedIds: string[] = [];
  let notifyTaskTitle = '';
  let completedTaskNotifyIds: string[] = [];
  let becameCompleted = false;
  const actorDisplayName = resolveActorDisplayName(orgId, userId, displayName);

  const updatedTasks = allTasks.map((task) => {
    if (task.id !== id) return task;
    const previousAssignees = getTaskAssigneeIds(task);
    const normalizedUpdates: Partial<Omit<Task, 'id' | 'userId' | 'createdAt' | 'order'>> = { ...updates };

    const allUsers = userService.getUsers(orgId);
    const allProjects = projectService.getProjects(orgId);
    const hasAssigneeUpdates =
      Array.isArray(normalizedUpdates.assigneeIds) || typeof normalizedUpdates.assigneeId === 'string';
    const hasGroupUpdates = Array.isArray(normalizedUpdates.securityGroupIds);

    if (hasAssigneeUpdates || hasGroupUpdates) {
      const nextDirectAssigneeIds = Array.isArray(normalizedUpdates.assigneeIds)
        ? normalizedUpdates.assigneeIds
        : typeof normalizedUpdates.assigneeId === 'string'
          ? normalizedUpdates.assigneeId
            ? [normalizedUpdates.assigneeId]
            : []
          : previousAssignees;
      const nextGroupIds = Array.isArray(normalizedUpdates.securityGroupIds)
        ? normalizedUpdates.securityGroupIds
        : Array.isArray(task.securityGroupIds)
          ? task.securityGroupIds
          : [];
      const resolvedAssignments = groupService.resolveAssigneeIdsFromGroups(
        orgId,
        task.projectId,
        nextDirectAssigneeIds,
        nextGroupIds,
        allUsers,
        allProjects
      );
      normalizedUpdates.assigneeIds = resolvedAssignments.assigneeIds;
      normalizedUpdates.assigneeId = resolvedAssignments.assigneeIds[0];
      normalizedUpdates.securityGroupIds = resolvedAssignments.securityGroupIds;
    }

    const nextAssignees = Array.isArray(normalizedUpdates.assigneeIds)
      ? normalizedUpdates.assigneeIds
      : previousAssignees;
    notifyAssigneeIds = nextAssignees.filter((assigneeId) => !previousAssignees.includes(assigneeId));
    notifyUnassignedIds = previousAssignees.filter((assigneeId) => !nextAssignees.includes(assigneeId));
    if (notifyAssigneeIds.length > 0 || notifyUnassignedIds.length > 0) {
      notifyTaskTitle = normalizedUpdates.title || task.title;
    }

    const nextStatus = typeof normalizedUpdates.status === 'string' ? normalizedUpdates.status : task.status;
    const wasDone = isDoneStatusForProject(orgId, task.projectId, task.status);
    const nowDone = isDoneStatusForProject(orgId, task.projectId, nextStatus);
    if (!wasDone && nowDone) {
      becameCompleted = true;
      const baselineRecipients = new Set<string>([...getTaskAssigneeIds(task), task.userId]);
      baselineRecipients.delete(userId);
      completedTaskNotifyIds = Array.from(baselineRecipients);
    }

    const auditLog = [...(task.auditLog || [])];
    const auditActions = buildUpdateAuditActions(task, normalizedUpdates, orgId);
    auditActions.forEach((action) => auditLog.push(createAuditEntry(userId, actorDisplayName, action)));

    const completedAt = isDoneStatusForProject(orgId, task.projectId, nextStatus)
      ? task.completedAt || Date.now()
      : task.completedAt;
    const actualMinutes = isDoneStatusForProject(orgId, task.projectId, nextStatus)
      ? Math.max(
          1,
          Math.round(
            ((typeof normalizedUpdates.timeLogged === 'number' ? normalizedUpdates.timeLogged : task.timeLogged) || 0) /
              60000
          )
        )
      : task.actualMinutes;
    const estimateProvidedBy =
      typeof normalizedUpdates.estimateMinutes === 'number'
        ? normalizedUpdates.estimateProvidedBy || userId
        : task.estimateProvidedBy;
    const estimateProvidedAt =
      typeof normalizedUpdates.estimateMinutes === 'number' ? Date.now() : task.estimateProvidedAt;

    return {
      ...task,
      ...normalizedUpdates,
      estimateProvidedBy,
      estimateProvidedAt,
      completedAt,
      actualMinutes,
      auditLog,
      updatedAt: Date.now(),
      version: (task.version || 1) + 1
    };
  });

  writeStoredTasks(updatedTasks);
  const updatedTask = updatedTasks.find((task) => task.id === id);
  if (updatedTask) syncTaskToBackend(orgId, updatedTask, updates);
  syncGuardService.markLocalMutation();
  estimationService.recomputeOrgProfiles(orgId, updatedTasks);
  emitTasksUpdated(orgId, userId, id);

  if (notifyAssigneeIds.length > 0) {
    notifyAssigneeIds.forEach((notifyUserId) => {
      notificationService.addNotification({
        orgId,
        userId: notifyUserId,
        title: 'Node Recalibrated',
        message: `Assigned: ${notifyTaskTitle}`,
        type: 'ASSIGNMENT',
        category: 'assigned',
        urgent: updatedTask?.priority === TaskPriority.HIGH,
        linkId: id
      });
    });
  }
  if (notifyUnassignedIds.length > 0) {
    notifyUnassignedIds.forEach((notifyUserId) => {
      notificationService.addNotification({
        orgId,
        userId: notifyUserId,
        title: 'Assignment updated',
        message: `Unassigned: ${notifyTaskTitle}`,
        type: 'SYSTEM',
        category: 'assigned',
        urgent: false,
        linkId: id
      });
    });
  }
  if (becameCompleted && completedTaskNotifyIds.length > 0 && updatedTask) {
    completedTaskNotifyIds.forEach((notifyUserId) => {
      notificationService.addNotification({
        orgId,
        userId: notifyUserId,
        title: 'Task completed',
        message: `"${updatedTask.title}" was marked done.`,
        type: 'SYSTEM',
        category: 'completed',
        urgent: updatedTask.priority === TaskPriority.HIGH,
        linkId: id
      });
    });
  }

  return getTasksForViewer(userId, orgId);
};

export const toggleTimerMutation = (userId: string, orgId: string, id: string): Task[] => {
  const allTasks = readStoredTasks();
  const actorDisplayName = resolveActorDisplayName(orgId, userId);
  let updatedTaskForSync: Task | undefined;

  const updatedTasks = allTasks.map((task) => {
    if (task.id !== id) return task;
    const auditLog = [...(task.auditLog || [])];
    if (task.isTimerRunning) {
      const sessionTime = Date.now() - (task.timerStartedAt || Date.now());
      auditLog.push(createAuditEntry(userId, actorDisplayName, `stopped timer (+${formatDuration(sessionTime)})`));
      const nextTask = {
        ...task,
        isTimerRunning: false,
        timeLogged: (task.timeLogged || 0) + sessionTime,
        timerStartedAt: undefined,
        updatedAt: Date.now(),
        version: (task.version || 1) + 1,
        auditLog
      };
      updatedTaskForSync = nextTask;
      return nextTask;
    }
    auditLog.push(createAuditEntry(userId, actorDisplayName, 'started timer'));
    const nextTask = {
      ...task,
      isTimerRunning: true,
      timerStartedAt: Date.now(),
      updatedAt: Date.now(),
      version: (task.version || 1) + 1,
      auditLog
    };
    updatedTaskForSync = nextTask;
    return nextTask;
  });

  writeStoredTasks(updatedTasks);
  if (updatedTaskForSync) {
    syncTaskToBackend(orgId, updatedTaskForSync, undefined, {
      timeLoggedMs: typeof updatedTaskForSync.timeLogged === 'number' ? updatedTaskForSync.timeLogged : 0,
      isTimerRunning: Boolean(updatedTaskForSync.isTimerRunning),
      timerStartedAt: updatedTaskForSync.timerStartedAt ?? null,
      auditLog: Array.isArray(updatedTaskForSync.auditLog)
        ? (updatedTaskForSync.auditLog as unknown as Record<string, unknown>[])
        : []
    });
  }
  syncGuardService.markLocalMutation();
  estimationService.recomputeOrgProfiles(orgId, updatedTasks);
  emitTasksUpdated(orgId, userId, id);
  return getTasksForViewer(userId, orgId);
};

export const addCommentMutation = (
  userId: string,
  orgId: string,
  taskId: string,
  text: string,
  displayName: string
): Task[] => {
  const allTasks = readStoredTasks();
  const actorDisplayName = resolveActorDisplayName(orgId, userId, displayName);
  const orgUsers = userService.getUsers(orgId);
  const updatedTasks = allTasks.map((task) => {
    if (task.id !== taskId) return task;
    const newComment: Comment = {
      id: createId(),
      userId,
      displayName: actorDisplayName,
      text,
      timestamp: Date.now()
    };
    const notifyAssigneeIds = getTaskAssigneeIds(task).filter((assigneeId) => assigneeId !== userId);
    const mentionNames = Array.from(
      new Set(
        [...text.matchAll(/@\[(.+?)\]/g)]
          .map((match) => match[1]?.trim())
          .filter((name): name is string => Boolean(name))
      )
    );
    const mentionedUserIds = mentionNames
      .map((name) =>
        orgUsers.find((user) => user.displayName.toLowerCase() === name.toLowerCase())?.id
      )
      .filter((id): id is string => Boolean(id))
      .filter((id) => id !== userId);

    if (notifyAssigneeIds.length > 0) {
      const containsMention = /@\[[^\]]+\]|(^|\s)@\w+/.test(text);
      const mentionFromLead = containsMention && isAdminOrLeadMention(orgId, userId);
      notifyAssigneeIds.forEach((assigneeId) => {
        notificationService.addNotification({
          orgId,
          userId: assigneeId,
          title: 'Velo Transmission',
          message: `${actorDisplayName} commented on "${task.title}"`,
          type: 'SYSTEM',
          category: 'comment',
          mentionFromLead,
          linkId: `${taskId}#comments`
        });
      });
    }
    if (mentionedUserIds.length > 0) {
      const uniqueMentioned = Array.from(new Set(mentionedUserIds));
      uniqueMentioned.forEach((mentionedId) => {
        notificationService.addNotification({
          orgId,
          userId: mentionedId,
          title: 'You were mentioned',
          message: `${actorDisplayName} mentioned you on "${task.title}"`,
          type: 'SYSTEM',
          category: 'comment',
          mentionFromLead: isAdminOrLeadMention(orgId, userId),
          linkId: `${taskId}#comments`
        });
      });
    }
    return {
      ...task,
      comments: [...(task.comments || []), newComment],
      auditLog: [...(task.auditLog || []), createAuditEntry(userId, actorDisplayName, 'added a comment')],
      updatedAt: Date.now(),
      version: (task.version || 1) + 1
    };
  });
  writeStoredTasks(updatedTasks);
  const updatedTask = updatedTasks.find((task) => task.id === taskId);
  if (updatedTask) {
    syncTaskToBackend(orgId, updatedTask, undefined, {
      comments: Array.isArray(updatedTask.comments) ? (updatedTask.comments as unknown as Record<string, unknown>[]) : [],
      auditLog: Array.isArray(updatedTask.auditLog) ? (updatedTask.auditLog as unknown as Record<string, unknown>[]) : []
    });
  }
  syncGuardService.markLocalMutation();
  estimationService.recomputeOrgProfiles(orgId, updatedTasks);
  emitTasksUpdated(orgId, userId, taskId);
  return getTasksForViewer(userId, orgId);
};

export const appendAuditEntryMutation = (
  userId: string,
  orgId: string,
  taskId: string,
  action: string,
  displayName?: string
): Task[] => {
  if (!action.trim()) return getTasksForViewer(userId, orgId);
  const allTasks = readStoredTasks();
  const actorDisplayName = resolveActorDisplayName(orgId, userId, displayName);
  const updatedTasks = allTasks.map((task) => {
    if (task.id !== taskId) return task;
    return {
      ...task,
      auditLog: [...(task.auditLog || []), createAuditEntry(userId, actorDisplayName, action.trim())],
      updatedAt: Date.now(),
      version: (task.version || 1) + 1
    };
  });
  writeStoredTasks(updatedTasks);
  const updatedTask = updatedTasks.find((task) => task.id === taskId);
  if (updatedTask) {
    syncTaskToBackend(orgId, updatedTask, undefined, {
      auditLog: Array.isArray(updatedTask.auditLog) ? (updatedTask.auditLog as unknown as Record<string, unknown>[]) : []
    });
  }
  syncGuardService.markLocalMutation();
  emitTasksUpdated(orgId, userId, taskId);
  return getTasksForViewer(userId, orgId);
};

export const deleteTaskMutation = (userId: string, orgId: string, id: string): Task[] => {
  const allTasks = readStoredTasks();
  const target = allTasks.find((task) => task.id === id);
  const updated = allTasks.filter((task) => task.id !== id);
  writeStoredTasks(updated);
  if (target) syncTaskDeleteToBackend(orgId, target);
  syncGuardService.markLocalMutation();
  estimationService.recomputeOrgProfiles(orgId, updated);
  emitTasksUpdated(orgId, userId, id);
  return getTasksForViewer(userId, orgId);
};

export const deleteTasksByProjectMutation = (userId: string, orgId: string, projectId: string): Task[] => {
  const allTasks = readStoredTasks();
  const updated = allTasks.filter((task) => task.projectId !== projectId);
  writeStoredTasks(updated);
  syncGuardService.markLocalMutation();
  estimationService.recomputeOrgProfiles(orgId, updated);
  emitTasksUpdated(orgId, userId);
  return getTasksForViewer(userId, orgId);
};

export const reorderTasksMutation = (
  orgId: string,
  reorderedTasks: Task[],
  actorId?: string,
  actorDisplayName?: string
): void => {
  const allTasks = readStoredTasks();
  const actorName = actorId ? resolveActorDisplayName(orgId, actorId, actorDisplayName) : 'System';
  const visibleTaskIds = reorderedTasks.map((task) => task.id);
  const hiddenTasks = allTasks.filter((task) => !visibleTaskIds.includes(task.id));
  const previousById = new Map(allTasks.map((task) => [task.id, task]));

  writeStoredTasks([
    ...hiddenTasks,
    ...reorderedTasks.map((task) => {
      const previous = previousById.get(task.id);
      const statusChanged = previous && previous.status !== task.status;
      const auditLog = [...(task.auditLog || [])];
      if (statusChanged) {
        auditLog.push(createAuditEntry(actorId || 'system', actorName, `moved task to ${stageLabel(task.status)}`));
      }
      const completedAt = isDoneStatusForProject(orgId, task.projectId, task.status)
        ? task.completedAt || Date.now()
        : task.completedAt;
      const actualMinutes = isDoneStatusForProject(orgId, task.projectId, task.status)
        ? Math.max(1, Math.round((task.timeLogged || 0) / 60000))
        : task.actualMinutes;
      return {
        ...task,
        completedAt,
        actualMinutes,
        auditLog,
        updatedAt: Date.now(),
        version: (task.version || 1) + 1
      };
    })
  ]);
  reorderedTasks.forEach((task) => {
    const previous = previousById.get(task.id);
    if (!previous) return;
    if (previous.status !== task.status) {
      syncTaskToBackend(orgId, task, undefined, {
        status: task.status,
        auditLog: Array.isArray(task.auditLog) ? (task.auditLog as unknown as Record<string, unknown>[]) : []
      });
    }
  });
  syncGuardService.markLocalMutation();
  estimationService.recomputeOrgProfiles(orgId, [...hiddenTasks, ...reorderedTasks]);
  emitTasksUpdated(orgId);
};

export const clearTasksData = () => {
  localStorage.removeItem(TASKS_STORAGE_KEY);
};
