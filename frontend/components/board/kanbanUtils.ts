import { Project, ProjectStage, Task } from '../../types';
import { DEFAULT_PROJECT_STAGES } from '../../services/projectService';

export const buildProjectStages = (activeProject: Project | undefined, categorizedTasks: Record<string, Task[]>): ProjectStage[] => {
  const baseStages = activeProject?.stages?.length ? activeProject.stages : DEFAULT_PROJECT_STAGES;
  const unknownStages = Object.keys(categorizedTasks)
    .filter((statusId) => !baseStages.some((stage) => stage.id === statusId))
    .map((statusId) => ({
      id: statusId,
      name: statusId.replace(/-/g, ' ').replace(/\b\w/g, (value) => value.toUpperCase())
    }));

  return [...baseStages, ...unknownStages];
};

export const canManageProjectStages = (activeProject: Project | undefined, currentUserId: string, currentUserRole?: string): boolean => {
  if (!activeProject) return false;
  const ownerId = activeProject.createdBy || activeProject.members?.[0];
  return currentUserRole === 'admin' || ownerId === currentUserId;
};

export const computeKanbanTotals = (categorizedTasks: Record<string, Task[]>, projectStages: ProjectStage[]) => {
  const total = Object.values(categorizedTasks).reduce((sum, tasks) => sum + tasks.length, 0);
  const firstStageId = projectStages[0]?.id;
  const lastStageId = projectStages[projectStages.length - 1]?.id;
  const todo = firstStageId ? (categorizedTasks[firstStageId]?.length || 0) : 0;
  const done = lastStageId ? (categorizedTasks[lastStageId]?.length || 0) : 0;
  const inProgress = total - todo - done;

  return { todo, inProgress, done, total };
};
