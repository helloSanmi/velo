import { Dispatch, SetStateAction, useEffect } from 'react';
import { Project, Task, User } from '../types';
import { projectService } from '../services/projectService';
import { realtimeService } from '../services/realtimeService';
import { settingsService, UserSettings } from '../services/settingsService';
import { syncGuardService } from '../services/syncGuardService';
import { taskService } from '../services/taskService';
import { toastService } from '../services/toastService';
import { userService } from '../services/userService';
import { presenceService } from '../services/presenceService';
import { processSlaNotifications } from '../services/slaNotificationService';
import { notificationService } from '../services/notificationService';

interface UseWorkspaceConnectionOptions {
  user: User | null;
  allUsers: User[];
  tasks: Task[];
  projects: Project[];
  settings: UserSettings;
  setSettings: Dispatch<SetStateAction<UserSettings>>;
  setAllUsers: (users: User[]) => void;
  setProjects: (projects: Project[]) => void;
  setSelectedTask: Dispatch<SetStateAction<Task | null>>;
  refreshTasks: () => void;
  setIsOffline: (value: boolean) => void;
  setHasPendingSync: (value: boolean) => void;
  setOnlineCount: (value: number) => void;
}

export const useWorkspaceConnection = ({
  user,
  allUsers,
  tasks,
  projects,
  settings,
  setSettings,
  setAllUsers,
  setProjects,
  setSelectedTask,
  refreshTasks,
  setIsOffline,
  setHasPendingSync,
  setOnlineCount
}: UseWorkspaceConnectionOptions) => {
  useEffect(() => {
    if (!user) return;

    const forceReconcile = () => {
      userService.hydrateWorkspaceFromBackend(user.orgId).then((result) => {
        if (!result) return;
        syncGuardService.clearPending();
        setHasPendingSync(false);
        setAllUsers(result.users);
        setProjects(result.projects);
        refreshTasks();
        setSelectedTask((prev) => (prev ? taskService.getTaskById(prev.id) || null : null));
      });
    };

    const onOffline = () => {
      setIsOffline(true);
      toastService.warning('Offline mode', 'Changes are saved locally and marked pending sync.');
    };

    const onOnline = () => {
      setIsOffline(false);
      if (syncGuardService.hasPending()) {
        toastService.info('Connection restored', 'Checking pending changes against backend.');
        forceReconcile();
      }
    };
    const onWorkspaceSyncRequired = (event: Event) => {
      const customEvent = event as CustomEvent<{ orgId?: string }>;
      if (customEvent.detail?.orgId && customEvent.detail.orgId !== user.orgId) return;
      forceReconcile();
    };

    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);
    window.addEventListener('workspaceSyncRequired', onWorkspaceSyncRequired as EventListener);
    return () => {
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('workspaceSyncRequired', onWorkspaceSyncRequired as EventListener);
    };
  }, [refreshTasks, setAllUsers, setIsOffline, setProjects, setSelectedTask, user]);

  useEffect(() => {
    setHasPendingSync(syncGuardService.hasPending());
  }, [tasks, projects, setHasPendingSync]);

  useEffect(() => {
    if (!user) return;
    processSlaNotifications({
      user,
      allUsers,
      tasks,
      enableEstimateCalibration: settings.enableEstimateCalibration
    });
  }, [allUsers, settings.enableEstimateCalibration, tasks, user]);

  useEffect(() => {
    const handleSettingsUpdate = (event: CustomEvent<UserSettings>) => {
      if (event.detail) setSettings(event.detail);
    };
    window.addEventListener('settingsUpdated', handleSettingsUpdate as EventListener);
    return () => window.removeEventListener('settingsUpdated', handleSettingsUpdate as EventListener);
  }, [setSettings]);

  useEffect(() => {
    if (!user) {
      setOnlineCount(0);
      return;
    }
    if (!settings.realTimeUpdates) {
      realtimeService.disconnect();
      setOnlineCount(1);
      return;
    }

    const unsubscribeRealtime = realtimeService.subscribe((event) => {
      if (event.clientId === realtimeService.getClientId()) return;
      if (event.orgId && event.orgId !== user.orgId) return;

      if (event.type === 'TASKS_UPDATED') {
        userService.hydrateWorkspaceFromBackend(user.orgId).then(() => {
          refreshTasks();
          setSelectedTask((prev) => {
            if (!prev) return null;
            const latest = taskService.getTaskById(prev.id);
            return latest || null;
          });
        });
        return;
      }

      if (event.type === 'PROJECTS_UPDATED') {
        const payload = event.payload as { action?: string; projectId?: string; project?: Project } | undefined;
        if (payload?.action === 'purged' && payload.projectId) {
          setProjects((prev) => prev.filter((project) => project.id !== payload.projectId));
          refreshTasks();
          return;
        }
        if (payload?.project) {
          setProjects((prev) => {
            const exists = prev.some((project) => project.id === payload.project!.id);
            if (!exists) return [...prev, payload.project!];
            return prev.map((project) => (project.id === payload.project!.id ? payload.project! : project));
          });
          refreshTasks();
          return;
        }
        userService.hydrateWorkspaceFromBackend(user.orgId).then(() => {
          setProjects(projectService.getProjects(user.orgId));
          refreshTasks();
        });
        return;
      }

      if (event.type === 'USERS_UPDATED') {
        userService.hydrateWorkspaceFromBackend(user.orgId).then(() => {
          setAllUsers(userService.getUsers(user.orgId));
        });
        return;
      }

      if (event.type === 'GROUPS_UPDATED') {
        setSelectedTask((prev) => (prev ? { ...prev } : prev));
        return;
      }

      if (event.type === 'NOTIFICATIONS_UPDATED') {
        notificationService.applyRealtimeEvent(event);
        return;
      }

      if (event.type === 'SETTINGS_UPDATED') {
        setSettings(settingsService.getSettings());
      }
    });

    let stopPresence: (() => void) | undefined;
    realtimeService.connect(user.orgId);
    stopPresence = presenceService.start(user, (entries) => {
      const ids = new Set(entries.map((entry) => entry.userId));
      ids.add(user.id);
      setOnlineCount(ids.size);
    });

    return () => {
      unsubscribeRealtime();
      realtimeService.disconnect();
      stopPresence?.();
    };
  }, [refreshTasks, setAllUsers, setOnlineCount, setProjects, setSelectedTask, setSettings, settings.realTimeUpdates, user]);

  useEffect(() => {
    if (!user) return;
    if (settings.realTimeUpdates) return;
    const id = window.setInterval(() => {
      if (!navigator.onLine) return;
      userService.hydrateWorkspaceFromBackend(user.orgId).then((result) => {
        if (!result) return;
        if (syncGuardService.hasPending()) {
          syncGuardService.clearPending();
          setHasPendingSync(false);
        }
        setAllUsers(result.users);
        setProjects(result.projects);
        refreshTasks();
      });
    }, 20000);
    return () => window.clearInterval(id);
  }, [refreshTasks, setAllUsers, setProjects, settings.realTimeUpdates, user]);
};
