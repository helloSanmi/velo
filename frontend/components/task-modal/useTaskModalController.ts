import { useEffect, useMemo, useState } from 'react';
import { TaskPriority } from '../../types';
import { aiService } from '../../services/aiService';
import { dialogService } from '../../services/dialogService';
import { estimationService } from '../../services/estimationService';
import { settingsService } from '../../services/settingsService';
import { toastService } from '../../services/toastService';
import { userService } from '../../services/userService';
import { ensureAiAccess } from '../../services/aiAccessService';

interface UseTaskModalControllerArgs {
  projectId?: string | null;
  aiPlanEnabled?: boolean;
  aiEnabled?: boolean;
  onClose: () => void;
  onSubmit: (
    title: string,
    description: string,
    priority: TaskPriority,
    tags: string[],
    dueDate?: number,
    assigneeIds?: string[],
    estimateMinutes?: number,
    creationAuditAction?: string
  ) => void;
}

export const useTaskModalController = ({
  projectId,
  aiPlanEnabled = true,
  aiEnabled = true,
  onClose,
  onSubmit
}: UseTaskModalControllerArgs) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>(TaskPriority.MEDIUM);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState('');
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [estimateHours, setEstimateHours] = useState('');
  const [whatIfPercent, setWhatIfPercent] = useState(0);
  const [isScheduling, setIsScheduling] = useState(false);
  const [isSuggestingTags, setIsSuggestingTags] = useState(false);
  const [aiSuggestedDueDateUsed, setAiSuggestedDueDateUsed] = useState(false);
  const [showPersonalCalibration, setShowPersonalCalibration] = useState(settingsService.getSettings().showPersonalCalibration);

  const allUsers = userService.getUsers();
  const currentUser = userService.getCurrentUser();
  const estimateMinutes = estimateHours.trim() ? Math.max(0, Math.round(Number(estimateHours || 0) * 60)) : 0;

  const preview = useMemo(
    () =>
      currentUser && estimateMinutes > 0
        ? estimationService.getAdjustmentPreview(currentUser.orgId, currentUser.id, estimateMinutes, {
            projectId: projectId || undefined,
            tags
          })
        : null,
    [currentUser, estimateMinutes, projectId, tags]
  );

  const whatIfAdjustedMinutes = preview ? Math.round(preview.adjustedMinutes * (1 + whatIfPercent / 100)) : 0;

  useEffect(() => {
    const handleSettingsUpdate = (event: CustomEvent<{ showPersonalCalibration?: boolean }>) => {
      if (event?.detail) setShowPersonalCalibration(Boolean(event.detail.showPersonalCalibration));
    };
    window.addEventListener('settingsUpdated', handleSettingsUpdate as EventListener);
    return () => window.removeEventListener('settingsUpdated', handleSettingsUpdate as EventListener);
  }, []);

  const reset = () => {
    setTitle('');
    setDescription('');
    setPriority(TaskPriority.MEDIUM);
    setTags([]);
    setTagInput('');
    setDueDate('');
    setAssigneeIds([]);
    setEstimateHours('');
    setWhatIfPercent(0);
    setAiSuggestedDueDateUsed(false);
  };

  const handleSuggestDate = async () => {
    if (!ensureAiAccess({ aiPlanEnabled, aiEnabled, featureLabel: 'AI due date suggestions' })) {
      return;
    }
    if (!title.trim()) {
      await dialogService.notice('Please enter a task title first.', { title: 'Task title required' });
      return;
    }
    setIsScheduling(true);
    try {
      const suggested = await aiService.suggestDueDate(title, tags);
      setDueDate(suggested);
      setAiSuggestedDueDateUsed(true);
    } catch {
      toastService.error('AI suggestion failed', 'Could not suggest a due date right now.');
    } finally {
      setIsScheduling(false);
    }
  };

  const handleSuggestTags = async () => {
    if (!ensureAiAccess({ aiPlanEnabled, aiEnabled, featureLabel: 'AI tag suggestions' })) {
      return;
    }
    if (!title.trim()) return;
    setIsSuggestingTags(true);
    try {
      const suggested = await aiService.suggestTags(title, description);
      setTags((prev) => Array.from(new Set([...prev, ...suggested])));
    } catch {
      toastService.error('AI suggestion failed', 'Could not suggest tags right now.');
    } finally {
      setIsSuggestingTags(false);
    }
  };

  const addTagFromInput = (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter' || !tagInput.trim()) return;
    e.preventDefault();
    const nextTag = tagInput.trim();
    if (!tags.includes(nextTag)) setTags([...tags, nextTag]);
    setTagInput('');
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSubmit(
      title,
      description,
      priority,
      tags,
      dueDate ? new Date(dueDate).getTime() : undefined,
      assigneeIds,
      estimateMinutes > 0 ? estimateMinutes : undefined,
      aiSuggestedDueDateUsed ? 'used AI-suggested due date at creation' : undefined
    );
    reset();
    onClose();
  };

  return {
    title,
    setTitle,
    description,
    setDescription,
    priority,
    setPriority,
    tagInput,
    setTagInput,
    tags,
    setTags,
    dueDate,
    setDueDate,
    assigneeIds,
    setAssigneeIds,
    estimateHours,
    setEstimateHours,
    whatIfPercent,
    setWhatIfPercent,
    isScheduling,
    isSuggestingTags,
    aiPlanEnabled,
    aiEnabled,
    showPersonalCalibration,
    allUsers,
    preview,
    whatIfAdjustedMinutes,
    handleSuggestDate,
    handleSuggestTags,
    addTagFromInput,
    submit
  };
};
