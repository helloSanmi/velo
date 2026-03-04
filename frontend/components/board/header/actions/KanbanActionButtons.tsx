import React from 'react';
import { ListOrdered, Loader2, Settings2, Sparkles, X } from 'lucide-react';
import { KanbanHeaderProps } from '../types';

type KanbanActionButtonsProps = Pick<
  KanbanHeaderProps,
  | 'activeProject'
  | 'onOptimizeOrder'
  | 'isTriaging'
  | 'projectStages'
  | 'canManageStages'
  | 'onOpenStages'
  | 'canGenerateTasksWithAI'
  | 'onOpenGenerateTasksWithAI'
  | 'boardView'
  | 'checklistDensity'
  | 'onChecklistDensityChange'
  | 'selectedTaskIds'
  | 'onClearSelected'
>;

const KanbanActionButtons: React.FC<KanbanActionButtonsProps> = ({
  activeProject,
  onOptimizeOrder,
  isTriaging,
  projectStages,
  canManageStages,
  onOpenStages,
  canGenerateTasksWithAI,
  onOpenGenerateTasksWithAI,
  boardView,
  checklistDensity,
  onChecklistDensityChange,
  selectedTaskIds,
  onClearSelected
}) => (
  <>
    <div className="inline-flex flex-wrap items-center gap-2">
      {activeProject ? (
        <button
          onClick={onOptimizeOrder}
          disabled={isTriaging}
          className="h-9 md:h-7 px-3 md:px-2 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-xs md:text-[11px] font-medium text-slate-700 transition-colors disabled:opacity-50 inline-flex items-center gap-1 whitespace-nowrap shrink-0"
        >
          {isTriaging ? <Loader2 className="w-3 h-3 animate-spin" /> : <ListOrdered className="w-3 h-3" />}
          Optimize {projectStages[0]?.name || 'Backlog'}
        </button>
      ) : null}
      {activeProject && canGenerateTasksWithAI && onOpenGenerateTasksWithAI ? (
        <button
          onClick={onOpenGenerateTasksWithAI}
          className="h-9 md:h-7 px-3 md:px-2 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-xs md:text-[11px] font-medium text-slate-700 transition-colors inline-flex items-center gap-1 whitespace-nowrap shrink-0"
        >
          <Sparkles className="w-3 h-3" />
          AI tasks
        </button>
      ) : null}
      {activeProject && canManageStages ? (
        <button
          onClick={onOpenStages}
          className="h-9 md:h-7 px-3 md:px-2 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-xs md:text-[11px] font-medium text-slate-700 transition-colors inline-flex items-center gap-1 whitespace-nowrap shrink-0"
        >
          <Settings2 className="w-3 h-3" />
          Stages
        </button>
      ) : null}
      {boardView === 'checklist' ? (
        <div className="inline-flex items-center rounded-md border border-slate-200 bg-white p-0.5 shrink-0">
          <button
            type="button"
            onClick={() => onChecklistDensityChange('comfortable')}
            className={`h-9 md:h-7 px-3 md:px-2 rounded text-xs md:text-[11px] font-medium transition-colors ${
              checklistDensity === 'comfortable' ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            Comfortable
          </button>
          <button
            type="button"
            onClick={() => onChecklistDensityChange('compact')}
            className={`h-9 md:h-7 px-3 md:px-2 rounded text-xs md:text-[11px] font-medium transition-colors ${
              checklistDensity === 'compact' ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            Compact
          </button>
        </div>
      ) : null}
    </div>
    {selectedTaskIds.length > 0 ? (
      <div className="h-9 md:h-7 px-2.5 rounded-md border border-slate-200 bg-slate-50 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0">
        <span className="text-xs text-slate-700">{selectedTaskIds.length} selected</span>
        <button onClick={onClearSelected} className="p-1 rounded hover:bg-slate-200">
          <X className="w-3 h-3 text-slate-500" />
        </button>
      </div>
    ) : null}
  </>
);

export default KanbanActionButtons;
