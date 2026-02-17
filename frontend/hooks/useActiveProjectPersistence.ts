import { useEffect, useRef } from 'react';
import { Project, User } from '../types';

const getActiveProjectStorageKey = (user: User) => `velo_active_project:${user.orgId}:${user.id}`;

interface UseActiveProjectPersistenceOptions {
  user: User | null;
  projects: Project[];
  activeProjectId: string | null;
  currentView: 'board' | 'projects' | 'analytics' | 'roadmap' | 'workflows' | 'templates' | 'resources' | 'integrations';
  setActiveProjectId: (id: string | null) => void;
}

export const useActiveProjectPersistence = ({
  user,
  projects,
  activeProjectId,
  currentView,
  setActiveProjectId
}: UseActiveProjectPersistenceOptions) => {
  const hasHydratedActiveProjectRef = useRef(false);

  useEffect(() => {
    hasHydratedActiveProjectRef.current = false;
  }, [user?.id, user?.orgId]);

  useEffect(() => {
    if (!user) return;
    const activeProjects = projects.filter((project) => !project.isArchived && !project.isCompleted && !project.isDeleted);
    const storageKey = getActiveProjectStorageKey(user);

    if (!hasHydratedActiveProjectRef.current) {
      hasHydratedActiveProjectRef.current = true;
      const storedProjectId = localStorage.getItem(storageKey);
      if (storedProjectId && activeProjects.some((project) => project.id === storedProjectId)) {
        setActiveProjectId(storedProjectId);
      }
      return;
    }

    if (currentView === 'board' && activeProjectId === null) return;
    if (activeProjectId && activeProjects.some((project) => project.id === activeProjectId)) return;

    const storedProjectId = localStorage.getItem(storageKey);
    if (storedProjectId && activeProjects.some((project) => project.id === storedProjectId)) {
      setActiveProjectId(storedProjectId);
      return;
    }

    if (activeProjectId && !activeProjects.some((project) => project.id === activeProjectId)) {
      setActiveProjectId(null);
    }
  }, [user, projects, activeProjectId, currentView, setActiveProjectId]);

  useEffect(() => {
    if (!user) return;
    const storageKey = getActiveProjectStorageKey(user);
    if (activeProjectId) {
      localStorage.setItem(storageKey, activeProjectId);
      return;
    }
    localStorage.removeItem(storageKey);
  }, [user, activeProjectId]);
};
