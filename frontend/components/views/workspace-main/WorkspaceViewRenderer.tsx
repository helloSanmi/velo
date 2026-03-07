import React, { Suspense, lazy } from 'react';
import KanbanView from '../../board/KanbanView';
import RoadmapView from '../../RoadmapView';
import AnalyticsView from '../../analytics/AnalyticsView';
import WorkloadView from '../../WorkloadView';
import ProjectsLifecycleView from '../../ProjectsLifecycleView';
import { ProjectStage } from '../../../types';
import { WorkspaceMainViewProps } from './types';
import {
  getPlanUnavailableTitle,
  getPlanUpgradeMessage
} from '../../../services/planAccessService';

const IntegrationHub = lazy(() => import('../../IntegrationHub'));
const TemplatesView = lazy(() => import('../../templates/TemplatesView'));
const TicketsView = lazy(() => import('../../tickets/TicketsView'));

interface WorkspaceScopedData {
  scopedProjectTasks: WorkspaceMainViewProps['allProjectTasks'];
  scopedUsers: WorkspaceMainViewProps['allUsers'];
  activeVisibleProjects: WorkspaceMainViewProps['visibleProjects'];
  crossProjectProjects: WorkspaceMainViewProps['visibleProjects'];
  crossProjectTasks: WorkspaceMainViewProps['tasks'];
}

interface WorkspaceViewRendererProps {
  props: WorkspaceMainViewProps;
  scoped: WorkspaceScopedData;
}

