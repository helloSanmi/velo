import { Project, Task, User } from '../types';

const getTaskAssigneeIds = (task: Task): string[] => {
  if (Array.isArray(task.assigneeIds) && task.assigneeIds.length > 0) return task.assigneeIds;
  if (task.assigneeId) return [task.assigneeId];
  return [];
};

export const getProjectOwnerIds = (project?: Project): string[] => {
  if (!project) return [];
  const ownerIds = Array.isArray(project.ownerIds) ? project.ownerIds.filter(Boolean) : [];
  return Array.from(new Set([...(project.createdBy ? [project.createdBy] : []), ...ownerIds]));
};

export const isProjectActive = (project: Project) => !project.isArchived && !project.isCompleted && !project.isDeleted;

export const canUserAccessProject = (params: {
  user?: User | null;
  project: Project;
  tasks: Task[];
}): boolean => {
  const { user, project, tasks } = params;
  if (!user) return false;
  if (user.role === 'admin') return true;
  const isOwner = getProjectOwnerIds(project).includes(user.id);
  const isMember = Array.isArray(project.members) && project.members.includes(user.id);
  const isAssignedToProject = tasks.some(
    (task) => task.projectId === project.id && getTaskAssigneeIds(task).includes(user.id)
  );
  return isOwner || isMember || isAssignedToProject || Boolean(project.isPublic);
};

export const getAccessibleProjectIds = (params: {
  user?: User | null;
  projects: Project[];
  tasks: Task[];
  activeOnly?: boolean;
}): Set<string> => {
  const { user, projects, tasks, activeOnly = false } = params;
  if (!user) return new Set();
  const base = activeOnly ? projects.filter((project) => isProjectActive(project)) : projects;
  if (user.role === 'admin') return new Set(base.map((project) => project.id));
  return new Set(
    base
      .filter((project) => canUserAccessProject({ user, project, tasks }))
      .map((project) => project.id)
  );
};
