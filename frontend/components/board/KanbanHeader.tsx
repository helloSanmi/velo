import React from 'react';
import { MessageSquare } from 'lucide-react';
import KanbanHeaderActions from './header/KanbanHeaderActions';
import KanbanHeaderFilters from './header/KanbanHeaderFilters';
import KanbanHeaderTitle from './header/KanbanHeaderTitle';
import { KanbanHeaderProps } from './header/types';
import { BOARD_CONTENT_GUTTER_CLASS, BOARD_INNER_WRAP_CLASS, BOARD_OUTER_WRAP_CLASS } from './layout';

const KanbanHeader: React.FC<KanbanHeaderProps> = ({
  boardView,
  onChangeBoardView,
  compactMode,
  checklistDensity,
  onChecklistDensityChange,
  activeProject,
  currentUserId,
  totals,
  forecastSummary,
  projectMetaSummary,
  savedViews,
  projectStages,
  isTriaging,
  canManageStages,
  selectedTaskIds,
  searchQuery,
  projectFilter,
  dueStatusFilter,
  includeUnscheduled,
  dueFrom,
  dueTo,
  statusFilter,
  priorityFilter,
  tagFilter,
  assigneeFilter,
  uniqueTags,
  allUsers,
  projects,
  onOpenOwnerChat,
  ownerChatUnreadCount,
  isCompletionPostponed,
  completionActionLabel,
  completionPendingLabel,
  onResumeProjectCompletion,
  pinnedInsights,
  onUnpinInsight,
  allowSavedViews,
  onSaveView,
  onApplyView,
  appliedViewId,
  onDeleteAppliedView,
  onOpenManageViews,
  onOptimizeOrder,
  onOpenStages,
  canGenerateTasksWithAI,
  onOpenGenerateTasksWithAI,
  onClearSelected,
  setStatusFilter,
  setPriorityFilter,
  setTagFilter,
  setAssigneeFilter,
  setSearchQuery,
  setProjectFilter,
  setDueStatusFilter,
  setIncludeUnscheduled,
  setDueFrom,
  setDueTo
}) => {
  const ownerId = activeProject?.createdBy || activeProject?.members?.[0];

  return (
    <div className={`flex-none ${BOARD_OUTER_WRAP_CLASS} ${compactMode ? 'pt-1.5 pb-1.5' : 'pt-2 pb-2'}`}>
      <div className={`${BOARD_INNER_WRAP_CLASS} bg-white border border-slate-200 rounded-xl`}>
        <div className={`${BOARD_CONTENT_GUTTER_CLASS} py-2 flex flex-col gap-1.5`}>
          <div className="flex items-start justify-between gap-3">
            <KanbanHeaderTitle
              projectName={activeProject ? activeProject.name : 'All Projects'}
              forecastSummary={forecastSummary}
              projectMetaSummary={projectMetaSummary}
              ownerId={ownerId}
              currentUserId={currentUserId}
              allUsers={allUsers}
              showOwner={Boolean(activeProject)}
              isCompletionPostponed={isCompletionPostponed}
              completionActionLabel={completionActionLabel}
              completionPendingLabel={completionPendingLabel}
              onResumeProjectCompletion={onResumeProjectCompletion}
              pinnedInsights={pinnedInsights}
              onUnpinInsight={onUnpinInsight}
            />
            {activeProject ? (
              <button
                onClick={onOpenOwnerChat}
                className="h-7 px-2 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-[11px] text-slate-700 inline-flex items-center gap-1.5 shrink-0"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Chat owner
                {ownerChatUnreadCount > 0 ? (
                  <span className="h-4 min-w-4 px-1 rounded-full bg-rose-100 text-rose-700 text-[10px] font-semibold inline-flex items-center justify-center">
                    {ownerChatUnreadCount}
                  </span>
                ) : null}
              </button>
            ) : null}
          </div>

          <KanbanHeaderActions
            boardView={boardView}
            onChangeBoardView={onChangeBoardView}
            checklistDensity={checklistDensity}
            onChecklistDensityChange={onChecklistDensityChange}
            allowSavedViews={allowSavedViews}
            onSaveView={onSaveView}
            savedViews={savedViews}
            onApplyView={onApplyView}
            appliedViewId={appliedViewId}
            onDeleteAppliedView={onDeleteAppliedView}
            onOpenManageViews={onOpenManageViews}
            activeProject={activeProject}
            onOptimizeOrder={onOptimizeOrder}
            isTriaging={isTriaging}
            projectStages={projectStages}
            canManageStages={canManageStages}
            onOpenStages={onOpenStages}
            canGenerateTasksWithAI={canGenerateTasksWithAI}
            onOpenGenerateTasksWithAI={onOpenGenerateTasksWithAI}
            selectedTaskIds={selectedTaskIds}
            onClearSelected={onClearSelected}
          />

          <KanbanHeaderFilters
            searchQuery={searchQuery}
            projectFilter={projectFilter}
            dueStatusFilter={dueStatusFilter}
            includeUnscheduled={includeUnscheduled}
            projects={projects}
            dueFrom={dueFrom}
            dueTo={dueTo}
            statusFilter={statusFilter}
            priorityFilter={priorityFilter}
            tagFilter={tagFilter}
            assigneeFilter={assigneeFilter}
            projectStages={projectStages}
            uniqueTags={uniqueTags}
            allUsers={allUsers}
            setStatusFilter={setStatusFilter}
            setPriorityFilter={setPriorityFilter}
            setTagFilter={setTagFilter}
            setAssigneeFilter={setAssigneeFilter}
            setSearchQuery={setSearchQuery}
            setProjectFilter={setProjectFilter}
            setDueStatusFilter={setDueStatusFilter}
            setIncludeUnscheduled={setIncludeUnscheduled}
            setDueFrom={setDueFrom}
            setDueTo={setDueTo}
          />
        </div>
      </div>
    </div>
  );
};

export default KanbanHeader;
