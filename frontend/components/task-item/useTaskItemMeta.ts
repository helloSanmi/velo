import { useMemo } from 'react';
import { Task } from '../../types';
import { estimationService } from '../../services/estimationService';
import { projectService } from '../../services/projectService';
import { taskService } from '../../services/taskService';
import { userService } from '../../services/userService';
import { getUserFullName } from '../../utils/userDisplay';

export const useTaskItemMeta = (task: Task, showPersonalCalibration: boolean, elapsed: number) => {
  const totalMs = (task.timeLogged || 0) + elapsed;
  const minutes = Math.floor(totalMs / 60000);
  const hours = Math.floor(minutes / 60);
  const formattedTime = hours > 0 ? `${hours}h ${minutes % 60}m` : `${minutes}m`;
  const isTimerActive = !!task.isTimerRunning;

  const totalSubtasks = task.subtasks?.length || 0;
  const completedSubtasks = (task.subtasks || []).filter((subtask) => subtask.isCompleted).length;
  const totalTags = task.tags?.length || 0;
  const tagsTooltip = [
    ...task.tags.slice(0, 4),
    task.tags.length > 4 ? `+${task.tags.length - 4} more` : ''
  ]
    .filter(Boolean)
    .join('\n');

  const dependencyIds = Array.isArray(task.blockedByIds) ? task.blockedByIds : [];
  const allProjects = projectService.getProjects(task.orgId);
  const allOrgTasks = taskService.getAllTasksForOrg(task.orgId);
  const dependencies = dependencyIds
    .map((depId) => allOrgTasks.find((candidate) => candidate.id === depId))
    .filter((dep): dep is Task => Boolean(dep));
  const missingDependencyCount = Math.max(0, dependencyIds.length - dependencies.length);
  const incompleteDependencyCount = dependencies.filter((dep) => {
    const depProject = allProjects.find((project) => project.id === dep.projectId);
    const doneStageId = depProject?.stages?.length ? depProject.stages[depProject.stages.length - 1].id : 'done';
    return dep.status !== doneStageId;
  }).length;
  const hasDependencies = dependencyIds.length > 0;
  const dependencyTone = missingDependencyCount > 0 ? 'critical' : incompleteDependencyCount > 0 ? 'blocked' : hasDependencies ? 'ready' : 'none';
  const dependencyClass =
    dependencyTone === 'critical'
      ? 'border-rose-200 bg-rose-50 text-rose-700'
      : dependencyTone === 'blocked'
        ? 'border-amber-200 bg-amber-50 text-amber-700'
        : 'border-slate-200 bg-slate-50 text-slate-600';
  const dependencyTooltip = [
    missingDependencyCount > 0 ? `${missingDependencyCount} dependency ${missingDependencyCount > 1 ? 'tasks are' : 'task is'} missing.` : '',
    ...dependencies.slice(0, 3).map((dep) => {
      const depProject = allProjects.find((project) => project.id === dep.projectId);
      const doneStageId = depProject?.stages?.length ? depProject.stages[depProject.stages.length - 1].id : 'done';
      const doneStageName = depProject?.stages?.length ? depProject.stages[depProject.stages.length - 1].name : 'Done';
      const stateLabel = dep.status === doneStageId ? doneStageName : dep.status.replace(/-/g, ' ');
      return `${dep.title} (${stateLabel})`;
    }),
    dependencies.length > 3 ? `+${dependencies.length - 3} more dependencies` : ''
  ]
    .filter(Boolean)
    .join('\n');

  const project = useMemo(() => {
    const projects = projectService.getProjects();
    return projects.find((p) => p.id === task.projectId);
  }, [task.projectId]);

  const assigneeIds = useMemo(() => {
    if (Array.isArray(task.assigneeIds) && task.assigneeIds.length > 0) return task.assigneeIds;
    return task.assigneeId ? [task.assigneeId] : [];
  }, [task.assigneeIds, task.assigneeId]);

  const assignees = useMemo(() => {
    const users = userService.getUsers();
    return assigneeIds.map((id) => users.find((u) => u.id === id)).filter(Boolean);
  }, [assigneeIds]);

  const assigneeNames = useMemo(
    () => assignees.map((assignee: any) => getUserFullName(assignee)).join(', '),
    [assignees]
  );

  const adjustedEstimateLabel = useMemo(() => {
    if (!showPersonalCalibration) return '';
    if (!task.estimateMinutes || task.estimateMinutes <= 0) return '';
    const estimator = task.estimateProvidedBy || task.userId;
    const preview = estimationService.getAdjustmentPreview(task.orgId, estimator, task.estimateMinutes, {
      projectId: task.projectId,
      status: task.status,
      tags: task.tags
    });
    const previewHours = Math.max(0.25, preview.adjustedMinutes / 60);
    return `Adj ${previewHours.toFixed(previewHours >= 10 ? 1 : 2)}h`;
  }, [showPersonalCalibration, task]);

  return {
    totalMs,
    formattedTime,
    isTimerActive,
    totalSubtasks,
    completedSubtasks,
    totalTags,
    tagsTooltip,
    dependencyIds,
    hasDependencies,
    dependencyTone,
    dependencyClass,
    dependencyTooltip,
    project,
    assignees,
    assigneeNames,
    adjustedEstimateLabel
  };
};
