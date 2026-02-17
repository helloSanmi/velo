import React from 'react';
import { Archive, Check, Pencil, Trash2 } from 'lucide-react';

interface SidebarProjectActionsMenuProps {
  position: { top: number; left: number };
  onEditProject: () => void;
  onComplete: () => void;
  onArchive: () => void;
  onDelete: () => void;
}

const SidebarProjectActionsMenu: React.FC<SidebarProjectActionsMenuProps> = ({
  position,
  onEditProject,
  onComplete,
  onArchive,
  onDelete
}) => {
  return (
    <div
      className="fixed z-[120] w-40 rounded-lg border border-slate-200 bg-white shadow-xl p-1.5 space-y-1"
      style={{ top: position.top, left: position.left }}
    >
      <button
        onClick={(event) => {
          event.stopPropagation();
          onEditProject();
        }}
        className="w-full h-8 px-2 rounded-md hover:bg-slate-50 text-xs text-slate-700 inline-flex items-center gap-2"
      >
        <Pencil className="w-3.5 h-3.5" /> Edit project
      </button>
      <button
        onClick={(event) => {
          event.stopPropagation();
          onComplete();
        }}
        className="w-full h-8 px-2 rounded-md hover:bg-slate-50 text-xs text-slate-700 inline-flex items-center gap-2"
      >
        <Check className="w-3.5 h-3.5" /> Complete
      </button>
      <button
        onClick={(event) => {
          event.stopPropagation();
          onArchive();
        }}
        className="w-full h-8 px-2 rounded-md hover:bg-slate-50 text-xs text-slate-700 inline-flex items-center gap-2"
      >
        <Archive className="w-3.5 h-3.5" /> Archive
      </button>
      <button
        onClick={(event) => {
          event.stopPropagation();
          onDelete();
        }}
        className="w-full h-8 px-2 rounded-md hover:bg-rose-50 text-xs text-rose-700 inline-flex items-center gap-2"
      >
        <Trash2 className="w-3.5 h-3.5" /> Delete
      </button>
    </div>
  );
};

export default SidebarProjectActionsMenu;
