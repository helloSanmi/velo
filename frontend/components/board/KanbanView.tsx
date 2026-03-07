import React from 'react';
import KanbanHeader from './KanbanHeader';
import KanbanBoardContent from './KanbanBoardContent';
import KanbanOnboardingNotice from './KanbanOnboardingNotice';
import KanbanModals from './KanbanModals';
import ProjectOwnerChatModal from './ProjectOwnerChatModal';
import { KanbanViewProps } from './KanbanView.types';
import { useKanbanViewState } from './hooks/useKanbanViewState';

const KanbanView: React.FC<KanbanViewProps> = (props) => {
  const {
    currentProject,
    isOwnerChatOpen,
    setIsOwnerChatOpen,
    isGenerateTasksOpen,
    setIsGenerateTasksOpen,
    showBoardOnboarding,
    setShowBoardOnboarding,
    boardView,
    setBoardView,
    checklistDensity, setChecklistDensity,
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
    deleteAppliedView, saveManagedViews,
    totals, forecastSummary, projectMetaSummary, ownerChatUnreadCount, canGenerateTasksWithAI,
    isTriaging, handleOptimizeOrder
  } = useKanbanViewState(props);

  return (
    <div className="flex-1 flex flex-col min-h-0 w-full overflow-hidden">
      <KanbanOnboardingNotice visible={showBoardOnboarding} onDismiss={() => setShowBoardOnboarding(false)} />

      <KanbanHeader
        boardView={boardView}
        onChangeBoardView={setBoardView}
        compactMode={props.compactMode}
        checklistDensity={checklistDensity}
        onChecklistDensityChange={setChecklistDensity}
        activeProject={currentProject}
        currentUserId={props.currentUser.id}
        totals={totals}
        forecastSummary={forecastSummary}
        projectMetaSummary={projectMetaSummary}
        savedViews={savedViews}
        projectStages={projectStages}
        isTriaging={isTriaging}
        canManageStages={canManageStages}
        selectedTaskIds={props.selectedTaskIds}
        searchQuery={props.searchQuery}
        projectFilter={props.projectFilter}
        dueStatusFilter={props.dueStatusFilter}
        includeUnscheduled={props.includeUnscheduled}
        dueFrom={props.dueFrom}
        dueTo={props.dueTo}
        statusFilter={props.statusFilter}
        priorityFilter={props.priorityFilter}
        tagFilter={props.tagFilter}
        assigneeFilter={props.assigneeFilter}
        uniqueTags={props.uniqueTags}
        allUsers={props.allUsers}
        projects={props.projects}
        onOpenOwnerChat={() => setIsOwnerChatOpen(true)}
        ownerChatUnreadCount={ownerChatUnreadCount}
        isCompletionPostponed={Boolean(currentProject && props.isProjectCompletionPostponed?.(currentProject.id))}
        completionActionLabel={props.completionActionLabel ?? 'Finish project'}
        completionPendingLabel={props.completionPendingLabel}
        onResumeProjectCompletion={currentProject ? () => props.onResumeProjectCompletion?.(currentProject.id) : undefined}
        pinnedInsights={props.pinnedInsights ?? []}
        onUnpinInsight={props.onUnpinInsight}
        onSaveView={openSaveView}
        onApplyView={applySavedView}
        appliedViewId={appliedViewId}
        onDeleteAppliedView={deleteAppliedView}
        onOpenManageViews={openSavedViews}
        onOptimizeOrder={handleOptimizeOrder}
        aiPlanEnabled={props.aiPlanEnabled}
        aiEnabled={props.aiEnabled}
        onOpenStages={openStageEditor}
        canGenerateTasksWithAI={canGenerateTasksWithAI}
        onOpenGenerateTasksWithAI={() => setIsGenerateTasksOpen(true)}
        onClearSelected={() => props.setSelectedTaskIds([])}
        allowSavedViews={props.allowSavedViews ?? true}
        setStatusFilter={props.setStatusFilter}
        setPriorityFilter={props.setPriorityFilter}
        setTagFilter={props.setTagFilter}
        setAssigneeFilter={props.setAssigneeFilter}
        setSearchQuery={props.setSearchQuery}
        setProjectFilter={props.setProjectFilter}
        setDueStatusFilter={props.setDueStatusFilter}
        setIncludeUnscheduled={props.setIncludeUnscheduled}
        setDueFrom={props.setDueFrom}
        setDueTo={props.setDueTo}
      />

      <KanbanBoardContent
        boardView={boardView}
        categorizedTasks={props.categorizedTasks}
        statusFilter={props.statusFilter}
        projectStages={projectStages}
        selectedTaskIds={props.selectedTaskIds}
        allUsers={props.allUsers}
        projects={props.projects}
        activeProject={currentProject}
        checklistDensity={checklistDensity}
        canDeleteTask={props.canDeleteTask}
        aiPlanEnabled={props.aiPlanEnabled}
        aiEnabled={props.aiEnabled}
        canManageTaskAI={props.canManageTaskAI}
        canToggleTaskTimer={props.canToggleTaskTimer}
        includeUnscheduled={props.includeUnscheduled}
        onToggleTaskSelection={props.toggleTaskSelection}
        onDeleteTask={props.deleteTask}
        onUpdateStatus={props.handleStatusUpdate}
        onMoveTask={props.moveTask}
        onAIAssist={props.assistWithAI}
        onSelectTask={props.setSelectedTask}
        onAddNewTask={() => props.setIsModalOpen(true)}
        onUpdateTask={props.onUpdateTask}
        onToggleTimer={props.onToggleTimer}
      />
      <KanbanModals
        currentUserId={props.currentUser.id}
        isSavedViewsOpen={isSavedViewsOpen}
        savedViews={savedViews}
        onCloseSavedViews={closeSavedViews}
        onSaveManagedViews={saveManagedViews}
        onApplySavedView={applySavedView}
        showStageEditor={showStageEditor}
        draftStages={draftStages}
        setDraftStages={setDraftStages}
        newStageName={newStageName}
        setNewStageName={setNewStageName}
        onCloseStageEditor={closeStageEditor}
        onAddStage={addStage}
        onRemoveStage={removeStage}
        onSaveStages={saveStages}
        isSaveViewOpen={isSaveViewOpen}
        saveViewName={saveViewName}
        setSaveViewName={setSaveViewName}
        shareViewWithWorkspace={shareViewWithWorkspace}
        setShareViewWithWorkspace={setShareViewWithWorkspace}
        onCloseSaveView={closeSaveView}
        onSaveView={saveCurrentView}
        isGenerateTasksOpen={isGenerateTasksOpen}
        onCloseGenerateTasks={() => setIsGenerateTasksOpen(false)}
        activeProjectName={currentProject?.name}
        activeProjectDescription={currentProject?.description}
        assigneeCandidates={currentProject ? props.allUsers.filter((user) => currentProject.members.includes(user.id)) : []}
        projectTasks={props.activeProjectTasks}
        onGenerateTasks={(generatedTasks) => {
          if (!currentProject || !props.onGenerateProjectTasksWithAI) return;
          props.onGenerateProjectTasksWithAI(currentProject.id, generatedTasks);
        }}
      />
      {currentProject ? (
        <ProjectOwnerChatModal
          isOpen={isOwnerChatOpen}
          onClose={() => setIsOwnerChatOpen(false)}
          project={currentProject}
          currentUser={props.currentUser}
          allUsers={props.allUsers}
        />
      ) : null}
    </div>
  );
};

export default KanbanView;
