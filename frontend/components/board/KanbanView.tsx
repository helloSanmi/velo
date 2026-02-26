import React, { useEffect, useMemo, useState } from 'react';
import { Project, ProjectStage, Task, TaskPriority, User } from '../../types';
import KanbanHeader from './KanbanHeader';
import KanbanBoard from './KanbanBoard';
import BoardTableView from './BoardTableView';
import BoardTimelineView from './BoardTimelineView';
import BoardCalendarView from './BoardCalendarView';
import BoardGanttView from './BoardGanttView';
import BoardWorkloadView from './BoardWorkloadView';
import BoardChecklistView from './BoardChecklistView';
import KanbanModals from './KanbanModals';
import ProjectOwnerChatModal from './ProjectOwnerChatModal';
import { computeKanbanTotals } from './kanbanUtils';
import { useSavedBoardViews } from './hooks/useSavedBoardViews';
import { useKanbanStageManager } from './hooks/useKanbanStageManager';
import { useKanbanTriage } from './hooks/useKanbanTriage';
import { projectChatService } from '../../services/projectChatService';
import { realtimeService } from '../../services/realtimeService';
import { estimationService } from '../../services/estimationService';
import { canManageProject } from '../../services/permissionService';
import { BOARD_CONTENT_GUTTER_CLASS, BOARD_INNER_WRAP_CLASS, BOARD_OUTER_WRAP_CLASS } from './layout';

interface KanbanViewProps {
  searchQuery: string;
  projectFilter: string | 'All';
  dueStatusFilter: 'All' | 'Scheduled' | 'Unscheduled';
  includeUnscheduled: boolean;
  projects: Project[];
  dueFrom?: number;
  dueTo?: number;
  statusFilter: string | 'All';
  priorityFilter: TaskPriority | 'All';
  tagFilter: string | 'All';
  assigneeFilter: string | 'All';
  uniqueTags: string[];
  allUsers: User[];
  currentUser: User;
  activeProject: Project | undefined;
  activeProjectTasks: Task[];
  categorizedTasks: Record<string, Task[]>;
  selectedTaskIds: string[];
  compactMode: boolean;
  showPersonalCalibration: boolean;
  setStatusFilter: (s: string | 'All') => void;
  setPriorityFilter: (p: TaskPriority | 'All') => void;
  setTagFilter: (t: string) => void;
  setAssigneeFilter: (a: string) => void;
  setSearchQuery: (value: string) => void;
  setProjectFilter: (value: string | 'All') => void;
  setDueStatusFilter: (value: 'All' | 'Scheduled' | 'Unscheduled') => void;
  setIncludeUnscheduled: (value: boolean) => void;
  setDueFrom: (value?: number) => void;
  setDueTo: (value?: number) => void;
  setSelectedTaskIds: (ids: string[]) => void;
  toggleTaskSelection: (id: string) => void;
  deleteTask: (id: string) => void;
  handleStatusUpdate: (id: string, status: string) => void;
  moveTask: (taskId: string, targetStatus: string, targetTaskId?: string) => void;
  assistWithAI: (task: Task) => void;
  setSelectedTask: (task: Task) => void;
  setIsModalOpen: (open: boolean) => void;
  onUpdateTask: (id: string, updates: Partial<Omit<Task, 'id' | 'userId' | 'createdAt' | 'order'>>) => void;
  onToggleTimer?: (id: string) => void;
  canDeleteTask?: (taskId: string) => boolean;
  canUseTaskAI?: (taskId: string) => boolean;
  canToggleTaskTimer?: (taskId: string) => boolean;
  isProjectCompletionPostponed?: (projectId: string) => boolean;
  completionActionLabel?: string;
  completionPendingLabel?: string;
  onResumeProjectCompletion?: (projectId: string) => void;
  refreshTasks?: () => void;
  onUpdateProjectStages: (projectId: string, stages: ProjectStage[]) => void;
  allowSavedViews?: boolean;
  onGenerateProjectTasksWithAI?: (
    projectId: string,
    tasks: Array<{ title: string; description: string; priority: TaskPriority; tags: string[]; assigneeIds?: string[] }>
  ) => void;
  pinnedInsights?: string[];
  onUnpinInsight?: (insight: string) => void;
}

