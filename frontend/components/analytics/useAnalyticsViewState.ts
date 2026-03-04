import { useEffect, useState } from 'react';
import { userService } from '../../services/userService';
import { Recommendation, UseAnalyticsViewStateArgs } from './analyticsViewState.types';
import { useAnalyticsAiHealth } from './useAnalyticsAiHealth';
import { useAnalyticsPresetState } from './useAnalyticsPresetState';
import { useAnalyticsTaskMetrics } from './useAnalyticsTaskMetrics';

export type { Recommendation };

export const useAnalyticsViewState = ({ tasks, projects, allUsers, orgId, onUpdateTask }: UseAnalyticsViewStateArgs) => {
  const currentUser = userService.getCurrentUser();
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const presetState = useAnalyticsPresetState({ currentUser, orgId });
  const {
    selectedProjectId,
    setSelectedProjectId,
    selectedPreset,
    setSelectedPreset,
    dismissedRecommendationIds,
    setDismissedRecommendationIds,
    savedPresets,
    newPresetName,
    setNewPresetName,
    sharePreset,
    setSharePreset,
    saveCurrentPreset,
    applySavedPreset,
    removeSavedPreset
  } = presetState;

  const taskMetrics = useAnalyticsTaskMetrics({
    tasks,
    projects,
    selectedProjectId,
    selectedPreset,
    dismissedRecommendationIds,
    onUpdateTask
  });

  const aiState = useAnalyticsAiHealth({
    currentUser,
    orgId,
    selectedProjectId,
    selectedProjectName: taskMetrics.selectedProject?.name,
    presetTasks: taskMetrics.presetTasks,
    allUsers
  });

  useEffect(() => {
    if (selectedProjectId !== 'all' && !taskMetrics.activeProjects.find((project) => project.id === selectedProjectId)) {
      setSelectedProjectId('all');
    }
  }, [taskMetrics.activeProjects, selectedProjectId, setSelectedProjectId]);

  useEffect(() => {
    setDismissedRecommendationIds([]);
  }, [selectedPreset, selectedProjectId, setDismissedRecommendationIds]);

  return {
    currentUser,
    mobileFiltersOpen,
    setMobileFiltersOpen,
    selectedProjectId,
    setSelectedProjectId,
    selectedPreset,
    setSelectedPreset,
    dismissedRecommendationIds,
    setDismissedRecommendationIds,
    savedPresets,
    newPresetName,
    setNewPresetName,
    sharePreset,
    setSharePreset,
    insights: aiState.insights,
    isCheckingAI: aiState.isCheckingAI,
    activeProjects: taskMetrics.activeProjects,
    stats: taskMetrics.stats,
    spend: taskMetrics.spend,
    recommendations: taskMetrics.recommendations,
    runAIHealthAudit: aiState.runAIHealthAudit,
    saveCurrentPreset,
    applySavedPreset,
    removeSavedPreset,
    setLocalTaskPatches: taskMetrics.setLocalTaskPatches
  };
};
