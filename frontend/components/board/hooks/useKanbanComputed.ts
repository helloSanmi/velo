import { useEffect, useMemo, useState } from 'react';
import { Project, ProjectStage, Task, User } from '../../../types';
import { computeKanbanTotals } from '../kanbanUtils';
import { estimationService } from '../../../services/estimationService';
import { projectChatService } from '../../../services/projectChatService';
import { realtimeService } from '../../../services/realtimeService';
import { canManageProject } from '../../../services/permissionService';

interface UseKanbanComputedArgs {
  categorizedTasks: Record<string, Task[]>;
  projectStages: ProjectStage[];
  currentUser: User;
  activeProject?: Project;
  activeProjectTasks: Task[];
  showPersonalCalibration: boolean;
  onGenerateProjectTasksWithAI?: (
    projectId: string,
    tasks: Array<{ title: string; description: string; priority: Task['priority']; tags: string[]; assigneeIds?: string[] }>
  ) => void;
}

export const useKanbanComputed = ({
  categorizedTasks,
  projectStages,
  currentUser,
  activeProject,
  activeProjectTasks,
  showPersonalCalibration,
  onGenerateProjectTasksWithAI
}: UseKanbanComputedArgs) => {
  const [ownerChatUnreadCount, setOwnerChatUnreadCount] = useState(0);
  const totals = useMemo(() => computeKanbanTotals(categorizedTasks, projectStages), [categorizedTasks, projectStages]);

  const forecastSummary = useMemo(() => {
    const tasks = Object.values(categorizedTasks).flat();
    const estimatedMinutes = tasks.reduce((sum, task) => sum + (task.estimateMinutes || 0), 0);
    const adjustedMinutes = tasks.reduce((sum, task) => {
      if (!task.estimateMinutes || task.estimateMinutes <= 0) return sum;
      const estimatorId = task.estimateProvidedBy || task.userId;
      const preview = estimationService.getAdjustmentPreview(currentUser.orgId, estimatorId, task.estimateMinutes, {
        projectId: task.projectId,
        status: task.status,
        tags: task.tags
      });
      return sum + preview.adjustedMinutes;
    }, 0);
    const factor = estimatedMinutes > 0 ? adjustedMinutes / estimatedMinutes : 1;
    const riskLabel = factor >= 1.3 ? 'At risk' : factor >= 1.1 ? 'Tight' : 'On-track';
    return { estimatedMinutes, adjustedMinutes, riskLabel } as const;
  }, [categorizedTasks, currentUser.orgId]);

  const projectMetaSummary = useMemo(() => {
    if (!activeProject) return undefined;
    const now = Date.now();
    const trackedMs = activeProjectTasks.reduce((sum, task) => {
      const base = task.timeLogged || 0;
      if (task.isTimerRunning && task.timerStartedAt) return sum + base + Math.max(0, Date.now() - task.timerStartedAt);
      return sum + base;
    }, 0);
    const trackedHours = trackedMs / 3600000;
    const hourlyRate = typeof activeProject.hourlyRate === 'number' ? activeProject.hourlyRate : undefined;
    const trackedCost = hourlyRate ? trackedHours * hourlyRate : undefined;
    const budgetCost = typeof activeProject.budgetCost === 'number' ? activeProject.budgetCost : undefined;
    const overBudget =
      typeof budgetCost === 'number' &&
      Number.isFinite(budgetCost) &&
      typeof trackedCost === 'number' &&
      trackedCost > budgetCost;
    const budgetRatio =
      typeof budgetCost === 'number' && budgetCost > 0 && typeof trackedCost === 'number' ? trackedCost / budgetCost : undefined;
    const budgetStatus: 'healthy' | 'near' | 'over' =
      overBudget ? 'over' : typeof budgetRatio === 'number' && budgetRatio >= 0.8 ? 'near' : 'healthy';
    const timelineStatus: 'healthy' | 'near' | 'over' | 'neutral' = !activeProject.endDate
      ? 'neutral'
      : activeProject.endDate < now
        ? 'over'
        : (activeProject.endDate - now) / 86400000 <= 7
          ? 'near'
          : 'healthy';
    const scopeSize = typeof activeProject.scopeSize === 'number' ? activeProject.scopeSize : undefined;
    const scopeStatus: 'healthy' | 'near' | 'over' | 'neutral' =
      typeof scopeSize !== 'number' || scopeSize <= 0
        ? 'neutral'
        : activeProjectTasks.length > scopeSize
          ? 'over'
          : activeProjectTasks.length >= Math.ceil(scopeSize * 0.85)
            ? 'near'
            : 'healthy';
    return {
      timeline: `${activeProject.startDate ? new Date(activeProject.startDate).toLocaleDateString() : 'No start'} - ${
        activeProject.endDate ? new Date(activeProject.endDate).toLocaleDateString() : 'No end'
      }`,
      timelineStatus,
      scopeStatus,
      scope: typeof activeProject.scopeSize === 'number' ? `${activeProject.scopeSize} tasks` : activeProject.scopeSummary || 'Not set',
      budget: typeof activeProject.budgetCost === 'number' ? `$${Math.round(activeProject.budgetCost).toLocaleString()}` : 'Not set',
      tracked: `${trackedHours.toFixed(1)}h`,
      trackedCost: typeof trackedCost === 'number' ? `$${Math.round(trackedCost).toLocaleString()}` : undefined,
      hourlyRate: typeof hourlyRate === 'number' ? `$${hourlyRate.toFixed(2)}/h` : undefined,
      overBudget,
      budgetStatus
    } as const;
  }, [activeProject, activeProjectTasks]);

  useEffect(() => {
    if (!activeProject) {
      setOwnerChatUnreadCount(0);
      return;
    }

    const refreshUnread = () => {
      setOwnerChatUnreadCount(projectChatService.getUnreadCountForUser(activeProject.orgId, activeProject.id, currentUser.id));
    };

    refreshUnread();
    const unsubscribe = realtimeService.subscribe((event) => {
      if (event.type !== 'PROJECT_CHAT_UPDATED') return;
      if (event.orgId !== activeProject.orgId) return;
      if (event.payload?.projectId !== activeProject.id) return;
      refreshUnread();
    });
    return () => unsubscribe();
  }, [activeProject, currentUser.id]);

  const canGenerateTasksWithAI = Boolean(activeProject && onGenerateProjectTasksWithAI && canManageProject(currentUser, activeProject));

  return {
    totals,
    forecastSummary: showPersonalCalibration ? forecastSummary : undefined,
    projectMetaSummary,
    ownerChatUnreadCount,
    canGenerateTasksWithAI
  };
};
