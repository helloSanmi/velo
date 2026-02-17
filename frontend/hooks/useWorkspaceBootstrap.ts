import { Dispatch, SetStateAction, useEffect } from 'react';
import { Project, User } from '../types';
import { migrationService } from '../services/migrationService';
import { projectService } from '../services/projectService';
import { syncGuardService } from '../services/syncGuardService';
import { userService } from '../services/userService';

interface UseWorkspaceBootstrapOptions {
  setUser: (user: User | null) => void;
  setAllUsers: (users: User[]) => void;
  setProjects: (projects: Project[]) => void;
  refreshTasks: () => void;
  setPublicProject: (project: Project | null) => void;
  setIsCommandPaletteOpen: Dispatch<SetStateAction<boolean>>;
}

export const useWorkspaceBootstrap = ({
  setUser,
  setAllUsers,
  setProjects,
  refreshTasks,
  setPublicProject,
  setIsCommandPaletteOpen
}: UseWorkspaceBootstrapOptions) => {
  useEffect(() => {
    migrationService.run();
    const current = userService.getCurrentUser();
    if (!current) return;
    setUser(current);
    userService.hydrateWorkspaceFromBackend(current.orgId).then((result) => {
      if (result) {
        syncGuardService.clearPending();
        setAllUsers(result.users);
        setProjects(result.projects);
      } else {
        setAllUsers(userService.getUsers(current.orgId));
        setProjects(projectService.getProjects(current.orgId));
      }
      refreshTasks();
    });
  }, []);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.startsWith('#public/')) {
      const token = hash.split('/')[1];
      const project = projectService.getProjectByToken(token);
      if (project) setPublicProject(project);
    }

    const currentUser = userService.getCurrentUser();
    if (currentUser && !hash.startsWith('#public/')) {
      setUser(currentUser);
      userService.hydrateWorkspaceFromBackend(currentUser.orgId).then((result) => {
        if (result) {
          syncGuardService.clearPending();
          setAllUsers(result.users);
          setProjects(result.projects);
        } else {
          setAllUsers(userService.getUsers(currentUser.orgId));
          setProjects(projectService.getProjects(currentUser.orgId));
        }
      });
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
};
