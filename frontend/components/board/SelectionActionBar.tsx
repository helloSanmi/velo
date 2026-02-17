import React from 'react';
import { Trash2, UserPlus, AlertCircle, X, CheckSquare, MoveRight } from 'lucide-react';
import { TaskPriority, TaskStatus, User } from '../../types';

interface SelectionActionBarProps {
  selectedCount: number;
  allUsers: User[];
  onClear: () => void;
  onBulkPriority: (priority: TaskPriority) => void;
  onBulkStatus: (status: TaskStatus) => void;
  onBulkAssignee: (userId: string) => void;
  onBulkDelete: () => void;
}

const SelectionActionBar: React.FC<SelectionActionBarProps> = ({
  selectedCount,
  allUsers,
  onClear,
  onBulkPriority,
  onBulkStatus,
  onBulkAssignee,
  onBulkDelete
}) => {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-3 md:bottom-10 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-10 duration-500 w-[calc(100%-1rem)] md:w-auto">
      <div className="bg-slate-900 text-white rounded-2xl md:rounded-[2.5rem] px-3.5 md:px-8 py-2.5 md:py-5 shadow-2xl flex items-center justify-between md:justify-start gap-2.5 md:gap-10 border border-white/10 backdrop-blur-xl bg-opacity-95 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-3 md:gap-4 md:pr-10 md:border-r md:border-white/10 shrink-0">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-indigo-600 rounded-xl md:rounded-2xl flex items-center justify-center">
             <CheckSquare className="w-4 h-4 md:w-5 md:h-5" />
          </div>
          <div>
            <p className="text-xs md:text-sm font-black tracking-tight">{selectedCount} <span className="hidden min-[361px]:inline">Items</span></p>
            <p className="text-[8px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest hidden sm:block">Bulk Mode</p>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4 shrink-0">
           <div className="group relative">
             <button className="flex items-center gap-1.5 md:gap-2 px-2.5 md:px-4 py-2 hover:bg-white/10 rounded-xl transition-all font-bold text-[10px] md:text-xs">
                <AlertCircle className="w-4 h-4 text-amber-400" /> <span className="hidden min-[361px]:inline">Priority</span>
             </button>
             <div className="absolute bottom-full left-0 mb-4 bg-white rounded-2xl p-2 shadow-2xl hidden group-hover:block animate-in fade-in slide-in-from-bottom-2">
                {Object.values(TaskPriority).map(p => (
                  <button key={p} onClick={() => onBulkPriority(p)} className="w-full text-left px-4 py-2 rounded-xl text-slate-800 text-[10px] md:text-xs font-bold hover:bg-slate-100 whitespace-nowrap">Set to {p}</button>
                ))}
             </div>
           </div>

           <div className="group relative">
             <button className="flex items-center gap-1.5 md:gap-2 px-2.5 md:px-4 py-2 hover:bg-white/10 rounded-xl transition-all font-bold text-[10px] md:text-xs">
                <MoveRight className="w-4 h-4 text-indigo-400" /> <span className="hidden min-[361px]:inline">Move</span>
             </button>
             <div className="absolute bottom-full left-0 mb-4 bg-white rounded-2xl p-2 shadow-2xl hidden group-hover:block animate-in fade-in slide-in-from-bottom-2">
                {Object.values(TaskStatus).map(s => (
                  <button key={s} onClick={() => onBulkStatus(s)} className="w-full text-left px-4 py-2 rounded-xl text-slate-800 text-[10px] md:text-xs font-bold hover:bg-slate-100 whitespace-nowrap">Move to {s.replace('-', ' ')}</button>
                ))}
             </div>
           </div>

           <button onClick={onBulkDelete} className="p-2.5 md:p-3 text-rose-400 hover:bg-rose-500/20 rounded-xl transition-all shrink-0">
             <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
           </button>
        </div>

        <button onClick={onClear} className="md:ml-4 p-2 md:p-2.5 bg-white/5 hover:bg-white/10 rounded-xl transition-all text-slate-400 shrink-0">
          <X className="w-4 h-4 md:w-5 md:h-5" />
        </button>
      </div>
    </div>
  );
};

export default SelectionActionBar;
