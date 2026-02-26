import { Project, Task, User } from '../types';

export type TaskRestrictedAction = 'complete' | 'rename' | 'delete' | 'assign';

const isAdmin = (user?: User) => {
  const normalizedRole = String(user?.role || '').trim().toLowerCase();
  return normalizedRole === 'admin' || normalizedRole.endsWith('_admin') || normalizedRole.includes('admin');
};

export const getProjectOwnerIds = (project?: Project): string[] => {
  if (!project) return [];
  const fromOwnerIds = Array.isArray(project.ownerIds) ? project.ownerIds.filter(Boolean) : [];
  const primary = project.createdBy;
  return Array.from(new Set([...(primary ? [primary] : []), ...fromOwnerIds]));
};

export const getProjectOwnerId = (project?: Project) => getProjectOwnerIds(project)[0];

export const canManageProject = (user: User, project?: Project) => {
  if (!project) return false;
  return isAdmin(user) || getProjectOwnerIds(project).includes(user.id);
};

export const canManageTask = (user: User, projects: Project[], task?: Task) => {
  if (!task) return false;
  if (isAdmin(user)) return true;
  const project = projects.find((item) => item.id === task.projectId);
  if (!project) return task.userId === user.id;
  return getProjectOwnerIds(project).includes(user.id);
};

export const isTaskAssignedToUser = (user: User, task?: Task) => {
  if (!task) return false;
  const assigneeIds = Array.isArray(task.assigneeIds) && task.assigneeIds.length > 0
    ? task.assigneeIds
    : task.assigneeId
      ? [task.assigneeId]
      : [];
  return assigneeIds.includes(user.id);
};

export const canOperateTask = (user: User, projects: Project[], task?: Task) => {
  if (!task) return false;
  if (canManageTask(user, projects, task)) return true;
  return isTaskAssignedToUser(user, task);
};
