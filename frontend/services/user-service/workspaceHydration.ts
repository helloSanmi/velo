import { backendSyncService } from '../backendSyncService';

const PROJECTS_KEY = 'velo_projects';

type HydrationResult = { users: any[]; projects: any[] } | null;

export const hydrateWorkspaceFromBackend = async (
  orgId: string,
  options?: {
    force?: boolean;
  }
): Promise<HydrationResult> => {
  try {
    const localProjectsSnapshot = JSON.parse(localStorage.getItem(PROJECTS_KEY) || '[]') as Array<any>;
    const localProjectsById = new Map(
      localProjectsSnapshot
        .filter((project) => project?.orgId === orgId && project?.id)
        .map((project) => [project.id, project])
    );
    const result = await backendSyncService.hydrateWorkspace(orgId, options);
    const mergedProjects = result.projects.map((project) => {
      const localProject = localProjectsById.get(project.id);
      if (!localProject) return project;
      const remoteHasPendingApproval = Boolean(project.completionRequestedAt && project.completionRequestedById);
      const localHasPendingApproval = Boolean(localProject.completionRequestedAt && localProject.completionRequestedById);
      const localUpdatedAt = typeof localProject.updatedAt === 'number' ? localProject.updatedAt : 0;
      const remoteUpdatedAt = typeof project.updatedAt === 'number' ? project.updatedAt : 0;
      if (project.isArchived || project.isCompleted || project.isDeleted) return project;
      if (localUpdatedAt < remoteUpdatedAt) return project;

      if (localHasPendingApproval && !remoteHasPendingApproval) {
        return {
          ...project,
          completionRequestedAt: localProject.completionRequestedAt,
          completionRequestedById: localProject.completionRequestedById,
          completionRequestedByName: localProject.completionRequestedByName,
          completionRequestedComment: localProject.completionRequestedComment,
          updatedAt: localUpdatedAt || project.updatedAt
        };
      }

      if (!localHasPendingApproval && remoteHasPendingApproval) {
        return {
          ...project,
          completionRequestedAt: undefined,
          completionRequestedById: undefined,
          completionRequestedByName: undefined,
          completionRequestedComment: undefined,
          updatedAt: localUpdatedAt || project.updatedAt
        };
      }

      return project;
    });
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(mergedProjects));
    return { users: result.users, projects: mergedProjects };
  } catch (error) {
    return null;
  }
};
