import React, { useMemo } from 'react';
import {
  Activity,
  Camera,
  GanttChartSquare,
  Settings,
  Sparkles,
  Terminal,
  Users
} from 'lucide-react';
import { MainViewType, Project, User } from '../../types';
import SidebarNavButton from './sidebar/SidebarNavButton';
import SidebarProjectList from './sidebar/SidebarProjectList';
import RecentActivityPanel from './sidebar/RecentActivityPanel';
import { useRecentActions } from '../../hooks/useRecentActions';
import { PlanFeatures } from '../../services/planFeatureService';

interface SidebarProps {
  isOpen: boolean;
  currentUser: User;
  allUsers: User[];
  projects: Project[];
  activeProjectId: string | null;
  currentView: MainViewType;
  onProjectSelect: (id: string | null) => void;
  onViewChange: (view: MainViewType) => void;
  onOpenCommandCenter: () => void;
  onOpenVisionModal: () => void;
  onAddProject: () => void;
  onUpdateProject: (id: string, updates: Partial<Project>) => void;
  onCompleteProject: (id: string) => void;
  onArchiveProject: (id: string) => void;
  onDeleteProject: (id: string) => void;
  onOpenSettings: () => void;
  onCloseSidebar: () => void;
  planFeatures: PlanFeatures;
  aiFeaturesEnabled: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  currentUser,
  allUsers,
  projects,
  activeProjectId,
  currentView,
  onProjectSelect,
  onViewChange,
  onOpenCommandCenter,
  onOpenVisionModal,
  onAddProject,
  onUpdateProject,
  onCompleteProject,
  onArchiveProject,
  onDeleteProject,
  onOpenSettings,
  onCloseSidebar,
  planFeatures,
  aiFeaturesEnabled
}) => {
  const visibleProjectIds = useMemo(() => projects.map((project) => project.id), [projects]);

  const recentActions = useRecentActions({
    orgId: currentUser.orgId,
    visibleProjectIds
  });

  const runSidebarAction = (action: () => void) => {
    action();
    if (window.innerWidth < 1024) onCloseSidebar();
  };

  return (
    <aside
      className={`h-full w-full bg-slate-50 border-r border-slate-200 flex flex-col p-4 text-slate-600 overflow-hidden ${
        isOpen ? 'fixed inset-y-0 left-0 z-[56] w-[min(88vw,320px)] lg:relative lg:inset-auto lg:w-full' : 'hidden lg:flex'
      }`}
    >
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 transition-all space-y-8">
        <SidebarProjectList
          allUsers={allUsers}
          currentUser={currentUser}
          projects={projects}
          activeProjectId={activeProjectId}
          currentView={currentView}
          onProjectSelect={onProjectSelect}
          onViewChange={onViewChange}
          onAddProject={onAddProject}
          onUpdateProject={onUpdateProject}
          onCompleteProject={onCompleteProject}
          onArchiveProject={onArchiveProject}
          onDeleteProject={onDeleteProject}
          onCloseSidebar={onCloseSidebar}
        />

        <div className="space-y-1.5">
          <p className="px-3 text-[11px] font-medium tracking-wide text-slate-500 mb-2 truncate">Insights</p>
          <SidebarNavButton
            active={currentView === 'roadmap'}
            onClick={() => runSidebarAction(() => onViewChange('roadmap'))}
            icon={GanttChartSquare}
            label="Roadmap"
          />
          {planFeatures.analytics ? (
            <SidebarNavButton
              active={currentView === 'analytics'}
              onClick={() => runSidebarAction(() => onViewChange('analytics'))}
              icon={Activity}
              label="Analytics"
            />
          ) : null}
          {planFeatures.resources ? (
            <SidebarNavButton
              active={currentView === 'resources'}
              onClick={() => runSidebarAction(() => onViewChange('resources'))}
              icon={Users}
              label="Resources"
            />
          ) : null}
        </div>

        <div className="space-y-1.5">
          <p className="px-3 text-[11px] font-medium tracking-wide text-slate-500 mb-2 truncate">Tools</p>
          {planFeatures.aiTools && aiFeaturesEnabled ? (
            <>
              <button
                onClick={() => runSidebarAction(onOpenCommandCenter)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-100 hover:border-slate-200 border border-transparent hover:text-slate-900 font-medium text-sm transition-colors text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Terminal className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="truncate">Velo Copilot</span>
                </div>
              </button>
              <button
                onClick={() => runSidebarAction(onOpenVisionModal)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-100 hover:border-slate-200 border border-transparent hover:text-slate-900 font-medium text-sm transition-colors text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Camera className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="truncate">Image to Tasks</span>
                </div>
                <Sparkles className="w-3 h-3 text-slate-400 shrink-0" />
              </button>
            </>
          ) : null}
        </div>

        <RecentActivityPanel recentActions={recentActions} />
      </div>

      <div className="pt-4 border-t border-slate-200 shrink-0">
        <button
          onClick={() => runSidebarAction(onOpenSettings)}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-100 hover:border-slate-200 border border-transparent hover:text-slate-900 font-medium transition-colors text-sm group"
        >
          <Settings className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="truncate">Settings</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
