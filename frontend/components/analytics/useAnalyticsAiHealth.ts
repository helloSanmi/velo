import { useEffect, useState } from 'react';
import { aiService } from '../../services/aiService';
import { aiJobService } from '../../services/aiJobService';
import { toastService } from '../../services/toastService';
import { Task, User } from '../../types';

interface UseAnalyticsAiHealthArgs {
  currentUser: User | undefined;
  orgId: string;
  selectedProjectId: string;
  selectedProjectName?: string;
  presetTasks: Task[];
  allUsers: User[];
}

export const useAnalyticsAiHealth = ({
  currentUser,
  orgId,
  selectedProjectId,
  selectedProjectName,
  presetTasks,
  allUsers
}: UseAnalyticsAiHealthArgs) => {
  const [insights, setInsights] = useState<{ bottlenecks: string[]; suggestions: string[] } | null>(null);
  const [isCheckingAI, setIsCheckingAI] = useState(false);

  useEffect(() => {
    if (!currentUser) return undefined;
    const key = `analytics-health:${selectedProjectId}`;
    setIsCheckingAI(aiJobService.isJobRunning(orgId, currentUser.id, key));
    const handler = () => setIsCheckingAI(aiJobService.isJobRunning(orgId, currentUser.id, key));
    window.addEventListener(aiJobService.eventName, handler);
    return () => window.removeEventListener(aiJobService.eventName, handler);
  }, [currentUser, orgId, selectedProjectId]);

  const runAIHealthAudit = async () => {
    if (!currentUser) return;
    const dedupeKey = `analytics-health:${selectedProjectId}`;
    setIsCheckingAI(true);
    await aiJobService.runJob({
      orgId,
      userId: currentUser.id,
      type: 'analytics_health',
      label: selectedProjectName ? `Analytics AI check for "${selectedProjectName}"` : 'Analytics AI check',
      dedupeKey,
      run: () => aiService.getHealthInsights(presetTasks, allUsers),
      onSuccess: (result) => {
        setInsights(result);
        toastService.success('AI analysis complete', 'Insights are ready.');
      },
      onError: () => toastService.error('AI analysis failed', 'Please retry in a moment.')
    });
    setIsCheckingAI(aiJobService.isJobRunning(orgId, currentUser.id, dedupeKey));
  };

  return { insights, isCheckingAI, runAIHealthAudit };
};
