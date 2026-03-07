import { useState } from 'react';
import { useSavedBoardViews } from './useSavedBoardViews';
import { useKanbanStageManager } from './useKanbanStageManager';
import { useKanbanTriage } from './useKanbanTriage';
import { useBoardUiState } from './useBoardUiState';
import { useKanbanComputed } from './useKanbanComputed';
import { KanbanViewProps } from '../KanbanView.types';

export const useKanbanViewState = (props: KanbanViewProps) => {
  const currentProject = props.activeProject;
  const [isOwnerChatOpen, setIsOwnerChatOpen] = useState(false);
  const [isGenerateTasksOpen, setIsGenerateTasksOpen] = useState(false);

  const {
    showBoardOnboarding,
    setShowBoardOnboarding,
    boardView,
    setBoardView,
    checklistDensity,
    setChecklistDensity
  } = useBoardUiState({ compactMode: props.compactMode });

  const {
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
  } = useKanbanStageManager({
    activeProject: props.activeProject,
    categorizedTasks: props.categorizedTasks,
    currentUserId: props.currentUser.id,
    currentUserRole: props.currentUser.role,
    statusFilter: props.statusFilter,
    setStatusFilter: props.setStatusFilter,
    handleStatusUpdate: props.handleStatusUpdate,
    onUpdateProjectStages: props.onUpdateProjectStages
  });

  const {
    savedViews,
    appliedViewId,
    isSavedViewsOpen,
    openSavedViews,
    closeSavedViews,
    isSaveViewOpen,
    openSaveView,
    closeSaveView,
    saveViewName,
    setSaveViewName,
    shareViewWithWorkspace,
    setShareViewWithWorkspace,
    saveCurrentView,
    applySavedView,
    deleteAppliedView,
    saveManagedViews
  } = useSavedBoardViews({
    currentUser: props.currentUser,
    searchQuery: props.searchQuery,
    projectFilter: props.projectFilter,
    statusFilter: props.statusFilter,
    priorityFilter: props.priorityFilter,
    tagFilter: props.tagFilter,
    assigneeFilter: props.assigneeFilter,
    dueStatusFilter: props.dueStatusFilter,
    includeUnscheduled: props.includeUnscheduled,
    dueFrom: props.dueFrom,
    dueTo: props.dueTo,
    boardView,
    setSearchQuery: props.setSearchQuery,
    setProjectFilter: props.setProjectFilter,
    setStatusFilter: props.setStatusFilter,
    setPriorityFilter: props.setPriorityFilter,
    setTagFilter: props.setTagFilter,
    setAssigneeFilter: props.setAssigneeFilter,
    setDueStatusFilter: props.setDueStatusFilter,
    setIncludeUnscheduled: props.setIncludeUnscheduled,
    setDueFrom: props.setDueFrom,
    setDueTo: props.setDueTo,
    setBoardView
  });

  const { totals, forecastSummary, projectMetaSummary, ownerChatUnreadCount, canGenerateTasksWithAI } = useKanbanComputed({
    categorizedTasks: props.categorizedTasks,
    projectStages,
    currentUser: props.currentUser,
    activeProject: props.activeProject,
    activeProjectTasks: props.activeProjectTasks,
    showPersonalCalibration: props.showPersonalCalibration,
    onGenerateProjectTasksWithAI: props.onGenerateProjectTasksWithAI
  });

  const { isTriaging, handleOptimizeOrder } = useKanbanTriage({
    activeProject: props.activeProject,
    projectStages,
    categorizedTasks: props.categorizedTasks,
    refreshTasks: props.refreshTasks,
    aiPlanEnabled: props.aiPlanEnabled,
    aiEnabled: props.aiEnabled
  });

  return {
    currentProject,
    isOwnerChatOpen,
    setIsOwnerChatOpen,
    isGenerateTasksOpen,
    setIsGenerateTasksOpen,
    showBoardOnboarding,
    setShowBoardOnboarding,
    boardView,
    setBoardView,
    checklistDensity,
    setChecklistDensity,
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
    removeStage,
    savedViews,
    appliedViewId,
    isSavedViewsOpen,
    openSavedViews,
    closeSavedViews,
    isSaveViewOpen,
    openSaveView,
    closeSaveView,
    saveViewName,
    setSaveViewName,
    shareViewWithWorkspace,
    setShareViewWithWorkspace,
    saveCurrentView,
    applySavedView,
    deleteAppliedView,
    saveManagedViews,
    totals,
    forecastSummary,
    projectMetaSummary,
    ownerChatUnreadCount,
    canGenerateTasksWithAI,
    isTriaging,
    handleOptimizeOrder
  };
};
