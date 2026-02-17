import React, { Suspense, lazy, useMemo } from 'react';
import { MainViewType, Project, ProjectStage, ProjectTemplate, Task, TaskPriority, User } from '../../types';
import KanbanView from '../board/KanbanView';
import { PlanFeatures } from '../../services/planFeatureService';
import { getProjectOwnerIds } from '../../services/accessPolicyService';
import RoadmapView from '../RoadmapView';
import AnalyticsView from '../analytics/AnalyticsView';
import WorkloadView from '../WorkloadView';
import ProjectsLifecycleView from '../ProjectsLifecycleView';

const IntegrationHub = lazy(() => import('../IntegrationHub'));
const TemplatesView = lazy(() => import('../templates/TemplatesView'));

interface WorkspaceMainViewProps {
  currentView: MainViewType;
  user: User;
  tasks: Task[];
  projects: Project[];
  allUsers: User[];
  allProjectTasks: Task[];
  activeProject?: Project;
  visibleProjects: Project[];
  categorizedTasks: Record<string, Task[]>;
  selectedTaskIds: string[];
  settingsCompactMode: boolean;
  settingsShowPersonalCalibration: boolean;
  aiFeaturesEnabled: boolean;
  templateQuery: string;
  templates: ProjectTemplate[];
  searchQuery: string;
  projectFilter: string | 'All';
  dueFrom?: number;
  dueTo?: number;
  statusFilter: string | 'All';
  priorityFilter: TaskPriority | 'All';
  tagFilter: string | 'All';
  assigneeFilter: string | 'All';
  uniqueTags: string[];
  setTemplateQuery: (value: string) => void;
  setProjectModalTemplateId: (value: string | null) => void;
  setIsProjectModalOpen: (value: boolean) => void;
  setStatusFilter: (s: string | 'All') => void;
  setPriorityFilter: (p: TaskPriority | 'All') => void;
  setTagFilter: (t: string) => void;
  setAssigneeFilter: (a: string) => void;
  setSearchQuery: (value: string) => void;
  setProjectFilter: (value: string | 'All') => void;
  setDueFrom: (value?: number) => void;
  setDueTo: (value?: number) => void;
  setSelectedTaskIds: (ids: string[]) => void;
  toggleTaskSelection: (id: string) => void;
  handleDeleteTaskWithPolicy: (id: string) => void;
  handleStatusUpdateWithPolicy: (id: string, status: string) => void;
  handleMoveTaskWithPolicy: (taskId: string, targetStatus: string, targetTaskId?: string) => void;
  assistWithAI: (task: Task) => void;
  setSelectedTask: (task: Task | null) => void;
  setIsModalOpen: (open: boolean) => void;
  refreshTasks: () => void;
  handleUpdateProject: (id: string, updates: Partial<Project>) => void;
  handleRenameProject: (id: string, name: string) => void;
  handleCompleteProject: (id: string) => void;
  handleReopenProject: (id: string) => void;
  handleArchiveProject: (id: string) => void;
  handleRestoreProject: (id: string) => void;
  handleDeleteProject: (id: string) => void;
  handlePurgeProject: (id: string) => void;
  handleBulkLifecycleAction: (action: 'complete' | 'archive' | 'delete' | 'restore' | 'reopen' | 'purge', ids: string[]) => void;
  handleUpdateTaskWithPolicy: (id: string, updates: Partial<Omit<Task, 'id' | 'userId' | 'createdAt' | 'order'>>) => void;
  onToggleTimer?: (id: string) => void;
  canDeleteTask: (taskId: string) => boolean;
  canManageTask: (taskId: string) => boolean;
  canToggleTaskTimer: (taskId: string) => boolean;
  isProjectCompletionPostponed: (projectId: string) => boolean;
  getProjectCompletionActionLabel: (projectId: string) => string;
  getProjectCompletionPendingLabel: (projectId: string) => string | undefined;
  onResumeProjectCompletion: (projectId: string) => void;
  planFeatures: PlanFeatures;
  onGenerateProjectTasksWithAI?: (
    projectId: string,
    tasks: Array<{ title: string; description: string; priority: TaskPriority; tags: string[] }>
  ) => void;
  pinnedInsights?: string[];
  onUnpinInsight?: (insight: string) => void;
}

