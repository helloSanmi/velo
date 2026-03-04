import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface SidebarProjectListToggleProps {
  collapsed: boolean;
  onToggle: () => void;
}

const SidebarProjectListToggle: React.FC<SidebarProjectListToggleProps> = ({ collapsed, onToggle }) => {
  return (
    <button
      onClick={onToggle}
      className="w-full h-7 px-3 rounded-md border border-slate-200 bg-white text-[11px] font-medium text-slate-600 inline-flex items-center justify-between"
    >
      <span>{collapsed ? 'Show project list' : 'Hide project list'}</span>
      {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
    </button>
  );
};

export default SidebarProjectListToggle;
