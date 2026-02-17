import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronRight, Globe, LayoutDashboard, LayoutGrid, MoreHorizontal, Plus } from 'lucide-react';
import { MainViewType, Project, User } from '../../../types';
import { toastService } from '../../../services/toastService';
import { getUserFullName } from '../../../utils/userDisplay';
import SidebarNavButton from './SidebarNavButton';
import SidebarProjectActionsMenu from './SidebarProjectActionsMenu';
import SidebarProjectEditModal from './SidebarProjectEditModal';

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

const formatDateInput = (value?: number) => {
  if (!value) return '';
  const date = new Date(value);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
};

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
  const rootRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuProjectId, setMenuProjectId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [isProjectListCollapsed, setIsProjectListCollapsed] = useState(false);
  const [showAllProjects, setShowAllProjects] = useState(false);

  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editColor, setEditColor] = useState('bg-indigo-600');
  const [editOwnerId, setEditOwnerId] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editBudgetCost, setEditBudgetCost] = useState('');
  const [editHourlyRate, setEditHourlyRate] = useState('');
  const [editScopeSize, setEditScopeSize] = useState('');
  const [editScopeSummary, setEditScopeSummary] = useState('');
  const [editIsPublic, setEditIsPublic] = useState(false);

  const activeProjects = projects.filter((project) => !project.isArchived && !project.isCompleted && !project.isDeleted);
  const ownerById = new Map(allUsers.map((user) => [user.id, user]));
  const cappedProjectCount = 8;
  const visibleProjects = showAllProjects ? activeProjects : activeProjects.slice(0, cappedProjectCount);
  const activeMenuProject = activeProjects.find((project) => project.id === menuProjectId) || null;
  const editingProject = projects.find((project) => project.id === editingProjectId) || null;

  const closeProjectMenu = () => {
    setMenuProjectId(null);
    setMenuPosition(null);
  };

  const canManageProject = (project: Project) => {
    const ownerIds = Array.from(new Set([...(project.ownerIds || []), ...(project.createdBy ? [project.createdBy] : []), ...(project.members?.[0] ? [project.members[0]] : [])]));
    return currentUser.role === 'admin' || ownerIds.includes(currentUser.id);
  };

  const openEditProject = (project: Project) => {
    closeProjectMenu();
    setEditingProjectId(project.id);
    setEditName(project.name);
    setEditDescription(project.description || '');
    setEditColor(project.color || 'bg-indigo-600');
    setEditOwnerId(project.createdBy || project.members?.[0] || currentUser.id);
    setEditStartDate(formatDateInput(project.startDate));
    setEditEndDate(formatDateInput(project.endDate));
    setEditBudgetCost(project.budgetCost ? String(project.budgetCost) : '');
    setEditHourlyRate(project.hourlyRate ? String(project.hourlyRate) : '');
    setEditScopeSize(project.scopeSize ? String(project.scopeSize) : '');
    setEditScopeSummary(project.scopeSummary || '');
    setEditIsPublic(Boolean(project.isPublic));
  };

  const closeEditProject = () => {
    setEditingProjectId(null);
  };

  const saveEditProject = () => {
    if (!editingProject) return;
    const trimmedName = editName.trim();
    if (!trimmedName) {
      toastService.warning('Name required', 'Project name cannot be empty.');
      return;
    }

    const startDate = editStartDate ? new Date(`${editStartDate}T00:00:00`).getTime() : undefined;
    const endDate = editEndDate ? new Date(`${editEndDate}T00:00:00`).getTime() : undefined;
    if (startDate && endDate && endDate < startDate) {
      toastService.warning('Invalid dates', 'End date cannot be before start date.');
      return;
    }

    const updates: Partial<Project> = {
      name: trimmedName,
      description: editDescription.trim(),
      color: editColor,
      startDate,
      endDate,
      budgetCost: editBudgetCost ? Math.max(0, Number(editBudgetCost)) : undefined,
      hourlyRate: editHourlyRate ? Math.max(0, Number(editHourlyRate)) : undefined,
      scopeSize: editScopeSize ? Math.max(0, Math.round(Number(editScopeSize))) : undefined,
      scopeSummary: editScopeSummary.trim() || undefined,
      isPublic: editIsPublic
    };

    if (currentUser.role === 'admin' && editOwnerId) {
      updates.createdBy = editOwnerId;
      updates.members = editingProject.members.includes(editOwnerId)
        ? editingProject.members
        : [...editingProject.members, editOwnerId];
    }

    onUpdateProject(editingProject.id, updates);
    closeEditProject();
  };

  useEffect(() => {
    const handleOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      closeProjectMenu();
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  return (
    <div ref={rootRef} className="space-y-1.5">
      <p className="px-3 text-[11px] font-medium tracking-wide text-slate-500 mb-2 truncate">Workspace</p>
      <SidebarNavButton
        active={currentView === 'board' && activeProjectId === null}
        onClick={() => {
          onProjectSelect(null);
          onViewChange('board');
          if (window.innerWidth < 1024) onCloseSidebar();
        }}
        icon={LayoutDashboard}
        label="Board"
      />

      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <SidebarNavButton
            active={currentView === 'projects'}
            onClick={() => {
              onProjectSelect(null);
              onViewChange('projects');
              if (window.innerWidth < 1024) onCloseSidebar();
            }}
            icon={LayoutGrid}
            label={`Projects (${activeProjects.length})`}
          />
        </div>
        <button
          onClick={onAddProject}
          className="w-8 h-8 rounded-lg text-slate-600 hover:text-slate-900 bg-white border border-slate-200 transition-colors shrink-0 flex items-center justify-center"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      <button
        onClick={() => setIsProjectListCollapsed((prev) => !prev)}
        className="w-full h-7 px-3 rounded-md border border-slate-200 bg-white text-[11px] font-medium text-slate-600 inline-flex items-center justify-between"
      >
        <span>{isProjectListCollapsed ? 'Show project list' : 'Hide project list'}</span>
        {isProjectListCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      {!isProjectListCollapsed && (
        <div
          className="space-y-1 max-h-[26vh] lg:max-h-[calc(100dvh-460px)] 2xl:max-h-[calc(100dvh-420px)] overflow-y-auto custom-scrollbar pr-1 pl-3 border-l border-slate-200 ml-3"
          onScroll={closeProjectMenu}
        >
          {activeProjects.length > 0 ? (
            visibleProjects.map((project) => {
              const isActive = currentView === 'board' && activeProjectId === project.id;
              const isLiveProject = activeProjectId === project.id;
              const ownerId = project.ownerIds?.[0] || project.createdBy || project.members?.[0];
              const owner = ownerId ? ownerById.get(ownerId) : undefined;
              const ownerName = owner ? getUserFullName(owner) : 'Unknown owner';
              const ownerInitial = ownerName.charAt(0).toUpperCase() || '?';

              return (
                <div key={project.id}>
                  <div
                    className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg transition-colors font-medium border group ${
                      isActive
                        ? 'bg-slate-100 border-slate-200 text-slate-900 shadow-sm'
                        : 'text-slate-600 border-transparent hover:bg-slate-100 hover:border-slate-200 hover:text-slate-900'
                    }`}
                  >
                    <button
                      onClick={() => {
                        onProjectSelect(project.id);
                        onViewChange('board');
                        if (window.innerWidth < 1024) onCloseSidebar();
                      }}
                      className="flex-1 min-w-0 flex items-center gap-2.5 text-left"
                    >
                      <div
                        className={`w-3 h-3 rounded-full ${project.color} shrink-0 ${
                          isLiveProject ? 'active-node ring-1 ring-slate-400/30 ring-offset-0' : ''
                        }`}
                      />
                      <span className="truncate tracking-tight text-sm">{project.name}</span>
                    </button>
                    {project.isPublic && <Globe className={`w-3 h-3 shrink-0 ${isActive ? 'text-slate-500' : 'text-slate-400'}`} />}
                    <div
                      className="w-5 h-5 rounded-full overflow-hidden border border-slate-200 bg-slate-100 shrink-0"
                      title={`Owner: ${ownerName}`}
                    >
                      {owner?.avatar ? (
                        <img src={owner.avatar} alt={ownerName} title={ownerName} className="w-full h-full object-cover" />
                      ) : (
                        <span className="w-full h-full text-[10px] text-slate-600 font-semibold flex items-center justify-center">
                          {ownerInitial}
                        </span>
                      )}
                    </div>
                    {canManageProject(project) && (
                      <div className="shrink-0">
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            const rect = (event.currentTarget as HTMLButtonElement).getBoundingClientRect();
                            if (menuProjectId === project.id) {
                              closeProjectMenu();
                              return;
                            }
                            setMenuProjectId(project.id);
                            setMenuPosition({
                              top: rect.bottom + 6,
                              left: Math.max(12, rect.right - 176)
                            });
                          }}
                          className="w-6 h-6 rounded-md border border-transparent hover:border-slate-200 hover:bg-slate-100 text-slate-500 flex items-center justify-center"
                          title="Project actions"
                        >
                          <MoreHorizontal className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="px-4 py-6 text-center border-2 border-dashed border-slate-200 rounded-2xl opacity-40">
              <p className="text-[10px] font-semibold uppercase tracking-wide">No projects yet</p>
            </div>
          )}
        </div>
      )}

      {!isProjectListCollapsed && activeProjects.length > cappedProjectCount && (
        <button
          onClick={() => setShowAllProjects((prev) => !prev)}
          className="w-full h-7 px-3 rounded-md border border-slate-200 bg-white text-[11px] font-medium text-slate-600"
        >
          {showAllProjects ? `Show fewer (${cappedProjectCount})` : `Show all (${activeProjects.length})`}
        </button>
      )}

      <SidebarNavButton
        active={currentView === 'templates'}
        onClick={() => {
          onProjectSelect(null);
          onViewChange('templates');
          if (window.innerWidth < 1024) onCloseSidebar();
        }}
        icon={LayoutGrid}
        label="Templates"
      />

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
