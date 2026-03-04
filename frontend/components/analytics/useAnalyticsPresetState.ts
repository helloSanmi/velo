import { useEffect, useState } from 'react';
import { toastService } from '../../services/toastService';
import { AnalyticsPreset, AnalyticsPresetKey, analyticsPresetService } from '../../services/analyticsPresetService';
import { User } from '../../types';

interface UseAnalyticsPresetStateArgs {
  currentUser: User | undefined;
  orgId: string;
}

export const useAnalyticsPresetState = ({ currentUser, orgId }: UseAnalyticsPresetStateArgs) => {
  const [selectedProjectId, setSelectedProjectId] = useState('all');
  const [selectedPreset, setSelectedPreset] = useState<AnalyticsPresetKey>('overview');
  const [dismissedRecommendationIds, setDismissedRecommendationIds] = useState<string[]>([]);
  const [savedPresets, setSavedPresets] = useState<AnalyticsPreset[]>([]);
  const [newPresetName, setNewPresetName] = useState('');
  const [sharePreset, setSharePreset] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    setSavedPresets(analyticsPresetService.list(currentUser.id, orgId));
  }, [currentUser, orgId]);

  const saveCurrentPreset = () => {
    if (!currentUser) return;
    const name = newPresetName.trim();
    if (!name) {
      toastService.warning('Name required', 'Enter a preset name.');
      return;
    }
    analyticsPresetService.create({
      userId: currentUser.id,
      orgId,
      name,
      key: selectedPreset,
      selectedProjectId,
      visibility: sharePreset ? 'shared' : 'personal'
    });
    setSavedPresets(analyticsPresetService.list(currentUser.id, orgId));
    setNewPresetName('');
    setSharePreset(false);
    toastService.success('Preset saved', `"${name}" saved.`);
  };

  const applySavedPreset = (presetId: string) => {
    const preset = savedPresets.find((item) => item.id === presetId);
    if (!preset) return;
    setSelectedPreset(preset.key);
    setSelectedProjectId(preset.selectedProjectId);
  };

  const removeSavedPreset = (presetId: string) => {
    if (!currentUser) return;
    analyticsPresetService.remove(currentUser.id, orgId, presetId);
    setSavedPresets(analyticsPresetService.list(currentUser.id, orgId));
  };

  return {
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
  };
};
