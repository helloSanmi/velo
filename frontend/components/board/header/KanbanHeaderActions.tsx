import React from 'react';
import { KanbanHeaderProps } from './types';
import ViewModeSwitch from './actions/ViewModeSwitch';
import SavedViewActions from './actions/SavedViewActions';
import KanbanActionButtons from './actions/KanbanActionButtons';

type KanbanHeaderActionsProps = Pick<
  KanbanHeaderProps,
  | 'boardView'
  | 'onChangeBoardView'
  | 'checklistDensity'
  | 'onChecklistDensityChange'
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
  | 'dueFrom'
  | 'dueTo'
  | 'setDueFrom'
  | 'setDueTo'
>;

const KanbanHeaderActions: React.FC<KanbanHeaderActionsProps> = ({
  boardView,
  onChangeBoardView,
  checklistDensity,
  onChecklistDensityChange,
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
  onClearSelected,
  dueFrom,
  dueTo,
  setDueFrom,
  setDueTo
}) => {
  return (
    <div className="flex flex-wrap items-center gap-2 pb-0.5">
      <ViewModeSwitch boardView={boardView} onChangeBoardView={onChangeBoardView} />
      <SavedViewActions
        allowSavedViews={allowSavedViews}
        onSaveView={onSaveView}
        savedViews={savedViews}
        onApplyView={onApplyView}
        appliedViewId={appliedViewId}
        onDeleteAppliedView={onDeleteAppliedView}
        onOpenManageViews={onOpenManageViews}
      />
      <KanbanActionButtons
        activeProject={activeProject}
        onOptimizeOrder={onOptimizeOrder}
        isTriaging={isTriaging}
        projectStages={projectStages}
        canManageStages={canManageStages}
        onOpenStages={onOpenStages}
        canGenerateTasksWithAI={canGenerateTasksWithAI}
        onOpenGenerateTasksWithAI={onOpenGenerateTasksWithAI}
        boardView={boardView}
        checklistDensity={checklistDensity}
        onChecklistDensityChange={onChecklistDensityChange}
        selectedTaskIds={selectedTaskIds}
        onClearSelected={onClearSelected}
        dueFrom={dueFrom}
        dueTo={dueTo}
        onDueFromChange={setDueFrom}
        onDueToChange={setDueTo}
      />
    </div>
  );
};

export default KanbanHeaderActions;
