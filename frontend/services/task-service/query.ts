import { Task } from '../../types';
import { projectService } from '../projectService';
import { userService } from '../userService';
import { getAccessibleProjectIds, isProjectActive } from '../accessPolicyService';
import {
  normalizeTaskForRead,
  readStoredTasks,
  withVersion
} from './storage';

export const getAllTasksForOrg = (orgId: string): Task[] => {
  try {
    const allTasks = readStoredTasks();
    return allTasks
      .filter((task) => task.orgId === orgId)
      .map(normalizeTaskForRead)
      .sort((a, b) => a.order - b.order);
  } catch (error) {
    console.error('Error fetching all org tasks:', error);
    return [];
  }
};

export const getTasksForViewer = (userId: string, orgId: string): Task[] => {
  try {
    const allTasks = readStoredTasks();
    const allProjects = projectService.getProjects(orgId);
    const activeProjects = allProjects.filter((project) => isProjectActive(project));
    const activeProjectIds = new Set(activeProjects.map((project) => project.id));
    activeProjectIds.add('general');
    const allUsers = userService.getUsers(orgId);
    const sessionUser = userService.getCurrentUser();
    const currentUser =
      allUsers.find((user) => user.id === userId) ||
      (sessionUser && sessionUser.id === userId && sessionUser.orgId === orgId ? sessionUser : undefined);
    const isAdmin = currentUser?.role === 'admin';
    const accessibleProjectIds = getAccessibleProjectIds({
      user: currentUser,
      projects: activeProjects,
      tasks: allTasks,
      activeOnly: true
    });
    const hasProjectSnapshot = allProjects.length > 0;
    const allowAllProjectIdsTemporarily = hasProjectSnapshot && activeProjects.length === 0;

    return allTasks
      .filter(
        (task) =>
          task.orgId === orgId &&
          (allowAllProjectIdsTemporarily || activeProjectIds.has(task.projectId)) &&
          (isAdmin ||
            task.userId === userId ||
            accessibleProjectIds.has(task.projectId) ||
            task.projectId === 'general')
      )
      .map(normalizeTaskForRead)
      .sort((a, b) => a.order - b.order);
  } catch (error) {
    console.error('Critical failure fetching Velo telemetry:', error);
    return [];
  }
};

export const getTaskById = (id: string): Task | undefined => {
  const allTasks = readStoredTasks();
  const task = allTasks.find((item) => item.id === id);
  return task ? normalizeTaskForRead(withVersion(task)) : undefined;
};
