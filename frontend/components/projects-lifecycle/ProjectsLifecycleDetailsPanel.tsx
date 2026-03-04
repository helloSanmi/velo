import React from 'react';
import ProjectsLifecycleStatsGrid from './ProjectsLifecycleStatsGrid';
import ProjectsLifecycleMetaCards from './ProjectsLifecycleMetaCards';
import ProjectsLifecycleActionsRow from './ProjectsLifecycleActionsRow';
import ProjectsLifecycleTasksList from './ProjectsLifecycleTasksList';
import ProjectsLifecycleEditOverlay from './ProjectsLifecycleEditOverlay';
import { ProjectsLifecycleDetailsPanelProps } from './projectsLifecycle.types';
import { useProjectsLifecyclePanelState } from './useProjectsLifecyclePanelState';

const ProjectsLifecycleDetailsPanel: React.FC<ProjectsLifecycleDetailsPanelProps> = ({
  currentUserRole,
  allUsers,
  canManageProject,
  focusedProject,
  focusedProjectTasks,
  focusedProjectStats,
  projectStatus,
  editingProjectId,
  editingProjectName,
  setEditingProjectId,
  setEditingProjectName,
  submitProjectRename,
  onUpdateProject,
  onCompleteProject,
  onReopenProject,
  onArchiveProject,
  onRestoreProject,
  onDeleteProject,
  onPurgeProject
}) => {
  const state = useProjectsLifecyclePanelState({
    focusedProject,
    allUsers,
    currentUserRole,
    onUpdateProject
  });

  return (
    <section className="border border-slate-200 rounded-xl bg-white p-3 md:p-5 flex flex-col min-h-0 relative">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{projectStatus}</p>
          <h3 className="text-lg md:text-xl font-semibold text-slate-900 truncate mt-1">{focusedProject.name}</h3>
          <p className="text-xs md:text-sm text-slate-600 mt-1">{focusedProject.description || 'No description provided.'}</p>
        </div>
      </div>

      <ProjectsLifecycleStatsGrid focusedProjectStats={focusedProjectStats} />

      <ProjectsLifecycleMetaCards
        focusedProject={focusedProject}
        focusedProjectStats={focusedProjectStats}
        canManageProject={canManageProject}
        currentUserRole={currentUserRole}
        ownerNames={state.ownerNames}
        lifecycleMeta={state.lifecycleMeta}
        onUpdateProject={onUpdateProject}
        onOpenEditor={state.openSectionEditor}
      />

      <ProjectsLifecycleActionsRow
        canManageProject={canManageProject}
        projectId={focusedProject.id}
        isDeleted={Boolean(focusedProject.isDeleted)}
        isArchived={Boolean(focusedProject.isArchived)}
        isCompleted={Boolean(focusedProject.isCompleted)}
        editingProjectId={editingProjectId}
        editingProjectName={editingProjectName}
        projectName={focusedProject.name}
        setEditingProjectId={setEditingProjectId}
        setEditingProjectName={setEditingProjectName}
        submitProjectRename={submitProjectRename}
        onCompleteProject={onCompleteProject}
        onReopenProject={onReopenProject}
        onArchiveProject={onArchiveProject}
        onRestoreProject={onRestoreProject}
        onDeleteProject={onDeleteProject}
        onPurgeProject={onPurgeProject}
      />

      <ProjectsLifecycleTasksList focusedProjectTasks={focusedProjectTasks} />

      <ProjectsLifecycleEditOverlay
        editSection={state.editSection}
        currentUserRole={currentUserRole}
        focusedProjectOrgId={focusedProject.orgId}
        allUsers={allUsers}
        draftStartDate={state.draftStartDate}
        setDraftStartDate={state.setDraftStartDate}
        draftEndDate={state.draftEndDate}
        setDraftEndDate={state.setDraftEndDate}
        draftBudget={state.draftBudget}
        setDraftBudget={state.setDraftBudget}
        draftHourlyRate={state.draftHourlyRate}
        setDraftHourlyRate={state.setDraftHourlyRate}
        draftScopeSize={state.draftScopeSize}
        setDraftScopeSize={state.setDraftScopeSize}
        draftScopeSummary={state.draftScopeSummary}
        setDraftScopeSummary={state.setDraftScopeSummary}
        draftOwnerIds={state.draftOwnerIds}
        onToggleOwner={state.toggleOwner}
        onCloseEditor={state.closeEditor}
        onSaveSection={state.saveSection}
      />
    </section>
  );
};

export default ProjectsLifecycleDetailsPanel;
