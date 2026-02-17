import { useMemo, useState } from 'react';
import { Project, ProjectStage, Task } from '../../../types';
import { toastService } from '../../../services/toastService';
import { dialogService } from '../../../services/dialogService';
import { buildProjectStages, canManageProjectStages } from '../kanbanUtils';

interface UseKanbanStageManagerOptions {
  activeProject: Project | undefined;
  categorizedTasks: Record<string, Task[]>;
  currentUserId: string;
  currentUserRole?: string;
  statusFilter: string | 'All';
  setStatusFilter: (status: string | 'All') => void;
  handleStatusUpdate: (taskId: string, status: string) => void;
  onUpdateProjectStages: (projectId: string, stages: ProjectStage[]) => void;
}

export const useKanbanStageManager = ({
  activeProject,
  categorizedTasks,
  currentUserId,
  currentUserRole,
  statusFilter,
  setStatusFilter,
  handleStatusUpdate,
  onUpdateProjectStages
}: UseKanbanStageManagerOptions) => {
  const [showStageEditor, setShowStageEditor] = useState(false);
  const [newStageName, setNewStageName] = useState('');
  const [draftStages, setDraftStages] = useState<ProjectStage[]>([]);

  const projectStages = useMemo(() => buildProjectStages(activeProject, categorizedTasks), [activeProject, categorizedTasks]);

  const canManageStages = useMemo(
    () => canManageProjectStages(activeProject, currentUserId, currentUserRole),
    [activeProject, currentUserId, currentUserRole]
  );

  const openStageEditor = () => {
    if (!canManageStages) {
      toastService.warning('Permission denied', 'Only admins or project owners can manage stages.');
      return;
    }
    setDraftStages(projectStages.map((stage) => ({ ...stage })));
    setNewStageName('');
    setShowStageEditor(true);
  };

  const closeStageEditor = () => {
    setShowStageEditor(false);
  };

  const saveStages = () => {
    if (!activeProject || !canManageStages) {
      toastService.warning('Permission denied', 'Only admins or project owners can manage stages.');
      return;
    }

    const sanitized = draftStages
      .map((stage) => ({ ...stage, name: stage.name.trim() }))
      .filter((stage) => stage.id && stage.name);

    if (sanitized.length === 0) {
      toastService.warning('Invalid stages', 'A project must have at least one stage.');
      return;
    }

    const removedStageIds = projectStages
      .map((stage) => stage.id)
      .filter((stageId) => !sanitized.some((stage) => stage.id === stageId));

    if (removedStageIds.length > 0) {
      const fallbackStageId = sanitized[0].id;
      let movedCount = 0;

      removedStageIds.forEach((stageId) => {
        const stageTasks = categorizedTasks[stageId] || [];
        stageTasks.forEach((task) => {
          handleStatusUpdate(task.id, fallbackStageId);
          movedCount += 1;
        });
      });

      if (movedCount > 0) {
        toastService.info('Tasks reassigned', `${movedCount} task${movedCount > 1 ? 's' : ''} moved to ${sanitized[0].name}.`);
      }
    }

    onUpdateProjectStages(activeProject.id, sanitized);
    setShowStageEditor(false);

    if (statusFilter !== 'All' && !sanitized.some((stage) => stage.id === statusFilter)) {
      setStatusFilter('All');
    }
  };

  const addStage = () => {
    if (!canManageStages) {
      toastService.warning('Permission denied', 'Only admins or project owners can manage stages.');
      return;
    }

    const trimmed = newStageName.trim();
    if (!trimmed) return;

    const stageId = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `stage-${Date.now()}`;
    const uniqueStageId = draftStages.some((stage) => stage.id === stageId) ? `${stageId}-${Date.now()}` : stageId;

    setDraftStages((prev) => [...prev, { id: uniqueStageId, name: trimmed }]);
    setNewStageName('');
  };

  const removeStage = async (stageId: string) => {
    if (!canManageStages) {
      toastService.warning('Permission denied', 'Only admins or project owners can manage stages.');
      return;
    }

    if (draftStages.length <= 1) {
      toastService.warning('Cannot delete stage', 'A project must keep at least one stage.');
      return;
    }

    const stage = draftStages.find((item) => item.id === stageId);
    const confirmed = await dialogService.confirm(`Delete stage "${stage?.name || 'this stage'}"?`, {
      title: 'Delete stage',
      confirmText: 'Delete',
      danger: true
    });
    if (!confirmed) return;

    setDraftStages((prev) => prev.filter((stage) => stage.id !== stageId));
    if (statusFilter !== 'All' && statusFilter === stageId) {
      setStatusFilter('All');
    }
  };

  return {
    projectStages,
    canManageStages,
    showStageEditor,
    closeStageEditor,
    newStageName,
    setNewStageName,
    draftStages,
    setDraftStages,
    openStageEditor,
    saveStages,
    addStage,
    removeStage
  };
};
