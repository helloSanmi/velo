import { useEffect, useState } from 'react';
import { realtimeService } from '../services/realtimeService';

export interface RecentActionItem {
  displayName: string;
  action: string;
  taskTitle: string;
  timestamp: number;
}

const sortRecentActions = (actions: RecentActionItem[]): RecentActionItem[] => {
  return [...actions].sort((a, b) => b.timestamp - a.timestamp).slice(0, 3);
};

interface UseRecentActionsParams {
  orgId?: string;
  visibleProjectIds?: string[];
  storageKey?: string;
  refreshMs?: number;
}

export const useRecentActions = ({
  orgId,
  visibleProjectIds,
  storageKey = 'velo_data',
  refreshMs = 5000
}: UseRecentActionsParams = {}) => {
  const [recentActions, setRecentActions] = useState<RecentActionItem[]>([]);
  const visibleProjectIdsKey = JSON.stringify(visibleProjectIds || []);

  useEffect(() => {
    const parsedVisibleProjectIds = JSON.parse(visibleProjectIdsKey) as string[];

    const fetchRecentActions = () => {
      try {
        const allTasks = JSON.parse(localStorage.getItem(storageKey) || '[]');
        const allowedProjectIds = new Set(parsedVisibleProjectIds);
        const actions = allTasks
          .filter((task: any) => {
            if (orgId && task.orgId !== orgId) return false;
            if (parsedVisibleProjectIds.length === 0) return true;
            return task.projectId === 'general' || allowedProjectIds.has(task.projectId);
          })
          .flatMap((task: any) =>
            (task.auditLog || []).map((audit: any) => ({ ...audit, taskTitle: task.title }))
          );
        setRecentActions(sortRecentActions(actions));
      } catch {
        setRecentActions([]);
      }
    };

    fetchRecentActions();
    const interval = window.setInterval(fetchRecentActions, refreshMs);
    const unsubscribe = realtimeService.subscribe((event) => {
      if (event.type !== 'TASKS_UPDATED') return;
      if (orgId && event.orgId && event.orgId !== orgId) return;
      fetchRecentActions();
    });
    return () => {
      window.clearInterval(interval);
      unsubscribe();
    };
  }, [refreshMs, storageKey, orgId, visibleProjectIdsKey]);

  return recentActions;
};
