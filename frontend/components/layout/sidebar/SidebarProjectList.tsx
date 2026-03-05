import React, { useMemo, useState } from 'react';
import { MainViewType, Project, User } from '../../../types';
import { ClipboardList, LayoutGrid } from 'lucide-react';
import SidebarWorkspaceNav from './SidebarWorkspaceNav';
import SidebarProjectListToggle from './SidebarProjectListToggle';
import SidebarProjectActionsMenu from './SidebarProjectActionsMenu';
import SidebarProjectEditModal from './SidebarProjectEditModal';
import SidebarActiveProjectList from './SidebarActiveProjectList';
import SidebarNavButton from './SidebarNavButton';
import { useSidebarProjectMenu } from './hooks/useSidebarProjectMenu';
import { useSidebarProjectEditor } from './hooks/useSidebarProjectEditor';

interface SidebarProjectListProps {
  allUsers: User[];
  currentUser: User;
  projects: Project[];
  activeProjectId: string | null;
  currentView: MainViewType;
  onProjectSelect: (id: string | null) => void;
  onViewChange: (view: MainViewType) => void;
  onAddProject: () => void;
  onUpdateProject: (id: string, updates: Partial<Project>) => void;
  onCompleteProject: (id: string) => void;
  onArchiveProject: (id: string) => void;
  onDeleteProject: (id: string) => void;
  onCloseSidebar: () => void;
}

const cappedProjectCount = 8;

const SidebarProjectList: React.FC<SidebarProjectListProps> = ({
  allUsers,
  currentUser,
  projects,
  activeProjectId,
  currentView,
  onProjectSelect,
  onViewChange,
  onAddProject,
  onUpdateProject,
  onCompleteProject,
  onArchiveProject,
  onDeleteProject,
  onCloseSidebar
}) => {
  const [isProjectListCollapsed, setIsProjectListCollapsed] = useState(false);
  const [showAllProjects, setShowAllProjects] = useState(false);

  const activeProjects = useMemo(
    () => projects.filter((project) => !project.isArchived && !project.isCompleted && !project.isDeleted),
    [projects]
  );
  const visibleProjects = showAllProjects ? activeProjects : activeProjects.slice(0, cappedProjectCount);

  const { menuRef, menuProjectId, menuPosition, closeProjectMenu, openProjectMenu } = useSidebarProjectMenu();

  const {
    editingProject,
    editName,
    setEditName,
    editDescription,
    setEditDescription,
    editColor,
    setEditColor,
    editOwnerId,
    setEditOwnerId,
    editStartDate,
    setEditStartDate,
    editEndDate,
    setEditEndDate,
    editBudgetCost,
    setEditBudgetCost,
    editHourlyRate,
    setEditHourlyRate,
    editScopeSize,
    setEditScopeSize,
    editScopeSummary,
    setEditScopeSummary,
    editIsPublic,
    setEditIsPublic,
    openEditProject,
    closeEditProject,
    saveEditProject
  } = useSidebarProjectEditor({
    projects,
    currentUser,
    onUpdateProject,
    closeProjectMenu
  });

  const activeMenuProject = activeProjects.find((project) => project.id === menuProjectId) || null;

  const canManageProject = (project: Project) => {
    const ownerIds = Array.from(
      new Set([...(project.ownerIds || []), ...(project.createdBy ? [project.createdBy] : []), ...(project.members?.[0] ? [project.members[0]] : [])])
    );
    return currentUser.role === 'admin' || ownerIds.includes(currentUser.id);
  };

  const navigateTo = (view: MainViewType) => {
    onProjectSelect(null);
    onViewChange(view);
    if (window.innerWidth < 1024) onCloseSidebar();
  };

  return (
    <div className="space-y-1.5">
      <p className="px-3 text-[11px] font-medium tracking-wide text-slate-500 mb-2 truncate">Workspace</p>
      <SidebarWorkspaceNav
        currentView={currentView}
        activeProjectId={activeProjectId}
        activeProjectCount={activeProjects.length}
        onAddProject={onAddProject}
        navigateTo={navigateTo}
      />

      <SidebarProjectListToggle
        collapsed={isProjectListCollapsed}
        onToggle={() => setIsProjectListCollapsed((prev) => !prev)}
      />

      <SidebarActiveProjectList
        activeProjects={activeProjects}
        visibleProjects={visibleProjects}
        activeProjectId={activeProjectId}
        currentView={currentView}
        allUsers={allUsers}
        isProjectListCollapsed={isProjectListCollapsed}
        onProjectSelect={onProjectSelect}
        onViewChange={(view) => onViewChange(view)}
        onCloseSidebar={onCloseSidebar}
        canManageProject={canManageProject}
        onOpenMenu={openProjectMenu}
        onCloseMenu={closeProjectMenu}
      />

      {!isProjectListCollapsed && activeProjects.length > cappedProjectCount && (
        <button
          onClick={() => setShowAllProjects((prev) => !prev)}
          className="w-full h-7 px-3 rounded-md border border-slate-200 bg-white text-[11px] font-medium text-slate-600"
        >
          {showAllProjects ? `Show fewer (${cappedProjectCount})` : `Show all (${activeProjects.length})`}
        </button>
      )}

      <SidebarNavButton active={currentView === 'tickets'} onClick={() => navigateTo('tickets')} icon={ClipboardList} label="Tickets" />
      <SidebarNavButton active={currentView === 'templates'} onClick={() => navigateTo('templates')} icon={LayoutGrid} label="Templates" />

      {menuProjectId && menuPosition && activeMenuProject && canManageProject(activeMenuProject) && (
        <div ref={menuRef}>
          <SidebarProjectActionsMenu
            position={menuPosition}
            onEditProject={() => openEditProject(activeMenuProject)}
            onComplete={() => {
              closeProjectMenu();
              onCompleteProject(activeMenuProject.id);
            }}
            onArchive={() => {
              closeProjectMenu();
              onArchiveProject(activeMenuProject.id);
            }}
            onDelete={async () => {
              closeProjectMenu();
              onDeleteProject(activeMenuProject.id);
            }}
          />
        </div>
      )}

      <SidebarProjectEditModal
        isOpen={Boolean(editingProject)}
        project={editingProject}
        allUsers={allUsers}
        currentUser={currentUser}
        name={editName}
        setName={setEditName}
        description={editDescription}
        setDescription={setEditDescription}
        color={editColor}
        setColor={setEditColor}
        ownerId={editOwnerId}
        setOwnerId={setEditOwnerId}
        startDate={editStartDate}
        setStartDate={setEditStartDate}
        endDate={editEndDate}
        setEndDate={setEditEndDate}
        budgetCost={editBudgetCost}
        setBudgetCost={setEditBudgetCost}
        hourlyRate={editHourlyRate}
        setHourlyRate={setEditHourlyRate}
        scopeSize={editScopeSize}
        setScopeSize={setEditScopeSize}
        scopeSummary={editScopeSummary}
        setScopeSummary={setEditScopeSummary}
        isPublic={editIsPublic}
        setIsPublic={setEditIsPublic}
        onClose={closeEditProject}
        onSave={saveEditProject}
      />
    </div>
  );
};

export default SidebarProjectList;
