import React from 'react';
import { ChevronDown, ListOrdered, Loader2, Settings2, Sparkles, X } from 'lucide-react';
import { KanbanHeaderProps } from './types';

type KanbanHeaderActionsProps = Pick<
  KanbanHeaderProps,
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
  return (
    <div className="flex items-center justify-start lg:justify-end gap-2 overflow-x-auto no-scrollbar pb-0.5">
      {allowSavedViews ? (
        <button
          onClick={onSaveView}
          className="h-9 md:h-7 px-3 md:px-2 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-xs md:text-[11px] font-medium text-slate-700 transition-colors whitespace-nowrap shrink-0"
        >
          Save view
        </button>
      ) : null}

      {allowSavedViews && savedViews.length > 0 && (
        <div className="relative">
          <select
            className="velo-select h-9 md:h-7 rounded-md border border-slate-200 bg-white pl-2 pr-7 text-xs md:text-[11px] text-slate-700 outline-none appearance-none whitespace-nowrap shrink-0"
            onChange={(event) => onApplyView(event.target.value)}
            value={appliedViewId || ''}
          >
            <option value="" disabled>
              Apply view
            </option>
            {savedViews.map((view) => (
              <option key={view.id} value={view.id}>
                {view.name}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
        </div>
      )}

      {allowSavedViews && savedViews.length > 0 && (
        <button
          onClick={onDeleteAppliedView}
          disabled={!appliedViewId}
          className="h-9 md:h-7 px-3 md:px-2 rounded-md border border-rose-200 bg-rose-50 hover:bg-rose-100 text-xs md:text-[11px] font-medium text-rose-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap shrink-0"
        >
          Delete view
        </button>
      )}

      {allowSavedViews && savedViews.length > 0 && (
        <button
          onClick={onOpenManageViews}
          className="h-9 md:h-7 px-3 md:px-2 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-xs md:text-[11px] font-medium text-slate-600 transition-colors whitespace-nowrap shrink-0"
        >
          Manage views
        </button>
      )}

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
