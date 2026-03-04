import React from 'react';
import { ClipboardList, LayoutDashboard, LayoutGrid, Plus } from 'lucide-react';
import { MainViewType } from '../../../types';
import SidebarNavButton from './SidebarNavButton';

interface SidebarWorkspaceNavProps {
  currentView: MainViewType;
  activeProjectId: string | null;
  activeProjectCount: number;
  onAddProject: () => void;
  navigateTo: (view: MainViewType) => void;
}

const SidebarWorkspaceNav: React.FC<SidebarWorkspaceNavProps> = ({
  currentView,
  activeProjectId,
  activeProjectCount,
  onAddProject,
  navigateTo
}) => {
  return (
    <>
      <SidebarNavButton
        active={currentView === 'board' && activeProjectId === null}
        onClick={() => navigateTo('board')}
        icon={LayoutDashboard}
        label="Board"
      />

      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <SidebarNavButton
            active={currentView === 'projects'}
            onClick={() => navigateTo('projects')}
            icon={LayoutGrid}
            label={`Projects (${activeProjectCount})`}
          />
        </div>
        <button
          onClick={onAddProject}
          className="w-8 h-8 rounded-lg text-slate-600 hover:text-slate-900 bg-white border border-slate-200 transition-colors shrink-0 flex items-center justify-center"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      <SidebarNavButton active={currentView === 'tickets'} onClick={() => navigateTo('tickets')} icon={ClipboardList} label="Tickets" />
      <SidebarNavButton active={currentView === 'templates'} onClick={() => navigateTo('templates')} icon={LayoutGrid} label="Templates" />
    </>
  );
};

export default SidebarWorkspaceNav;
