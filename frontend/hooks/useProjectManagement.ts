import { Dispatch, SetStateAction, useCallback } from 'react';
import { MainViewType, Project, Task, User } from '../types';
import { TaskDetailTabType } from '../components/task-detail/types';
import { taskService } from '../services/taskService';
import { toastService } from '../services/toastService';
import { userService } from '../services/userService';
import { mockDataService } from '../services/mockDataService';
import { isWorkspaceSubdomainHost } from '../utils/workspaceHost';
import { changeProjectOwner, updateProjectWithGuards } from './projectManagement.helpers';

interface UseProjectManagementOptions {
  user: User | null;
  allUsers: User[];
  projects: Project[];
  refreshTasks: () => void;
  canManageProject: (project: Project) => boolean;
  setProjects: Dispatch<SetStateAction<Project[]>>;
  setActiveProjectId: Dispatch<SetStateAction<string | null>>;
  setSelectedTask: Dispatch<SetStateAction<Task | null>>;
  setTaskDetailInitialTab: Dispatch<SetStateAction<TaskDetailTabType | undefined>>;
  setCurrentView: Dispatch<SetStateAction<MainViewType>>;
  setUser: Dispatch<SetStateAction<User | null>>;
  setAuthView: Dispatch<SetStateAction<'landing' | 'product' | 'solutions' | 'pricing' | 'contact' | 'login' | 'register' | 'join'>>;
}

export const useProjectManagement = ({
  user,
  allUsers,
  projects,
  refreshTasks,
  canManageProject,
  setProjects,
  setActiveProjectId,
  setSelectedTask,
  setTaskDetailInitialTab,
  setCurrentView,
  setUser,
  setAuthView
}: UseProjectManagementOptions) => {
  const handleLogout = useCallback(() => {
    userService.logout();
    setActiveProjectId(null);
    setUser(null);
    setAuthView(isWorkspaceSubdomainHost() ? 'login' : 'landing');
  }, [setActiveProjectId, setAuthView, setUser]);

  const handleReset = useCallback(() => {
    mockDataService.init().then(() => refreshTasks());
  }, [refreshTasks]);

  const handleOpenTaskFromNotification = useCallback(
    (targetId: string) => {
      if (!user) return;
      const [entityId, deepLink] = targetId.split('#');
      const initialTab: TaskDetailTabType | undefined = deepLink === 'comments' ? 'comments' : undefined;
      const allOrgTasks = taskService.getAllTasksForOrg(user.orgId);
      const task = allOrgTasks.find((item) => item.id === entityId);
      if (task) {
        setTaskDetailInitialTab(initialTab);
        const project = projects.find((item) => item.id === task.projectId);
        if (!project || project.isArchived || project.isCompleted || project.isDeleted) {
          setActiveProjectId(task.projectId);
          setSelectedTask(task);
          setCurrentView('projects');
          toastService.info('Project not active', 'Opened Projects so you can view this task in its lifecycle state.');
          return;
        }
        setCurrentView('board');
        setActiveProjectId(task.projectId);
        setSelectedTask(task);
        return;
      }

      const project = projects.find((item) => item.id === entityId);
      if (project) {
        setTaskDetailInitialTab(undefined);
        setActiveProjectId(project.id);
        setSelectedTask(null);
        if (project.isArchived || project.isCompleted || project.isDeleted) {
          setCurrentView('projects');
          return;
        }
        setCurrentView('board');
        return;
      }

      const fallbackProject = allOrgTasks.find((item) => item.projectId === entityId);
      if (fallbackProject) {
        setTaskDetailInitialTab(initialTab);
        setActiveProjectId(fallbackProject.projectId);
        setSelectedTask(fallbackProject);
        setCurrentView('projects');
        toastService.info('Project not active', 'Opened Projects so you can view this item in its lifecycle state.');
        return;
      }

      toastService.warning('Notification unavailable', 'The related item no longer exists.');
    },
    [projects, setActiveProjectId, setCurrentView, setSelectedTask, setTaskDetailInitialTab, user]
  );

  const handleUpdateProject = useCallback(
    (id: string, updates: Partial<Project>) => {
      if (!user) return;
      updateProjectWithGuards({
        user,
        allUsers,
        projects,
        canManageProject,
        setProjects,
        refreshTasks,
        id,
        updates
      });
    },
    [allUsers, canManageProject, projects, refreshTasks, setProjects, user]
  );

  const handleChangeProjectOwner = useCallback(
    (id: string, ownerId: string) => {
      if (!user) return;
      changeProjectOwner({
        user,
        allUsers,
        projects,
        setProjects,
        refreshTasks,
        id,
        ownerId
      });
    },
    [allUsers, projects, refreshTasks, setProjects, user]
  );

  return {
    handleLogout,
    handleReset,
    handleOpenTaskFromNotification,
    handleUpdateProject,
    handleChangeProjectOwner
  };
};
