import React from 'react';
import { Calendar, ChartGantt, KanbanSquare, List, ListOrdered, Loader2, Settings2, Sparkles, Users, X } from 'lucide-react';
import { KanbanHeaderProps } from './types';
import AppSelect from '../../ui/AppSelect';

type KanbanHeaderActionsProps = Pick<
  KanbanHeaderProps,
  | 'boardView'
  | 'onChangeBoardView'
  | 'allowSavedViews'
  | 'onSaveView'
  | 'savedViews'
  | 'onApplyView'
  | 'appliedViewId'
  | 'onDeleteAppliedView'
  | 'onOpenManageViews'
  | 'activeProject'
  | 'onOptimizeOrder'
  | 'isTriaging'
  | 'projectStages'
  | 'canManageStages'
  | 'onOpenStages'
  | 'canGenerateTasksWithAI'
  | 'onOpenGenerateTasksWithAI'
  | 'selectedTaskIds'
  | 'onClearSelected'
>;

const KanbanHeaderActions: React.FC<KanbanHeaderActionsProps> = ({
  boardView,
  onChangeBoardView,
  allowSavedViews,
  onSaveView,
  savedViews,
  onApplyView,
  appliedViewId,
  onDeleteAppliedView,
  onOpenManageViews,
  activeProject,
  onOptimizeOrder,
  isTriaging,
  projectStages,
  canManageStages,
  onOpenStages,
  canGenerateTasksWithAI,
  onOpenGenerateTasksWithAI,
  selectedTaskIds,
  onClearSelected
}) => {
  const hasSavedViews = allowSavedViews && savedViews.length > 0;

  return (
    <div className="flex flex-wrap items-center gap-2 pb-0.5">
      <div className="inline-flex items-center rounded-md border border-slate-200 bg-white p-0.5 shrink-0">
        <button
          onClick={() => onChangeBoardView('kanban')}
          className={`inline-flex h-7 items-center gap-1 rounded px-2 text-[11px] font-medium transition-colors ${
            boardView === 'kanban' ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-50'
          }`}
          title="Kanban view"
        >
          <KanbanSquare className="h-3.5 w-3.5" />
          Kanban
        </button>
        <button
          onClick={() => onChangeBoardView('gantt')}
          className={`inline-flex h-7 items-center gap-1 rounded px-2 text-[11px] font-medium transition-colors ${
            boardView === 'gantt' ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-50'
          }`}
          title="Gantt view"
        >
          <ChartGantt className="h-3.5 w-3.5" />
          Gantt
        </button>
        <button
          onClick={() => onChangeBoardView('table')}
          className={`inline-flex h-7 items-center gap-1 rounded px-2 text-[11px] font-medium transition-colors ${
            boardView === 'table' ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-50'
          }`}
          title="Table view"
        >
          <List className="h-3.5 w-3.5" />
          Table
        </button>
        <button
          onClick={() => onChangeBoardView('calendar')}
          className={`inline-flex h-7 items-center gap-1 rounded px-2 text-[11px] font-medium transition-colors ${
            boardView === 'calendar' ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-50'
          }`}
          title="Calendar view"
        >
          <Calendar className="h-3.5 w-3.5" />
          Calendar
        </button>
        <button
          onClick={() => onChangeBoardView('workload')}
          className={`inline-flex h-7 items-center gap-1 rounded px-2 text-[11px] font-medium transition-colors ${
            boardView === 'workload' ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-50'
          }`}
          title="Workload view"
        >
          <Users className="h-3.5 w-3.5" />
          Workload
        </button>
      </div>

      <div className="inline-flex flex-wrap items-center gap-2">
        {allowSavedViews ? (
          <button
            onClick={onSaveView}
            className="h-9 md:h-7 px-3 md:px-2 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-xs md:text-[11px] font-medium text-slate-700 transition-colors whitespace-nowrap shrink-0"
          >
            Save view
          </button>
        ) : null}

        {hasSavedViews ? (
          <div className="w-[180px] shrink-0">
            <AppSelect
              value={appliedViewId || ''}
              onChange={onApplyView}
              className="h-9 md:h-7 rounded-md border border-slate-200 bg-white px-2 text-xs md:text-[11px] text-slate-700"
              placeholder="Apply view"
              options={[
                { value: '', label: 'Apply view', disabled: true },
                ...savedViews.map((view) => ({ value: view.id, label: view.name }))
              ]}
            />
          </div>
        ) : null}

        {hasSavedViews ? (
          <button
            onClick={onOpenManageViews}
            className="h-9 md:h-7 px-3 md:px-2 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-xs md:text-[11px] font-medium text-slate-600 transition-colors whitespace-nowrap shrink-0"
          >
            Manage views
          </button>
        ) : null}

        {hasSavedViews ? (
          <button
            onClick={onDeleteAppliedView}
            disabled={!appliedViewId}
            className="h-9 md:h-7 px-3 md:px-2 rounded-md border border-rose-200 bg-rose-50 hover:bg-rose-100 text-xs md:text-[11px] font-medium text-rose-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap shrink-0"
          >
            Delete view
          </button>
        ) : null}
      </div>

      <div className="inline-flex flex-wrap items-center gap-2">
        {activeProject && (
          <button
            onClick={onOptimizeOrder}
            disabled={isTriaging}
            className="h-9 md:h-7 px-3 md:px-2 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-xs md:text-[11px] font-medium text-slate-700 transition-colors disabled:opacity-50 inline-flex items-center gap-1 whitespace-nowrap shrink-0"
          >
            {isTriaging ? <Loader2 className="w-3 h-3 animate-spin" /> : <ListOrdered className="w-3 h-3" />}
            Optimize {projectStages[0]?.name || 'Backlog'}
          </button>
        )}

        {activeProject && canGenerateTasksWithAI && onOpenGenerateTasksWithAI && (
          <button
            onClick={onOpenGenerateTasksWithAI}
            className="h-9 md:h-7 px-3 md:px-2 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-xs md:text-[11px] font-medium text-slate-700 transition-colors inline-flex items-center gap-1 whitespace-nowrap shrink-0"
          >
            <Sparkles className="w-3 h-3" />
            AI tasks
          </button>
        )}

        {activeProject && canManageStages && (
          <button
            onClick={onOpenStages}
            className="h-9 md:h-7 px-3 md:px-2 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-xs md:text-[11px] font-medium text-slate-700 transition-colors inline-flex items-center gap-1 whitespace-nowrap shrink-0"
          >
            <Settings2 className="w-3 h-3" />
            Stages
          </button>
        )}
      </div>

      {selectedTaskIds.length > 0 && (
        <div className="h-9 md:h-7 px-2.5 rounded-md border border-slate-200 bg-slate-50 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0">
          <span className="text-xs text-slate-700">{selectedTaskIds.length} selected</span>
          <button onClick={onClearSelected} className="p-1 rounded hover:bg-slate-200">
            <X className="w-3 h-3 text-slate-500" />
          </button>
        </div>
      )}
    </div>
  );
};

export default KanbanHeaderActions;
