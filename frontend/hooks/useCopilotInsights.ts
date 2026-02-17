import { useCallback, useMemo, useState } from 'react';
import { User } from '../types';
import { copilotInsightService } from '../services/copilotInsightService';
import { toastService } from '../services/toastService';

interface UseCopilotInsightsParams {
  user: User | null;
  activeProjectId: string | null;
}

export const useCopilotInsights = ({ user, activeProjectId }: UseCopilotInsightsParams) => {
  const [insightVersion, setInsightVersion] = useState(0);

  const handlePinInsightToProject = useCallback(
    (projectId: string, insight: string) => {
      if (!user) return;
      copilotInsightService.pin(user.orgId, projectId, insight);
      setInsightVersion((prev) => prev + 1);
      toastService.success('Insight pinned', 'Saved to project pinned insights.');
    },
    [user]
  );

  const handleUnpinInsightFromProject = useCallback(
    (projectId: string, insight: string) => {
      if (!user) return;
      copilotInsightService.unpin(user.orgId, projectId, insight);
      setInsightVersion((prev) => prev + 1);
      toastService.info('Insight unpinned', 'Removed from pinned insights.');
    },
    [user]
  );

  const isProjectInsightPinned = useCallback(
    (projectId: string, insight: string) => {
      if (!user) return false;
      return copilotInsightService.isPinned(user.orgId, projectId, insight);
    },
    [user]
  );

  const activeProjectPinnedInsights = useMemo(() => {
    if (!user || !activeProjectId) return [];
    return copilotInsightService.list(user.orgId, activeProjectId);
  }, [user, activeProjectId, insightVersion]);

  return {
    handlePinInsightToProject,
    handleUnpinInsightFromProject,
    isProjectInsightPinned,
    activeProjectPinnedInsights
  };
};