const WorkspaceMainView: React.FC<WorkspaceMainViewProps> = ({
  currentView,
  user,
  tasks,
  projects,
  allUsers,
  allProjectTasks,
  activeProject,
  visibleProjects,
  categorizedTasks,
  selectedTaskIds,
  settingsCompactMode,
  settingsShowPersonalCalibration,
  aiFeaturesEnabled,
  templateQuery,
  templates,
  searchQuery,
  projectFilter,
  dueFrom,
  dueTo,
  statusFilter,
  priorityFilter,
  tagFilter,
  assigneeFilter,
  uniqueTags,
  setTemplateQuery,
  setProjectModalTemplateId,
  setIsProjectModalOpen,
  setStatusFilter,
  setPriorityFilter,
  setTagFilter,
  setAssigneeFilter,
  setSearchQuery,
  setProjectFilter,
  setDueFrom,
  setDueTo,
  setSelectedTaskIds,
  toggleTaskSelection,
  handleDeleteTaskWithPolicy,
  handleStatusUpdateWithPolicy,
  handleMoveTaskWithPolicy,
  assistWithAI,
  setSelectedTask,
  setIsModalOpen,
  refreshTasks,
  handleUpdateProject,
  handleRenameProject,
  handleCompleteProject,
  handleReopenProject,
  handleArchiveProject,
  handleRestoreProject,
  handleDeleteProject,
  handlePurgeProject,
  handleBulkLifecycleAction,
  handleUpdateTaskWithPolicy,
  onToggleTimer,
  canDeleteTask,
  canManageTask,
  canToggleTaskTimer,
  isProjectCompletionPostponed,
  getProjectCompletionActionLabel,
  getProjectCompletionPendingLabel,
  onResumeProjectCompletion,
  planFeatures,
  onGenerateProjectTasksWithAI,
  pinnedInsights = [],
  onUnpinInsight
}) => {
  const withLazy = (node: React.ReactNode) => (
    <Suspense fallback={<div className="flex-1 p-6 text-sm text-slate-500">Loading view...</div>}>{node}</Suspense>
  );
  const upgradeView = (title: string, detail: string) => (
    <div className="flex-1 p-6 md:p-8">
      <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        <p className="mt-1.5 text-sm text-slate-600">{detail}</p>
      </div>
    </div>
  );

  const visibleProjectIds = useMemo(() => new Set(visibleProjects.map((project) => project.id)), [visibleProjects]);
  const scopedTasks = useMemo(
    () => tasks.filter((task) => task.projectId === 'general' || visibleProjectIds.has(task.projectId)),
    [tasks, visibleProjectIds]
  );
  const scopedProjectTasks = useMemo(
    () => allProjectTasks.filter((task) => task.projectId === 'general' || visibleProjectIds.has(task.projectId)),
    [allProjectTasks, visibleProjectIds]
  );
  const scopedUsers = useMemo(() => {
    const memberIds = new Set<string>([user.id]);
    visibleProjects.forEach((project) => project.members.forEach((memberId) => memberIds.add(memberId)));
    scopedTasks.forEach((task) => {
      if (task.assigneeId) memberIds.add(task.assigneeId);
      (task.assigneeIds || []).forEach((assigneeId) => memberIds.add(assigneeId));
    });
    return allUsers.filter((member) => memberIds.has(member.id));
  }, [allUsers, scopedTasks, user.id, visibleProjects]);
  const activeVisibleProjects = useMemo(
    () => visibleProjects.filter((project) => !project.isArchived && !project.isCompleted && !project.isDeleted),
    [visibleProjects]
  );
  const activeVisibleProjectIds = useMemo(() => new Set(activeVisibleProjects.map((project) => project.id)), [activeVisibleProjects]);
  const crossProjectProjectIds = useMemo(() => {
    if (user.role === 'admin') return activeVisibleProjectIds;
    return new Set(
      activeVisibleProjects
        .filter((project) => {
          if (project.isPublic) return true;
          if (project.members.includes(user.id)) return true;
          return getProjectOwnerIds(project).includes(user.id);
        })
        .map((project) => project.id)
    );
  }, [activeVisibleProjectIds, activeVisibleProjects, user.id, user.role]);
  const crossProjectProjects = useMemo(
    () => activeVisibleProjects.filter((project) => crossProjectProjectIds.has(project.id)),
    [activeVisibleProjects, crossProjectProjectIds]
  );
  const crossProjectTasks = useMemo(
    () => scopedTasks.filter((task) => task.projectId === 'general' || crossProjectProjectIds.has(task.projectId)),
    [crossProjectProjectIds, scopedTasks]
  );
  switch (currentView) {
    case 'projects':
      return (
        <ProjectsLifecycleView
          currentUserRole={user.role}
          currentUserId={user.id}
          projects={visibleProjects}
          allUsers={allUsers}
          projectTasks={scopedProjectTasks}
          activeProjectId={activeProject?.id || null}
          onUpdateProject={handleUpdateProject}
          onRenameProject={handleRenameProject}
          onCompleteProject={handleCompleteProject}
          onReopenProject={handleReopenProject}
          onArchiveProject={handleArchiveProject}
          onRestoreProject={handleRestoreProject}
          onDeleteProject={handleDeleteProject}
          onPurgeProject={handlePurgeProject}
          onBulkLifecycleAction={handleBulkLifecycleAction}
        />
      );
    case 'analytics':
      if (!planFeatures.analytics) return upgradeView('Analytics unavailable', 'Upgrade to Basic or Pro to unlock analytics.');
      return (
        <AnalyticsView
          tasks={crossProjectTasks}
          projects={crossProjectProjects}
          allUsers={scopedUsers}
          orgId={user.orgId}
          onUpdateTask={handleUpdateTaskWithPolicy}
        />
      );
    case 'roadmap':
      return withLazy(<RoadmapView tasks={crossProjectTasks} projects={crossProjectProjects} />);
    case 'resources':
      if (!planFeatures.resources) return upgradeView('Resources unavailable', 'Upgrade to Basic or Pro to unlock resource planning.');
      return (
        <WorkloadView
          users={scopedUsers}
          tasks={crossProjectTasks}
          onReassign={(taskId, userId) => handleUpdateTaskWithPolicy(taskId, { assigneeId: userId, assigneeIds: [userId] })}
        />
      );
    case 'integrations':
      if (!planFeatures.integrations) return upgradeView('Integrations unavailable', 'Upgrade to Basic or Pro to unlock integrations.');
      return withLazy(<IntegrationHub projects={projects} onUpdateProject={handleUpdateProject} />);
    case 'templates':
      return withLazy(
        <TemplatesView
          templateQuery={templateQuery}
          setTemplateQuery={setTemplateQuery}
          templates={templates}
          onUseTemplate={(templateId) => {
            setProjectModalTemplateId(templateId);
            setIsProjectModalOpen(true);
          }}
        />
      );
    default:
      return (
        <KanbanView
          searchQuery={searchQuery}
          projectFilter={projectFilter}
          projects={activeVisibleProjects}
          dueFrom={dueFrom}
          dueTo={dueTo}
          statusFilter={statusFilter}
          priorityFilter={priorityFilter}
          tagFilter={tagFilter}
          assigneeFilter={assigneeFilter}
          uniqueTags={uniqueTags}
          allUsers={allUsers}
          currentUser={user}
          activeProject={activeProject}
          activeProjectTasks={activeProject ? allProjectTasks.filter((task) => task.projectId === activeProject.id) : []}
          categorizedTasks={categorizedTasks}
          selectedTaskIds={selectedTaskIds}
          compactMode={settingsCompactMode}
          showPersonalCalibration={settingsShowPersonalCalibration}
          setStatusFilter={setStatusFilter}
          setPriorityFilter={setPriorityFilter}
          setTagFilter={setTagFilter}
          setAssigneeFilter={setAssigneeFilter}
          setProjectFilter={setProjectFilter}
          setSearchQuery={setSearchQuery}
          setDueFrom={setDueFrom}
          setDueTo={setDueTo}
          setSelectedTaskIds={setSelectedTaskIds}
          toggleTaskSelection={toggleTaskSelection}
          deleteTask={handleDeleteTaskWithPolicy}
          canDeleteTask={canDeleteTask}
          canUseTaskAI={(taskId) => aiFeaturesEnabled && canManageTask(taskId)}
          canToggleTaskTimer={canToggleTaskTimer}
          onToggleTimer={onToggleTimer}
          isProjectCompletionPostponed={isProjectCompletionPostponed}
          completionActionLabel={activeProject ? getProjectCompletionActionLabel(activeProject.id) : 'Finish project'}
          completionPendingLabel={activeProject ? getProjectCompletionPendingLabel(activeProject.id) : undefined}
          onResumeProjectCompletion={onResumeProjectCompletion}
          allowSavedViews={planFeatures.savedViews}
          handleStatusUpdate={handleStatusUpdateWithPolicy}
          moveTask={handleMoveTaskWithPolicy}
          assistWithAI={assistWithAI}
          setSelectedTask={setSelectedTask}
          setIsModalOpen={setIsModalOpen}
          refreshTasks={refreshTasks}
          onUpdateProjectStages={(projectId, stages: ProjectStage[]) => handleUpdateProject(projectId, { stages })}
          onGenerateProjectTasksWithAI={onGenerateProjectTasksWithAI}
          pinnedInsights={pinnedInsights}
          onUnpinInsight={onUnpinInsight}
        />
      );
  }
};

export default WorkspaceMainView;
