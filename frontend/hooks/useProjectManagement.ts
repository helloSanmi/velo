import { Dispatch, SetStateAction, useCallback } from 'react';
import { MainViewType, Project, Task, User } from '../types';
import { TaskDetailTabType } from '../components/task-detail/types';
import { projectService } from '../services/projectService';
import { taskService } from '../services/taskService';
import { toastService } from '../services/toastService';
import { userService } from '../services/userService';
import { mockDataService } from '../services/mockDataService';
import { notificationService } from '../services/notificationService';

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
  setAuthView: Dispatch<SetStateAction<'landing' | 'product' | 'solutions' | 'pricing' | 'support' | 'login' | 'register' | 'join'>>;
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
    setAuthView('landing');
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

  const removeMembersFromProjectTasks = useCallback(
    (projectId: string, removedMemberIds: string[]) => {
      if (!user || removedMemberIds.length === 0) return;
      const orgTasks = taskService.getAllTasksForOrg(user.orgId).filter((task) => task.projectId === projectId);
      orgTasks.forEach((task) => {
        const currentAssignees =
          Array.isArray(task.assigneeIds) && task.assigneeIds.length > 0
            ? task.assigneeIds
            : task.assigneeId
              ? [task.assigneeId]
              : [];
        const nextAssignees = currentAssignees.filter((assigneeId) => !removedMemberIds.includes(assigneeId));
        if (nextAssignees.length === currentAssignees.length) return;
        taskService.updateTask(
          user.id,
          user.orgId,
          task.id,
          {
            assigneeIds: nextAssignees,
            assigneeId: nextAssignees[0]
          },
          user.displayName
        );
      });
      refreshTasks();
    },
    [refreshTasks, user]
  );

  const handleUpdateProject = useCallback(
    (id: string, updates: Partial<Project>) => {
      const target = projects.find((project) => project.id === id);
      if (!target || !user) return;
      const updateKeys = Object.keys(updates) as Array<keyof Project>;
      const completionRequestKeys: Array<keyof Project> = [
        'completionRequestedAt',
        'completionRequestedById',
        'completionRequestedByName',
        'completionRequestedComment'
      ];
      const isCompletionRequestOnlyUpdate =
        updateKeys.length > 0 &&
        updateKeys.every((key) => completionRequestKeys.includes(key)) &&
        updates.completionRequestedAt !== undefined &&
        updates.completionRequestedById === user.id &&
        updates.completionRequestedByName === user.displayName;

      if (!canManageProject(target) && !isCompletionRequestOnlyUpdate) {
        toastService.warning('Permission denied', 'Only admins or project creators can edit project settings.');
        return;
      }
      const previousMembers = Array.isArray(target.members) ? target.members : [];
      const sanitizedUpdates: Partial<Project> = { ...updates };
      if ('createdBy' in sanitizedUpdates && user.role !== 'admin') {
        delete sanitizedUpdates.createdBy;
      }
      if (user.role === 'admin' && sanitizedUpdates.createdBy) {
        const nextOwnerId = sanitizedUpdates.createdBy;
        if (!allUsers.some((member) => member.id === nextOwnerId && member.orgId === user.orgId)) {
          toastService.error('Invalid owner', 'Selected owner is not a workspace user.');
          return;
        }
        const previousOwnerIds = Array.from(
          new Set([...(target.ownerIds || []), ...(target.createdBy ? [target.createdBy] : [])].filter(Boolean))
        );
        const inputMembers = Array.isArray(sanitizedUpdates.members) ? sanitizedUpdates.members : target.members;
        const transferMembers = inputMembers.filter((memberId) => !previousOwnerIds.includes(memberId));
        if (!transferMembers.includes(nextOwnerId)) transferMembers.push(nextOwnerId);
        sanitizedUpdates.members = Array.from(new Set(transferMembers));
        if (!Array.isArray(sanitizedUpdates.ownerIds)) sanitizedUpdates.ownerIds = [nextOwnerId];
      }
      projectService.updateProject(id, sanitizedUpdates);
      const nextMembers = Array.isArray(sanitizedUpdates.members) ? sanitizedUpdates.members : previousMembers;
      const addedMembers = nextMembers.filter((memberId) => !previousMembers.includes(memberId) && memberId !== user.id);
      const removedMembers = previousMembers.filter((memberId) => !nextMembers.includes(memberId) && memberId !== user.id);
      addedMembers.forEach((memberId) => {
        notificationService.addNotification({
          orgId: user.orgId,
          userId: memberId,
          title: 'Project access updated',
          message: `You were added to "${target.name}".`,
          type: 'SYSTEM',
          category: 'system',
          linkId: id
        });
      });
      removedMembers.forEach((memberId) => {
        notificationService.addNotification({
          orgId: user.orgId,
          userId: memberId,
          title: 'Project access updated',
          message: `You were removed from "${target.name}".`,
          type: 'SYSTEM',
          category: 'system',
          linkId: id
        });
      });
      removeMembersFromProjectTasks(id, removedMembers);
      setProjects((prev) =>
        prev.map((project) => (project.id === id ? { ...project, ...sanitizedUpdates } : project))
      );
    },
    [allUsers, canManageProject, projects, removeMembersFromProjectTasks, setProjects, user]
  );

  const handleChangeProjectOwner = useCallback(
    (id: string, ownerId: string) => {
      const target = projects.find((project) => project.id === id);
      if (!target || !user) return;
      if (user.role !== 'admin') {
        toastService.warning('Permission denied', 'Only admins can change project owner.');
        return;
      }
      const ownerExists = allUsers.some((member) => member.id === ownerId && member.orgId === user.orgId);
      if (!ownerExists) {
        toastService.error('Invalid owner', 'Selected owner is not a workspace user.');
        return;
      }
      const previousOwnerIds = Array.from(new Set([...(target.ownerIds || []), ...(target.createdBy ? [target.createdBy] : [])]));
      const removedOwnerIds = previousOwnerIds.filter((memberId) => memberId !== ownerId);
      const nextMembers = Array.from(new Set((target.members || []).filter((memberId) => !removedOwnerIds.includes(memberId)).concat(ownerId)));
      const nextOwnerIds = [ownerId];
      projectService.updateProject(id, { createdBy: ownerId, members: nextMembers, ownerIds: nextOwnerIds });
      setProjects((prev) =>
        prev.map((project) => (project.id === id ? { ...project, createdBy: ownerId, members: nextMembers, ownerIds: nextOwnerIds } : project))
      );
      removedOwnerIds
        .filter((memberId) => memberId !== user.id)
        .forEach((memberId) => {
          notificationService.addNotification({
            orgId: user.orgId,
            userId: memberId,
            title: 'Project access updated',
            message: `Ownership moved on "${target.name}". You were removed from this project.`,
            type: 'SYSTEM',
            category: 'system',
            linkId: id
          });
        });
      removeMembersFromProjectTasks(id, removedOwnerIds);
      const ownerName = allUsers.find((member) => member.id === ownerId)?.displayName || 'New owner';
      toastService.success('Owner updated', `${ownerName} is now project owner.`);
    },
    [allUsers, projects, removeMembersFromProjectTasks, setProjects, user]
  );

  return {
    handleLogout,
    handleReset,
    handleOpenTaskFromNotification,
    handleUpdateProject,
    handleChangeProjectOwner
  };
};
