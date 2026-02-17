import { useCallback } from 'react';
import { Project, Task, User } from '../types';
import { toastService } from '../services/toastService';
import {
  TaskRestrictedAction,
  canManageProject as canManageProjectBase,
  canManageTask as canManageTaskBase,
  canOperateTask,
  getProjectOwnerId,
} from '../services/permissionService';

interface UseAccessControlParams {
  user: User | null;
  projects: Project[];
  tasks: Task[];
}

export const useAccessControl = ({ user, projects, tasks }: UseAccessControlParams) => {
  const canManageProject = useCallback(
    (project?: Project) => (user ? canManageProjectBase(user, project) : false),
    [user]
  );

  const canManageTask = useCallback(
    (task?: Task) => (user ? canManageTaskBase(user, projects, task) : false),
    [user, projects]
  );

  const hasTaskPermission = useCallback(
    (taskId: string, action: TaskRestrictedAction) => {
      const task = tasks.find((item) => item.id === taskId);
      if (!task || !user) return false;
      if (action === 'delete' || action === 'assign' || action === 'rename') {
        return canManageTask(task);
      }
      return canOperateTask(user, projects, task);
    },
    [tasks, user, projects, canManageTask]
  );

  const ensureTaskPermission = useCallback(
    (taskId: string, action: TaskRestrictedAction) => {
      if (action === 'delete' || action === 'assign' || action === 'rename') {
        if (hasTaskPermission(taskId, action)) return true;
        const labels: Record<TaskRestrictedAction, string> = {
          complete: 'complete tasks',
          rename: 'rename tasks',
          delete: 'delete tasks',
          assign: 'assign task members'
        };
        toastService.warning('Permission denied', `Only project owners or admins can ${labels[action]}.`);
        return false;
      }
      if (hasTaskPermission(taskId, action)) return true;
      const labels: Record<TaskRestrictedAction, string> = {
        complete: 'complete tasks',
        rename: 'rename tasks',
        delete: 'delete tasks',
        assign: 'assign task members'
      };
      toastService.warning('Permission denied', `Only assigned members, project owners, or admins can ${labels[action]}.`);
      return false;
    },
    [hasTaskPermission]
  );

  return {
    getProjectOwnerId,
    canManageProject,
    canManageTask,
    hasTaskPermission,
    ensureTaskPermission
  };
};
