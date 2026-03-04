import { useMemo } from 'react';
import { getProjectOwnerIds } from '../../../services/accessPolicyService';
import { WorkspaceMainViewProps } from './types';

export const useWorkspaceScopedData = (props: WorkspaceMainViewProps) => {
  const { user, tasks, allProjectTasks, allUsers, visibleProjects } = props;

  const visibleProjectIds = useMemo(() => new Set(visibleProjects.map((project) => project.id)), [visibleProjects]);
  const scopedTasks = useMemo(
    () => tasks.filter((task) => task.projectId === 'general' || visibleProjectIds.has(task.projectId)),
    [tasks, visibleProjectIds]
  );
  const scopedProjectTasks = useMemo(
    () => allProjectTasks.filter((task) => task.projectId === 'general' || visibleProjectIds.has(task.projectId)),
    [allProjectTasks, visibleProjectIds]
  );
  const scopedUsers = useMemo(() => {
    const memberIds = new Set<string>([user.id]);
    visibleProjects.forEach((project) => project.members.forEach((memberId) => memberIds.add(memberId)));
    scopedTasks.forEach((task) => {
      if (task.assigneeId) memberIds.add(task.assigneeId);
      (task.assigneeIds || []).forEach((assigneeId) => memberIds.add(assigneeId));
    });
    return allUsers.filter((member) => memberIds.has(member.id));
  }, [allUsers, scopedTasks, user.id, visibleProjects]);

  const activeVisibleProjects = useMemo(
    () => visibleProjects.filter((project) => !project.isArchived && !project.isCompleted && !project.isDeleted),
    [visibleProjects]
  );
  const activeVisibleProjectIds = useMemo(() => new Set(activeVisibleProjects.map((project) => project.id)), [activeVisibleProjects]);
  const crossProjectProjectIds = useMemo(() => {
    if (user.role === 'admin') return activeVisibleProjectIds;
    return new Set(
      activeVisibleProjects
        .filter((project) => {
          if (project.isPublic) return true;
          if (project.members.includes(user.id)) return true;
          return getProjectOwnerIds(project).includes(user.id);
        })
        .map((project) => project.id)
    );
  }, [activeVisibleProjectIds, activeVisibleProjects, user.id, user.role]);
  const crossProjectProjects = useMemo(
    () => activeVisibleProjects.filter((project) => crossProjectProjectIds.has(project.id)),
    [activeVisibleProjects, crossProjectProjectIds]
  );
  const crossProjectTasks = useMemo(
    () => scopedTasks.filter((task) => task.projectId === 'general' || crossProjectProjectIds.has(task.projectId)),
    [crossProjectProjectIds, scopedTasks]
  );

  return {
    scopedTasks,
    scopedProjectTasks,
    scopedUsers,
    activeVisibleProjects,
    crossProjectProjects,
    crossProjectTasks
  };
};
