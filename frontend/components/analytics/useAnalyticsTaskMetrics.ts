import { useEffect, useMemo, useState } from 'react';
import { Project, Task, TaskPriority, TaskStatus } from '../../types';
import { AnalyticsPresetKey } from '../../services/analyticsPresetService';
import { Recommendation } from './analyticsViewState.types';

interface UseAnalyticsTaskMetricsArgs {
  tasks: Task[];
  projects: Project[];
  selectedProjectId: string;
  selectedPreset: AnalyticsPresetKey;
  dismissedRecommendationIds: string[];
  onUpdateTask: (id: string, updates: Partial<Omit<Task, 'id' | 'userId' | 'createdAt' | 'order'>>) => void;
}

export const useAnalyticsTaskMetrics = ({
  tasks,
  projects,
  selectedProjectId,
  selectedPreset,
  dismissedRecommendationIds,
  onUpdateTask
}: UseAnalyticsTaskMetricsArgs) => {
  const [localTaskPatches, setLocalTaskPatches] = useState<Record<string, Partial<Task>>>({});
  const now = Date.now();

  const activeProjects = useMemo(
    () => projects.filter((project) => !project.isArchived && !project.isCompleted && !project.isDeleted),
    [projects]
  );

  const selectedProject = useMemo(
    () => (selectedProjectId === 'all' ? null : activeProjects.find((project) => project.id === selectedProjectId) || null),
    [activeProjects, selectedProjectId]
  );

  const mergedTasks = useMemo(
    () => tasks.map((task) => ({ ...task, ...(localTaskPatches[task.id] || {}) })),
    [tasks, localTaskPatches]
  );

  const scopedTasks = useMemo(() => {
    if (!selectedProject) return mergedTasks;
    return mergedTasks.filter((task) => task.projectId === selectedProject.id);
  }, [mergedTasks, selectedProject]);

  useEffect(() => {
    setLocalTaskPatches((prev) => {
      const next: Record<string, Partial<Task>> = {};
      let changed = false;
      for (const [taskId, patch] of Object.entries(prev)) {
        const source = tasks.find((task) => task.id === taskId);
        if (!source) {
          changed = true;
          continue;
        }
        const remainingEntries = Object.entries(patch).filter(([key, value]) => {
          const sourceValue = (source as unknown as Record<string, unknown>)[key];
          return sourceValue !== value;
        });
        if (remainingEntries.length === 0) {
          changed = true;
          continue;
        }
        next[taskId] = Object.fromEntries(remainingEntries) as Partial<Task>;
      }
      return changed ? next : prev;
    });
  }, [tasks]);

  const presetTasks = useMemo(() => {
    if (selectedPreset === 'overview') return scopedTasks;
    if (selectedPreset === 'delivery') {
      return scopedTasks.filter(
        (task) => task.status !== TaskStatus.DONE || Boolean(task.dueDate && task.dueDate <= now + 14 * 86400000)
      );
    }
    if (selectedPreset === 'risk') {
      return scopedTasks.filter(
        (task) =>
          Boolean(task.isAtRisk) ||
          Boolean(task.dueDate && task.dueDate < now && task.status !== TaskStatus.DONE) ||
          (task.priority === TaskPriority.HIGH && task.status !== TaskStatus.DONE)
      );
    }
    return scopedTasks.filter((task) => (task.timeLogged || 0) > 0);
  }, [now, scopedTasks, selectedPreset]);

  const stats = useMemo(() => {
    const total = presetTasks.length;
    const done = presetTasks.filter((task) => task.status === TaskStatus.DONE).length;
    const inProgress = presetTasks.filter((task) => task.status === TaskStatus.IN_PROGRESS).length;
    const overdue = presetTasks.filter((task) => Boolean(task.dueDate && task.dueDate < now && task.status !== TaskStatus.DONE)).length;
    const atRisk = presetTasks.filter((task) => task.isAtRisk).length;
    const completion = total > 0 ? Math.round((done / total) * 100) : 0;
    return { total, done, inProgress, overdue, atRisk, completion };
  }, [presetTasks, now]);

  const spend = useMemo(() => {
    if (!selectedProject?.hourlyRate) return null;
    const trackedHours = presetTasks.reduce((sum, task) => sum + ((task.timeLogged || 0) / 3600000), 0);
    return {
      trackedHours,
      trackedCost: trackedHours * selectedProject.hourlyRate,
      budget: selectedProject.budgetCost || 0
    };
  }, [presetTasks, selectedProject]);

  const recommendations = useMemo<Recommendation[]>(() => {
    const items: Recommendation[] = [];

    const overdueTasks = presetTasks.filter((task) => task.dueDate && task.dueDate < now && task.status !== TaskStatus.DONE);
    if (overdueTasks.length > 0) {
      const overdueTaskIds = overdueTasks.map((task) => task.id);
      items.push({
        id: 'mark-overdue-risk',
        title: 'Mark overdue tasks as at risk',
        detail: `${overdueTaskIds.length} overdue task${overdueTaskIds.length > 1 ? 's need' : ' needs'} visibility for faster triage.`,
        impact: 'high',
        taskIds: overdueTaskIds,
        taskNames: overdueTasks.map((task) => task.title),
        applyLabel: 'Apply risk flag',
        apply: () => overdueTaskIds.forEach((taskId) => onUpdateTask(taskId, { isAtRisk: true }))
      });
    }

    const highTodoTasks = presetTasks.filter((task) => task.priority === TaskPriority.HIGH && task.status === TaskStatus.TODO);
    if (highTodoTasks.length > 0) {
      const highTodoIds = highTodoTasks.map((task) => task.id);
      items.push({
        id: 'start-high-priority',
        title: 'Move high-priority backlog into progress',
        detail: `${highTodoIds.length} high-priority task${highTodoIds.length > 1 ? 's are' : ' is'} still in To Do.`,
        impact: 'medium',
        taskIds: highTodoIds,
        taskNames: highTodoTasks.map((task) => task.title),
        applyLabel: 'Move to in progress',
        apply: () => highTodoIds.forEach((taskId) => onUpdateTask(taskId, { status: TaskStatus.IN_PROGRESS }))
      });
    }

    if (selectedProject?.hourlyRate && selectedProject.budgetCost) {
      const trackedCost = presetTasks.reduce(
        (sum, task) => sum + ((task.timeLogged || 0) / 3600000) * selectedProject.hourlyRate!,
        0
      );
      if (trackedCost > selectedProject.budgetCost * 0.9) {
        const inProgressTasks = presetTasks.filter((task) => task.status === TaskStatus.IN_PROGRESS);
        if (inProgressTasks.length > 0) {
          const inProgressIds = inProgressTasks.map((task) => task.id);
          items.push({
            id: 'budget-risk',
            title: 'Budget nearing limit',
            detail: 'Current tracked cost is above 90% of budget. Mark in-progress tasks at risk to control burn.',
            impact: 'high',
            taskIds: inProgressIds,
            taskNames: inProgressTasks.map((task) => task.title),
            applyLabel: 'Flag in-progress tasks',
            apply: () => inProgressIds.forEach((taskId) => onUpdateTask(taskId, { isAtRisk: true }))
          });
        }
      }
    }

    return items.filter((item) => !dismissedRecommendationIds.includes(item.id)).slice(0, 4);
  }, [dismissedRecommendationIds, now, onUpdateTask, presetTasks, selectedProject]);

  return {
    activeProjects,
    selectedProject,
    presetTasks,
    stats,
    spend,
    recommendations,
    setLocalTaskPatches
  };
};
