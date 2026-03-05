import React from 'react';
import { Globe, MoreHorizontal } from 'lucide-react';
import { MainViewType, Project, User } from '../../../types';
import { getUserFullName } from '../../../utils/userDisplay';

interface SidebarActiveProjectListProps {
  activeProjects: Project[];
  visibleProjects: Project[];
  activeProjectId: string | null;
  currentView: MainViewType;
  allUsers: User[];
  isProjectListCollapsed: boolean;
  onProjectSelect: (id: string | null) => void;
  onViewChange: (view: MainViewType) => void;
  onCloseSidebar: () => void;
  canManageProject: (project: Project) => boolean;
  onOpenMenu: (projectId: string, trigger: HTMLButtonElement) => void;
  onCloseMenu: () => void;
}

const SidebarActiveProjectList: React.FC<SidebarActiveProjectListProps> = ({
  activeProjects,
  visibleProjects,
  activeProjectId,
  currentView,
  allUsers,
  isProjectListCollapsed,
  onProjectSelect,
  onViewChange,
  onCloseSidebar,
  canManageProject,
  onOpenMenu,
  onCloseMenu
}) => {
  const ownerById = new Map(allUsers.map((user) => [user.id, user]));

  if (isProjectListCollapsed) return null;

  return (
    <div
      className="space-y-1 max-h-[26vh] lg:max-h-[calc(100dvh-460px)] 2xl:max-h-[calc(100dvh-420px)] overflow-y-auto custom-scrollbar pr-1 pl-3 border-l border-slate-200 ml-3"
      onScroll={onCloseMenu}
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
                  title={project.name}
                  className="flex-1 min-w-0 flex items-center gap-2.5 text-left overflow-hidden"
                >
                  <div
                    className={`w-3 h-3 rounded-full ${project.color} shrink-0 ${
                      isLiveProject ? 'active-node ring-1 ring-slate-400/30 ring-offset-0' : ''
                    }`}
                  />
                  <span title={project.name} className="truncate tracking-tight text-sm">{project.name}</span>
                </button>
                <div className="shrink-0 inline-flex items-center gap-1.5 pl-1">
                  {project.isPublic ? (
                    <Globe className={`w-3 h-3 shrink-0 ${isActive ? 'text-slate-500' : 'text-slate-400'}`} />
                  ) : null}
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
                  {canManageProject(project) ? (
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        onOpenMenu(project.id, event.currentTarget as HTMLButtonElement);
                      }}
                      className="w-6 h-6 rounded-md border border-transparent hover:border-slate-200 hover:bg-slate-100 text-slate-500 flex items-center justify-center"
                      title="Project actions"
                    >
                      <MoreHorizontal className="w-3.5 h-3.5" />
                    </button>
                  ) : null}
                </div>
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
  );
};

export default SidebarActiveProjectList;
