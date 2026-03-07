import React from 'react';
import AppSelect from '../../../ui/AppSelect';
import { KanbanHeaderProps } from '../types';
import { ensurePlanAccess, getPlanUpgradeMessage } from '../../../../services/planAccessService';

interface SavedViewActionsProps {
  allowSavedViews: KanbanHeaderProps['allowSavedViews'];
  onSaveView: KanbanHeaderProps['onSaveView'];
  savedViews: KanbanHeaderProps['savedViews'];
  onApplyView: KanbanHeaderProps['onApplyView'];
  appliedViewId: KanbanHeaderProps['appliedViewId'];
  onDeleteAppliedView: KanbanHeaderProps['onDeleteAppliedView'];
  onOpenManageViews: KanbanHeaderProps['onOpenManageViews'];
}

const SavedViewActions: React.FC<SavedViewActionsProps> = ({
  allowSavedViews,
  onSaveView,
  savedViews,
  onApplyView,
  appliedViewId,
  onDeleteAppliedView,
  onOpenManageViews
}) => {
  const hasSavedViews = allowSavedViews && savedViews.length > 0;
  return (
    <div className="inline-flex flex-wrap items-center gap-2">
      {allowSavedViews ? (
        <button
          onClick={onSaveView}
          className="h-9 md:h-7 px-3 md:px-2 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-xs md:text-[11px] font-medium text-slate-700 transition-colors whitespace-nowrap shrink-0"
        >
          Save view
        </button>
      ) : (
        <button
          onClick={() => ensurePlanAccess('savedViews', false)}
          className="h-9 md:h-7 px-3 md:px-2 rounded-md border border-amber-200 bg-amber-50 hover:bg-amber-100 text-xs md:text-[11px] font-medium text-amber-800 transition-colors whitespace-nowrap shrink-0"
          title={getPlanUpgradeMessage('savedViews')}
        >
          Saved views: upgrade
        </button>
      )}
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
  );
};

export default SavedViewActions;