const WorkspaceViewRenderer: React.FC<WorkspaceViewRendererProps> = ({ props, scoped }) => {
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

  const { user, currentView, activeProject, planFeatures } = props;
  const { scopedProjectTasks, scopedUsers, activeVisibleProjects, crossProjectProjects, crossProjectTasks } = scoped;

  switch (currentView) {
    case 'projects':
      return (
        <ProjectsLifecycleView
          currentUserRole={user.role}
          currentUserId={user.id}
          projects={props.visibleProjects}
          allUsers={props.allUsers}
          projectTasks={scopedProjectTasks}
          activeProjectId={activeProject?.id || null}
          onUpdateProject={props.handleUpdateProject}
          onRenameProject={props.handleRenameProject}
          onCompleteProject={props.handleCompleteProject}
          onReopenProject={props.handleReopenProject}
          onArchiveProject={props.handleArchiveProject}
          onRestoreProject={props.handleRestoreProject}
          onDeleteProject={props.handleDeleteProject}
          onPurgeProject={props.handlePurgeProject}
          onBulkLifecycleAction={props.handleBulkLifecycleAction}
        />
      );
    case 'analytics':
      if (!planFeatures.analytics) return upgradeView(getPlanUnavailableTitle('analytics'), getPlanUpgradeMessage('analytics'));
      return (
        <AnalyticsView
          tasks={crossProjectTasks}
          projects={crossProjectProjects}
          allUsers={scopedUsers}
          orgId={user.orgId}
          aiPlanEnabled={planFeatures.aiTools}
          aiEnabled={props.aiFeaturesEnabled}
          onUpdateTask={props.handleUpdateTaskWithPolicy}
        />
      );
    case 'roadmap':
      return withLazy(<RoadmapView tasks={crossProjectTasks} projects={crossProjectProjects} />);
    case 'resources':
      if (!planFeatures.resources) return upgradeView(getPlanUnavailableTitle('resources'), getPlanUpgradeMessage('resources'));
      return (
        <WorkloadView
          users={scopedUsers}
          tasks={crossProjectTasks}
          aiPlanEnabled={planFeatures.aiTools}
          aiEnabled={props.aiFeaturesEnabled}
          onReassign={(taskId, userId) => props.handleUpdateTaskWithPolicy(taskId, { assigneeId: userId, assigneeIds: [userId] })}
        />
      );
    case 'tickets':
      return withLazy(
        <TicketsView
          orgId={user.orgId}
          currentUser={user}
          projects={crossProjectProjects}
          allUsers={scopedUsers}
          onRefreshTasks={props.refreshTasks}
          routeTicketId={props.routeTicketId}
          onOpenTicketRoute={props.onOpenTicketRoute}
        />
      );
    case 'integrations':
      if (!planFeatures.integrations) return upgradeView(getPlanUnavailableTitle('integrations'), getPlanUpgradeMessage('integrations'));
      return withLazy(<IntegrationHub projects={props.projects} onUpdateProject={props.handleUpdateProject} />);
    case 'templates':
      return withLazy(
        <TemplatesView
          templateQuery={props.templateQuery}
          setTemplateQuery={props.setTemplateQuery}
          templates={props.templates}
          onUseTemplate={(templateId) => {
            props.setProjectModalTemplateId(templateId);
            props.setIsProjectModalOpen(true);
          }}
        />
      );
    default:
      return (
        <KanbanView
          searchQuery={props.searchQuery}
          projectFilter={props.projectFilter}
          dueStatusFilter={props.dueStatusFilter}
          includeUnscheduled={props.includeUnscheduled}
          projects={activeVisibleProjects}
          dueFrom={props.dueFrom}
          dueTo={props.dueTo}
          statusFilter={props.statusFilter}
          priorityFilter={props.priorityFilter}
          tagFilter={props.tagFilter}
          assigneeFilter={props.assigneeFilter}
          uniqueTags={props.uniqueTags}
          allUsers={props.allUsers}
          currentUser={user}
          activeProject={activeProject}
          activeProjectTasks={activeProject ? props.allProjectTasks.filter((task) => task.projectId === activeProject.id) : []}
          categorizedTasks={props.categorizedTasks}
          selectedTaskIds={props.selectedTaskIds}
          compactMode={props.settingsCompactMode}
          showPersonalCalibration={props.settingsShowPersonalCalibration}
          setStatusFilter={props.setStatusFilter}
          setPriorityFilter={props.setPriorityFilter}
          setTagFilter={props.setTagFilter}
          setAssigneeFilter={props.setAssigneeFilter}
          setProjectFilter={props.setProjectFilter}
          setSearchQuery={props.setSearchQuery}
          setDueFrom={props.setDueFrom}
          setDueTo={props.setDueTo}
          setDueStatusFilter={props.setDueStatusFilter}
          setIncludeUnscheduled={props.setIncludeUnscheduled}
          setSelectedTaskIds={props.setSelectedTaskIds}
          toggleTaskSelection={props.toggleTaskSelection}
          deleteTask={props.handleDeleteTaskWithPolicy}
          canDeleteTask={props.canDeleteTask}
          canToggleTaskTimer={props.canToggleTaskTimer}
          onToggleTimer={props.onToggleTimer}
          isProjectCompletionPostponed={props.isProjectCompletionPostponed}
          completionActionLabel={activeProject ? props.getProjectCompletionActionLabel(activeProject.id) : 'Finish project'}
          completionPendingLabel={activeProject ? props.getProjectCompletionPendingLabel(activeProject.id) : undefined}
          onResumeProjectCompletion={props.onResumeProjectCompletion}
          allowSavedViews={planFeatures.savedViews}
          handleStatusUpdate={props.handleStatusUpdateWithPolicy}
          moveTask={props.handleMoveTaskWithPolicy}
          assistWithAI={props.assistWithAI}
          setSelectedTask={props.setSelectedTask}
          setIsModalOpen={props.setIsModalOpen}
          onUpdateTask={props.handleUpdateTaskWithPolicy}
          refreshTasks={props.refreshTasks}
          onUpdateProjectStages={(projectId, stages: ProjectStage[]) => props.handleUpdateProject(projectId, { stages })}
          onGenerateProjectTasksWithAI={props.onGenerateProjectTasksWithAI}
          canManageTaskAI={props.canManageTask}
          aiPlanEnabled={props.aiPlanEnabled}
          aiEnabled={props.aiEnabled}
          pinnedInsights={props.pinnedInsights ?? []}
          onUnpinInsight={props.onUnpinInsight}
        />
      );
  }
};

export default WorkspaceViewRenderer;
