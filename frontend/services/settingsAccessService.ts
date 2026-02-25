import { Project, Task, User } from '../types';

export const getWorkflowOwnerProjectIds = (user: User, projects: Project[]): Set<string> => {
  if (user.role === 'admin') {
    return new Set(projects.map((project) => project.id));
  }
  return new Set(
    projects
      .filter((project) => {
        const owners = Array.isArray(project.ownerIds) ? project.ownerIds : [];
        return owners.includes(user.id) || project.createdBy === user.id;
      })
      .map((project) => project.id)
  );
};

export const getWorkflowVisibleProjects = (user: User, projects: Project[], tasks: Task[]): Project[] => {
  if (user.role === 'admin') return projects;
  const assignedProjectIds = new Set(
    tasks
      .filter((task) =>
        task.userId === user.id ||
        task.assigneeId === user.id ||
        (Array.isArray(task.assigneeIds) && task.assigneeIds.includes(user.id))
      )
      .map((task) => task.projectId)
  );
  return projects.filter((project) => {
    const ownerIds = Array.isArray(project.ownerIds) ? project.ownerIds : [];
    const memberIds = Array.isArray(project.members) ? project.members : [];
    return (
      project.createdBy === user.id ||
      ownerIds.includes(user.id) ||
      memberIds.includes(user.id) ||
      assignedProjectIds.has(project.id)
    );
  });
};

export const canAccessWorkflowAutomation = (user: User, visibleProjects: Project[]): boolean =>
  user.role === 'admin' || visibleProjects.length > 0;

export const canManageWorkflowAutomation = (user: User, ownerProjectIds: Set<string>): boolean =>
  user.role === 'admin' || ownerProjectIds.size > 0;

