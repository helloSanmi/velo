import { useState, useMemo, useCallback, useEffect } from 'react';
import { Task, TaskStatus, TaskPriority, User, Subtask } from '../types';
import { taskService } from '../services/taskService';
import { aiService } from '../services/aiService';
import { historyManager } from '../services/historyService';
import { projectService } from '../services/projectService';
import { toastService } from '../services/toastService';
import { createId } from '../utils/id';
import { categorizeTasks, collectUniqueTags, filterTasks, getDoneStageIds } from './taskFilters';
import { notificationService } from '../services/notificationService';

export const useTasks = (user: User | null, activeProjectId?: string) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[] | null>(null);
  const [activeTaskTitle, setActiveTaskTitle] = useState('');
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [confettiActive, setConfettiActive] = useState(false);
  
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'All'>('All');
  const [statusFilter, setStatusFilter] = useState<string | 'All'>('All');
  const [tagFilter, setTagFilter] = useState<string | 'All'>('All');
  const [assigneeFilter, setAssigneeFilter] = useState<string | 'All'>('All');
  const [projectFilter, setProjectFilter] = useState<string | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [dueStatusFilter, setDueStatusFilter] = useState<'All' | 'Scheduled' | 'Unscheduled'>('All');
  const [includeUnscheduled, setIncludeUnscheduled] = useState(true);
  const [dueFrom, setDueFrom] = useState<number | undefined>(undefined);
  const [dueTo, setDueTo] = useState<number | undefined>(undefined);

  const refreshTasks = useCallback(() => {
    if (user) {
      setTasks(taskService.getTasks(user.id, user.orgId));
    }
  }, [user]);

  const hasTaskConflict = (id: string): boolean => {
    const localTask = tasks.find((task) => task.id === id);
    if (!localTask) return false;
    const latest = taskService.getTaskById(id);
    if (!latest) return false;
    const conflicted = (latest.version || 1) > (localTask.version || 1);
    if (conflicted) {
      toastService.warning('Task changed elsewhere', 'Refreshed latest task state to avoid overwrite.');
      refreshTasks();
    }
    return conflicted;
  };

  useEffect(() => {
    const handleUndoRedo = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        const nextState = e.shiftKey ? historyManager.redo(tasks) : historyManager.undo(tasks);
        if (nextState) {
          setTasks(nextState);
          if (user) taskService.reorderTasks(user.orgId, nextState, user.id, user.displayName);
        }
      }
    };
    window.addEventListener('keydown', handleUndoRedo);
    return () => window.removeEventListener('keydown', handleUndoRedo);
  }, [tasks, user]);

  const createTask = (
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
    if (!user) return;
    historyManager.push(tasks);
    taskService.createTask(
      user.id,
      user.orgId,
      projectId,
      title,
      description,
      priority,
      tags,
      dueDate,
      assigneeIds,
      securityGroupIds,
      estimateMinutes,
      estimateProvidedBy,
      creationAuditAction
    );
    refreshTasks();
  };

  const doneStageIds = useMemo(() => {
    if (!user) return [TaskStatus.DONE];
    return getDoneStageIds(projectService.getProjects(user.orgId));
  }, [user, tasks]);

  const updateStatus = (id: string, status: string, username?: string) => {
    if (!user) return;
    if (hasTaskConflict(id)) return;
    const currentTask = tasks.find((task) => task.id === id);
    if (!currentTask) return;
    if (currentTask.status === status) return;
    historyManager.push(tasks);
    const wasDone = doneStageIds.includes(currentTask.status);
    const isDone = doneStageIds.includes(status);
    const enteringDone = !wasDone && isDone;
    if (enteringDone) setConfettiActive(true);
    const updated = taskService.updateTaskStatus(user.id, user.orgId, id, status, username);
    setTasks(updated);
    if (enteringDone) {
      const task = updated.find((item) => item.id === id);
      toastService.success('Task completed', task ? `"${task.title}" moved to done.` : 'Task moved to done.');
    }
  };

  const bulkUpdateTasks = (ids: string[], updates: Partial<Task>) => {
    if (!user) return;
    historyManager.push(tasks);
    let current = [...tasks];
    ids.forEach(id => {
      if (hasTaskConflict(id)) return;
      current = taskService.updateTask(user.id, user.orgId, id, updates, user.displayName);
    });
    setTasks(current);
    if (ids.length === 0) return;
    if (updates.status && doneStageIds.includes(updates.status)) {
      toastService.success('Tasks completed', `${ids.length} task${ids.length > 1 ? 's' : ''} moved to done.`);
      return;
    }
    if (Array.isArray(updates.assigneeIds) || typeof updates.assigneeId === 'string') {
      toastService.success('Assignees updated', `${ids.length} task${ids.length > 1 ? 's were' : ' was'} reassigned.`);
    }
  };

  const bulkDeleteTasks = (ids: string[]) => {
    if (!user) return;
    historyManager.push(tasks);
    let current = [...tasks];
    ids.forEach(id => {
      if (hasTaskConflict(id)) return;
      current = taskService.deleteTask(user.id, user.orgId, id);
    });
    setTasks(current);
    if (ids.length > 0) {
      toastService.warning('Tasks deleted', `${ids.length} task${ids.length > 1 ? 's were' : ' was'} removed.`);
    }
  };

  const updateTask = (id: string, updates: Partial<Omit<Task, 'id' | 'userId' | 'createdAt' | 'order'>>, username?: string) => {
    if (!user) return;
    if (hasTaskConflict(id)) return;
    historyManager.push(tasks);
    const previousTask = tasks.find((task) => task.id === id);
    const updated = taskService.updateTask(user.id, user.orgId, id, updates, username);
    setTasks(updated);
    const nextTask = updated.find((task) => task.id === id);
    if (!nextTask) return;
    if (Array.isArray(updates.assigneeIds) || typeof updates.assigneeId === 'string') {
      const previousAssignees =
        previousTask && Array.isArray(previousTask.assigneeIds) && previousTask.assigneeIds.length > 0
          ? previousTask.assigneeIds
          : previousTask?.assigneeId
            ? [previousTask.assigneeId]
            : [];
      const nextAssignees =
        Array.isArray(nextTask.assigneeIds) && nextTask.assigneeIds.length > 0
          ? nextTask.assigneeIds
          : nextTask.assigneeId
            ? [nextTask.assigneeId]
            : [];
      if (JSON.stringify(previousAssignees) !== JSON.stringify(nextAssignees)) {
        const added = nextAssignees.filter((assigneeId) => !previousAssignees.includes(assigneeId));
        const removed = previousAssignees.filter((assigneeId) => !nextAssignees.includes(assigneeId));
        added.forEach((assigneeId) => {
          notificationService.addNotification({
            orgId: user.orgId,
            userId: assigneeId,
            title: 'Assignment updated',
            message: `Assigned: ${nextTask.title}`,
            type: 'ASSIGNMENT',
            category: 'assigned',
            urgent: nextTask.priority === TaskPriority.HIGH,
            linkId: nextTask.id
          });
        });
        removed.forEach((assigneeId) => {
          notificationService.addNotification({
            orgId: user.orgId,
            userId: assigneeId,
            title: 'Assignment updated',
            message: `Unassigned: ${nextTask.title}`,
            type: 'SYSTEM',
            category: 'assigned',
            urgent: false,
            linkId: nextTask.id
          });
        });
        const assigneeCount = nextAssignees.length;
        toastService.success(
          assigneeCount > 0 ? 'Assignees updated' : 'Assignees cleared',
          assigneeCount > 0
            ? `"${nextTask.title}" now has ${assigneeCount} assignee${assigneeCount > 1 ? 's' : ''}.`
            : `"${nextTask.title}" has no assignee.`
        );
      }
    }
  };

  const addComment = (taskId: string, text: string) => {
    if (!user) return;
    const updated = taskService.addComment(user.id, user.orgId, taskId, text, user.displayName);
    setTasks(updated);
    return updated.find(t => t.id === taskId);
  };

  const moveTask = (taskId: string, targetStatus: string, targetTaskId?: string) => {
    if (!user) return;
    if (hasTaskConflict(taskId)) return;
    historyManager.push(tasks);
    const currentTask = tasks.find((task) => task.id === taskId);
    if (!currentTask) return;
    const enteringDone = !doneStageIds.includes(currentTask.status) && doneStageIds.includes(targetStatus);
    if (enteringDone) setConfettiActive(true);
    setTasks(prevTasks => {
      const updatedTasks = [...prevTasks];
      const taskIndex = updatedTasks.findIndex(t => t.id === taskId);
      if (taskIndex === -1) return prevTasks;
      const [task] = updatedTasks.splice(taskIndex, 1);
      task.status = targetStatus;
      let insertionIndex = -1;
      if (targetTaskId) {
        insertionIndex = updatedTasks.findIndex(t => t.id === targetTaskId);
      } 
      if (insertionIndex === -1) {
        let lastInColumnIndex = -1;
        for (let i = updatedTasks.length - 1; i >= 0; i--) {
          if (updatedTasks[i].status === targetStatus) {
            lastInColumnIndex = i;
            break;
          }
        }
        insertionIndex = lastInColumnIndex === -1 ? updatedTasks.length : lastInColumnIndex + 1;
      }
      updatedTasks.splice(insertionIndex, 0, task);
      const reordered = updatedTasks.map((t, i) => ({ ...t, order: i }));
      taskService.reorderTasks(user.orgId, reordered, user.id, user.displayName);
      return reordered;
    });
  };

  const deleteTask = (id: string) => {
    if (!user) return;
    if (hasTaskConflict(id)) return;
    historyManager.push(tasks);
    const removedTask = tasks.find((task) => task.id === id);
    const updated = taskService.deleteTask(user.id, user.orgId, id);
    setTasks(updated);
    toastService.warning('Task deleted', removedTask ? `"${removedTask.title}" was removed.` : 'Task removed.');
  };

  const toggleTimer = (id: string) => {
    if (!user) return;
    const latestTask = taskService.getTaskById(id) || tasks.find((item) => item.id === id);
    const wasRunning = Boolean(latestTask?.isTimerRunning);
    const updated = taskService.toggleTimer(user.id, user.orgId, id);
    setTasks(updated);
    const nextTask = updated.find((item) => item.id === id);
    if (!latestTask || !nextTask) return;
    if (wasRunning && !nextTask.isTimerRunning) {
      toastService.info('Timer stopped', `"${nextTask.title}" time saved.`);
    } else if (!wasRunning && nextTask.isTimerRunning) {
      toastService.info('Timer started', `"${nextTask.title}" is now tracking time.`);
    }
  };

  const assistWithAI = async (task: Task) => {
    setActiveTaskId(task.id);
    setActiveTaskTitle(task.title);
    setAiLoading(true);
    const steps = await aiService.breakDownTask(task.title, task.description);
    setAiSuggestions(steps);
    setAiLoading(false);
  };

  const applyAISuggestions = (finalSteps: string[]) => {
    if (!user || !activeTaskId || !finalSteps) return;
    historyManager.push(tasks);
    
    const task = tasks.find(t => t.id === activeTaskId);
    if (!task) return;
    const project = projectService.getProjects(user.orgId).find((item) => item.id === task.projectId);
    const projectOwnerIds = project
      ? Array.from(new Set([...(project.ownerIds || []), ...(project.createdBy ? [project.createdBy] : []), ...(project.members?.[0] ? [project.members[0]] : [])]))
      : [];
    const canManage = user.role === 'admin' || projectOwnerIds.includes(user.id) || task.userId === user.id;
    if (!canManage) {
      toastService.warning('Permission denied', 'Only project owners or admins can apply AI-generated subtasks.');
      setAiSuggestions(null);
      setActiveTaskId(null);
      return;
    }

    const newSubtasks: Subtask[] = finalSteps.map(title => ({
      id: createId(),
      title,
      isCompleted: false
    }));

    const updatedSubtasks = [...task.subtasks, ...newSubtasks];
    updateTask(activeTaskId, { subtasks: updatedSubtasks }, user.displayName);
    taskService.appendAuditEntry(
      user.id,
      user.orgId,
      activeTaskId,
      `applied AI-generated subtasks (${newSubtasks.length})`,
      user.displayName
    );
    setAiSuggestions(null);
    setActiveTaskId(null);
  };

  const uniqueTags = useMemo(() => collectUniqueTags(tasks), [tasks]);

  const filteredTasks = useMemo(
    () =>
      filterTasks({
        tasks,
        priorityFilter,
        tagFilter,
        activeProjectId,
        assigneeFilter,
        projectFilter,
        currentUser: user,
        searchQuery,
        dueStatusFilter,
        includeUnscheduled,
        dueFrom,
        dueTo
      }),
    [tasks, priorityFilter, tagFilter, activeProjectId, assigneeFilter, projectFilter, user, searchQuery, dueStatusFilter, includeUnscheduled, dueFrom, dueTo]
  );

  const categorizedTasks = useMemo(() => categorizeTasks(filteredTasks), [filteredTasks]);

  return {
    tasks,
    categorizedTasks,
    aiLoading,
    aiSuggestions,
    activeTaskTitle,
    priorityFilter,
    statusFilter,
    tagFilter,
    assigneeFilter,
    projectFilter,
    searchQuery,
    dueStatusFilter,
    includeUnscheduled,
    dueFrom,
    dueTo,
    uniqueTags,
    confettiActive,
    setConfettiActive,
    setPriorityFilter,
    setStatusFilter,
    setTagFilter,
    setAssigneeFilter,
    setProjectFilter,
    setSearchQuery,
    setDueStatusFilter,
    setIncludeUnscheduled,
    setDueFrom,
    setDueTo,
    setAiSuggestions,
    refreshTasks,
    createTask,
    updateStatus,
    updateTask,
    addComment,
    moveTask,
    deleteTask,
    assistWithAI,
    applyAISuggestions,
    bulkUpdateTasks,
    bulkDeleteTasks,
    toggleTimer 
  };
};
