import { Dispatch, SetStateAction } from 'react';
import { Project, User } from '../types';
import { projectService } from '../services/projectService';
import { taskService } from '../services/taskService';
import { toastService } from '../services/toastService';
import { notificationService } from '../services/notificationService';
import { ensurePermissionAccess } from '../services/permissionAccessService';

interface ProjectMutationContext {
  user: User;
  allUsers: User[];
  projects: Project[];
  setProjects: Dispatch<SetStateAction<Project[]>>;
  refreshTasks: () => void;
}

interface UpdateProjectArgs extends ProjectMutationContext {
  canManageProject: (project: Project) => boolean;
  id: string;
  updates: Partial<Project>;
}

interface ChangeOwnerArgs extends ProjectMutationContext {
  id: string;
  ownerId: string;
}

const removeMembersFromProjectTasks = (user: User, projectId: string, removedMemberIds: string[], refreshTasks: () => void) => {
  if (removedMemberIds.length === 0) return;
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
};

export const updateProjectWithGuards = ({
  user,
  allUsers,
  projects,
  canManageProject,
  setProjects,
  refreshTasks,
  id,
  updates
}: UpdateProjectArgs) => {
  const target = projects.find((project) => project.id === id);
  if (!target) return;

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
    if (!ensurePermissionAccess(false, 'project_creator_or_admin', 'edit project settings')) return;
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

  removeMembersFromProjectTasks(user, id, removedMembers, refreshTasks);
  setProjects((prev) => prev.map((project) => (project.id === id ? { ...project, ...sanitizedUpdates } : project)));
};

export const changeProjectOwner = ({
  user,
  allUsers,
  projects,
  setProjects,
  refreshTasks,
  id,
  ownerId
}: ChangeOwnerArgs) => {
  const target = projects.find((project) => project.id === id);
  if (!target) return;

  if (!ensurePermissionAccess(user.role === 'admin', 'admin_only', 'change project owner')) return;
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

  removeMembersFromProjectTasks(user, id, removedOwnerIds, refreshTasks);
  const ownerName = allUsers.find((member) => member.id === ownerId)?.displayName || 'New owner';
  toastService.success('Owner updated', `${ownerName} is now project owner.`);
};