const KanbanView: React.FC<KanbanViewProps> = ({
  searchQuery,
  projectFilter,
  dueStatusFilter,
  includeUnscheduled,
  projects,
  dueFrom,
  dueTo,
  statusFilter,
  priorityFilter,
  tagFilter,
  assigneeFilter,
  uniqueTags,
  allUsers,
  currentUser,
  activeProject,
  activeProjectTasks,
  categorizedTasks,
  selectedTaskIds,
  compactMode,
  showPersonalCalibration,
  setStatusFilter,
  setPriorityFilter,
  setTagFilter,
  setAssigneeFilter,
  setSearchQuery,
  setProjectFilter,
  setDueStatusFilter,
  setIncludeUnscheduled,
  setDueFrom,
  setDueTo,
  setSelectedTaskIds,
  toggleTaskSelection,
  deleteTask,
  handleStatusUpdate,
  moveTask,
  assistWithAI,
  setSelectedTask,
  setIsModalOpen,
  onUpdateTask,
  onToggleTimer,
  canDeleteTask,
  canUseTaskAI,
  canToggleTaskTimer,
  isProjectCompletionPostponed,
  completionActionLabel = 'Finish project',
  completionPendingLabel,
  onResumeProjectCompletion,
  refreshTasks,
  onUpdateProjectStages,
  allowSavedViews = true,
  onGenerateProjectTasksWithAI,
  pinnedInsights = [],
  onUnpinInsight
}) => {
  const [isOwnerChatOpen, setIsOwnerChatOpen] = useState(false);
  const [ownerChatUnreadCount, setOwnerChatUnreadCount] = useState(0);
  const [isGenerateTasksOpen, setIsGenerateTasksOpen] = useState(false);
  const [showBoardOnboarding, setShowBoardOnboarding] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem('velo_board_views_onboarding_v1') !== 'seen';
  });
  const [boardView, setBoardView] = useState<'kanban' | 'checklist' | 'table' | 'timeline' | 'calendar' | 'gantt' | 'workload'>(() => {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem('velo_board_view') : null;
    return saved === 'table'
      ? 'table'
      : saved === 'checklist'
        ? 'checklist'
      : saved === 'timeline'
        ? 'timeline'
        : saved === 'calendar'
          ? 'calendar'
          : saved === 'gantt'
            ? 'gantt'
          : saved === 'workload'
            ? 'workload'
            : 'kanban';
  });

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
    activeProject,
    categorizedTasks,
    currentUserId: currentUser.id,
    currentUserRole: currentUser.role,
    statusFilter,
    setStatusFilter,
    handleStatusUpdate,
    onUpdateProjectStages
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
    currentUser,
    searchQuery,
    projectFilter,
    statusFilter,
    priorityFilter,
    tagFilter,
    assigneeFilter,
    dueStatusFilter,
    includeUnscheduled,
    dueFrom,
    dueTo,
    boardView,
    setSearchQuery,
    setProjectFilter,
    setStatusFilter,
    setPriorityFilter,
    setTagFilter,
    setAssigneeFilter,
    setDueStatusFilter,
    setIncludeUnscheduled,
    setDueFrom,
    setDueTo,
    setBoardView
  });

  const totals = useMemo(() => computeKanbanTotals(categorizedTasks, projectStages), [categorizedTasks, projectStages]);
  const forecastSummary = useMemo(() => {
    const tasks = Object.values(categorizedTasks).flat();
    const estimatedMinutes = tasks.reduce((sum, task) => sum + (task.estimateMinutes || 0), 0);
    const adjustedMinutes = tasks.reduce((sum, task) => {
      if (!task.estimateMinutes || task.estimateMinutes <= 0) return sum;
      const estimatorId = task.estimateProvidedBy || task.userId;
      const preview = estimationService.getAdjustmentPreview(currentUser.orgId, estimatorId, task.estimateMinutes, {
        projectId: task.projectId,
        status: task.status,
        tags: task.tags
      });
      return sum + preview.adjustedMinutes;
    }, 0);
    const factor = estimatedMinutes > 0 ? adjustedMinutes / estimatedMinutes : 1;
    const riskLabel = factor >= 1.3 ? 'At risk' : factor >= 1.1 ? 'Tight' : 'On-track';
    return { estimatedMinutes, adjustedMinutes, riskLabel } as const;
  }, [categorizedTasks, currentUser.orgId]);
  const { isTriaging, handleOptimizeOrder } = useKanbanTriage({
    activeProject,
    projectStages,
    categorizedTasks,
    refreshTasks
  });
  const canGenerateTasksWithAI = Boolean(
    activeProject && onGenerateProjectTasksWithAI && canManageProject(currentUser, activeProject)
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('velo_board_view', boardView);
  }, [boardView]);

  useEffect(() => {
    if (!showBoardOnboarding || typeof window === 'undefined') return;
    window.localStorage.setItem('velo_board_views_onboarding_v1', 'seen');
  }, [showBoardOnboarding]);

  useEffect(() => {
    if (!activeProject) {
      setOwnerChatUnreadCount(0);
      return;
    }

    const refreshUnread = () => {
      setOwnerChatUnreadCount(
        projectChatService.getUnreadCountForUser(activeProject.orgId, activeProject.id, currentUser.id)
      );
    };

    refreshUnread();
    const unsubscribe = realtimeService.subscribe((event) => {
      if (event.type !== 'PROJECT_CHAT_UPDATED') return;
      if (event.orgId !== activeProject.orgId) return;
      if (event.payload?.projectId !== activeProject.id) return;
      refreshUnread();
    });
    return () => unsubscribe();
  }, [activeProject, currentUser.id]);

  const projectMetaSummary = useMemo(() => {
    if (!activeProject) return undefined;
    const now = Date.now();
    const trackedMs = activeProjectTasks.reduce((sum, task) => {
      const base = task.timeLogged || 0;
      if (task.isTimerRunning && task.timerStartedAt) {
        return sum + base + Math.max(0, Date.now() - task.timerStartedAt);
      }
      return sum + base;
    }, 0);
    const trackedHours = trackedMs / 3600000;
    const hourlyRate = typeof activeProject.hourlyRate === 'number' ? activeProject.hourlyRate : undefined;
    const trackedCost = hourlyRate ? trackedHours * hourlyRate : undefined;
    const budgetCost = typeof activeProject.budgetCost === 'number' ? activeProject.budgetCost : undefined;
    const overBudget =
      typeof budgetCost === 'number' &&
      Number.isFinite(budgetCost) &&
      typeof trackedCost === 'number' &&
      trackedCost > budgetCost;
    const budgetRatio =
      typeof budgetCost === 'number' && budgetCost > 0 && typeof trackedCost === 'number'
        ? trackedCost / budgetCost
        : undefined;
    const budgetStatus: 'healthy' | 'near' | 'over' =
      overBudget ? 'over' : typeof budgetRatio === 'number' && budgetRatio >= 0.8 ? 'near' : 'healthy';
    const timelineStatus: 'healthy' | 'near' | 'over' | 'neutral' = !activeProject.endDate
      ? 'neutral'
      : activeProject.endDate < now
        ? 'over'
        : ((activeProject.endDate - now) / 86400000) <= 7
          ? 'near'
          : 'healthy';
    const scopeSize = typeof activeProject.scopeSize === 'number' ? activeProject.scopeSize : undefined;
    const scopeStatus: 'healthy' | 'near' | 'over' | 'neutral' =
      typeof scopeSize !== 'number' || scopeSize <= 0
        ? 'neutral'
        : activeProjectTasks.length > scopeSize
          ? 'over'
          : activeProjectTasks.length >= Math.ceil(scopeSize * 0.85)
            ? 'near'
            : 'healthy';
    return {
      timeline: `${activeProject.startDate ? new Date(activeProject.startDate).toLocaleDateString() : 'No start'} - ${
        activeProject.endDate ? new Date(activeProject.endDate).toLocaleDateString() : 'No end'
      }`,
      timelineStatus,
      scopeStatus,
      scope: typeof activeProject.scopeSize === 'number' ? `${activeProject.scopeSize} tasks` : activeProject.scopeSummary || 'Not set',
      budget: typeof activeProject.budgetCost === 'number' ? `$${Math.round(activeProject.budgetCost).toLocaleString()}` : 'Not set',
      tracked: `${trackedHours.toFixed(1)}h`,
      trackedCost: typeof trackedCost === 'number' ? `$${Math.round(trackedCost).toLocaleString()}` : undefined,
      hourlyRate: typeof hourlyRate === 'number' ? `$${hourlyRate.toFixed(2)}/h` : undefined,
      overBudget,
      budgetStatus
    } as const;
  }, [activeProject, activeProjectTasks]);

  return (
    <div className="flex-1 flex flex-col min-h-0 w-full overflow-hidden">
      {showBoardOnboarding ? (
        <div className={`${BOARD_OUTER_WRAP_CLASS} pt-2`}>
          <div className={`${BOARD_INNER_WRAP_CLASS} ${BOARD_CONTENT_GUTTER_CLASS}`}>
            <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 flex items-start justify-between gap-2">
            <p className="text-xs text-indigo-800">
              New board modes available: use <span className="font-semibold">Kanban</span>, <span className="font-semibold">Checklist</span>, <span className="font-semibold">Gantt</span>, <span className="font-semibold">Table</span>, <span className="font-semibold">Calendar</span>, and <span className="font-semibold">Workload</span> from the top switcher.
            </p>
            <button
              type="button"
              className="text-[11px] rounded border border-indigo-200 bg-white px-2 py-0.5 text-indigo-700 hover:bg-indigo-100"
              onClick={() => setShowBoardOnboarding(false)}
            >
              Dismiss
            </button>
            </div>
          </div>
        </div>
      ) : null}

      <KanbanHeader
        boardView={boardView}
        onChangeBoardView={setBoardView}
        compactMode={compactMode}
        activeProject={activeProject}
        currentUserId={currentUser.id}
        totals={totals}
        forecastSummary={showPersonalCalibration ? forecastSummary : undefined}
        projectMetaSummary={projectMetaSummary}
        savedViews={savedViews}
        projectStages={projectStages}
        isTriaging={isTriaging}
        canManageStages={canManageStages}
        selectedTaskIds={selectedTaskIds}
        searchQuery={searchQuery}
        projectFilter={projectFilter}
        dueStatusFilter={dueStatusFilter}
        includeUnscheduled={includeUnscheduled}
        dueFrom={dueFrom}
        dueTo={dueTo}
        statusFilter={statusFilter}
        priorityFilter={priorityFilter}
        tagFilter={tagFilter}
        assigneeFilter={assigneeFilter}
        uniqueTags={uniqueTags}
        allUsers={allUsers}
        projects={projects}
        onOpenOwnerChat={() => setIsOwnerChatOpen(true)}
        ownerChatUnreadCount={ownerChatUnreadCount}
        isCompletionPostponed={Boolean(activeProject && isProjectCompletionPostponed?.(activeProject.id))}
        completionActionLabel={completionActionLabel}
        completionPendingLabel={completionPendingLabel}
        onResumeProjectCompletion={activeProject ? () => onResumeProjectCompletion?.(activeProject.id) : undefined}
        pinnedInsights={pinnedInsights}
        onUnpinInsight={onUnpinInsight}
        onSaveView={openSaveView}
        onApplyView={applySavedView}
        appliedViewId={appliedViewId}
        onDeleteAppliedView={deleteAppliedView}
        onOpenManageViews={openSavedViews}
        onOptimizeOrder={handleOptimizeOrder}
        onOpenStages={openStageEditor}
        canGenerateTasksWithAI={canGenerateTasksWithAI}
        onOpenGenerateTasksWithAI={() => setIsGenerateTasksOpen(true)}
        onClearSelected={() => setSelectedTaskIds([])}
        allowSavedViews={allowSavedViews}
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

      {boardView === 'kanban' ? (
        <KanbanBoard
          categorizedTasks={categorizedTasks}
          statusFilter={statusFilter}
          statusOptions={projectStages}
          selectedTaskIds={selectedTaskIds}
          onToggleTaskSelection={toggleTaskSelection}
          onDeleteTask={deleteTask}
          onUpdateStatus={handleStatusUpdate}
          onMoveTask={moveTask}
          onAIAssist={assistWithAI}
          onSelectTask={setSelectedTask}
          onAddNewTask={() => setIsModalOpen(true)}
          onToggleTimer={onToggleTimer}
          canDeleteTask={canDeleteTask}
          canUseTaskAI={canUseTaskAI}
          canToggleTaskTimer={canToggleTaskTimer}
          showProjectNameOnCards={!activeProject}
        />
      ) : boardView === 'checklist' ? (
        <BoardChecklistView
          categorizedTasks={categorizedTasks}
          statusFilter={statusFilter}
          statusOptions={projectStages}
          allUsers={allUsers}
          compactMode={compactMode}
          onSelectTask={setSelectedTask}
          onUpdateTask={onUpdateTask}
          onMoveTask={moveTask}
          onAddNewTask={() => setIsModalOpen(true)}
        />
      ) : boardView === 'table' ? (
        <BoardTableView
          categorizedTasks={categorizedTasks}
          statusFilter={statusFilter}
          statusOptions={projectStages}
          projects={projects}
          allUsers={allUsers}
          activeProject={activeProject}
          onSelectTask={setSelectedTask}
          onUpdateStatus={handleStatusUpdate}
          onUpdateTask={onUpdateTask}
          onToggleTimer={onToggleTimer}
          canToggleTaskTimer={canToggleTaskTimer}
        />
      ) : (
        boardView === 'timeline' ? (
          <BoardTimelineView
            categorizedTasks={categorizedTasks}
            statusFilter={statusFilter}
            statusOptions={projectStages}
            includeUnscheduled={includeUnscheduled}
            onSelectTask={setSelectedTask}
            onUpdateTask={onUpdateTask}
          />
        ) : boardView === 'calendar' ? (
          <BoardCalendarView
            categorizedTasks={categorizedTasks}
            statusFilter={statusFilter}
            statusOptions={projectStages}
            includeUnscheduled={includeUnscheduled}
            onSelectTask={setSelectedTask}
            onUpdateTask={onUpdateTask}
          />
        ) : boardView === 'gantt' ? (
          <BoardGanttView
            categorizedTasks={categorizedTasks}
            statusFilter={statusFilter}
            statusOptions={projectStages}
            includeUnscheduled={includeUnscheduled}
            onSelectTask={setSelectedTask}
            onUpdateTask={onUpdateTask}
          />
        ) : (
          <BoardWorkloadView
            categorizedTasks={categorizedTasks}
            statusFilter={statusFilter}
            statusOptions={projectStages}
            allUsers={allUsers}
            onSelectTask={setSelectedTask}
            onReassign={(taskId, userId) => onUpdateTask(taskId, { assigneeId: userId, assigneeIds: [userId] })}
          />
        )
      )}
      <KanbanModals
        currentUserId={currentUser.id}
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
        activeProjectName={activeProject?.name}
        activeProjectDescription={activeProject?.description}
        assigneeCandidates={activeProject ? allUsers.filter((user) => activeProject.members.includes(user.id)) : []}
        projectTasks={activeProjectTasks}
        onGenerateTasks={(generatedTasks) => {
          if (!activeProject || !onGenerateProjectTasksWithAI) return;
          onGenerateProjectTasksWithAI(activeProject.id, generatedTasks);
        }}
      />
      {activeProject ? (
        <ProjectOwnerChatModal
          isOpen={isOwnerChatOpen}
          onClose={() => setIsOwnerChatOpen(false)}
          project={activeProject}
          currentUser={currentUser}
          allUsers={allUsers}
        />
      ) : null}
    </div>
  );
};

export default KanbanView;
