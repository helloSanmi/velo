import React from 'react';
import { Calendar, ChartGantt, KanbanSquare, List, ListChecks, Users } from 'lucide-react';
import { KanbanHeaderProps } from '../types';

interface ViewModeSwitchProps {
  boardView: KanbanHeaderProps['boardView'];
  onChangeBoardView: KanbanHeaderProps['onChangeBoardView'];
}

const VIEW_ITEMS = [
  { id: 'kanban', label: 'Kanban', icon: KanbanSquare, title: 'Kanban view' },
  { id: 'checklist', label: 'Checklist', icon: ListChecks, title: 'Checklist view' },
  { id: 'gantt', label: 'Gantt', icon: ChartGantt, title: 'Gantt view' },
  { id: 'table', label: 'Table', icon: List, title: 'Table view' },
  { id: 'calendar', label: 'Calendar', icon: Calendar, title: 'Calendar view' },
  { id: 'workload', label: 'Workload', icon: Users, title: 'Workload view' }
] as const;

const ViewModeSwitch: React.FC<ViewModeSwitchProps> = ({ boardView, onChangeBoardView }) => (
  <div className="inline-flex items-center rounded-md border border-slate-200 bg-white p-0.5 shrink-0">
    {VIEW_ITEMS.map(({ id, label, icon: Icon, title }) => (
      <button
        key={id}
        onClick={() => onChangeBoardView(id)}
        className={`inline-flex h-7 items-center gap-1 rounded px-2 text-[11px] font-medium transition-colors ${
          boardView === id ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-50'
        }`}
        title={title}
      >
        <Icon className="h-3.5 w-3.5" />
        {label}
      </button>
    ))}
  </div>
);

export default ViewModeSwitch;
