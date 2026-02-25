import React from 'react';
import { ProjectStage, Task, User } from '../../types';
import SaveViewModal from './SaveViewModal';
import SavedViewsManagerModal from './SavedViewsManagerModal';
import ProjectStageEditorModal from './ProjectStageEditorModal';
import { SavedBoardView } from '../../services/savedViewService';
import { TaskPriority } from '../../types';
import AIGenerateTasksModal from './AIGenerateTasksModal';

interface KanbanModalsProps {
  currentUserId: string;
  isSavedViewsOpen: boolean;
  savedViews: SavedBoardView[];
  onCloseSavedViews: () => void;
  onSaveManagedViews: (views: SavedBoardView[]) => void;
  onApplySavedView: (id: string) => void;
  showStageEditor: boolean;
  draftStages: ProjectStage[];
  setDraftStages: React.Dispatch<React.SetStateAction<ProjectStage[]>>;
  newStageName: string;
  setNewStageName: React.Dispatch<React.SetStateAction<string>>;
  onCloseStageEditor: () => void;
  onAddStage: () => void;
  onRemoveStage: (stageId: string) => void;
  onSaveStages: () => void;
  isSaveViewOpen: boolean;
  saveViewName: string;
  setSaveViewName: React.Dispatch<React.SetStateAction<string>>;
  shareViewWithWorkspace: boolean;
  setShareViewWithWorkspace: React.Dispatch<React.SetStateAction<boolean>>;
  onCloseSaveView: () => void;
  onSaveView: () => void;
  isGenerateTasksOpen?: boolean;
  onCloseGenerateTasks?: () => void;
  activeProjectName?: string;
  activeProjectDescription?: string;
  assigneeCandidates?: User[];
  projectTasks?: Task[];
  onGenerateTasks?: (tasks: Array<{ title: string; description: string; priority: TaskPriority; tags: string[]; assigneeIds?: string[] }>) => void;
}

const KanbanModals: React.FC<KanbanModalsProps> = ({
  currentUserId,
  isSavedViewsOpen,
  savedViews,
  onCloseSavedViews,
  onSaveManagedViews,
  onApplySavedView,
  showStageEditor,
  draftStages,
  setDraftStages,
  newStageName,
  setNewStageName,
  onCloseStageEditor,
  onAddStage,
  onRemoveStage,
  onSaveStages,
  isSaveViewOpen,
  saveViewName,
  setSaveViewName,
  shareViewWithWorkspace,
  setShareViewWithWorkspace,
  onCloseSaveView,
  onSaveView,
  isGenerateTasksOpen = false,
  onCloseGenerateTasks,
  activeProjectName,
  activeProjectDescription,
  assigneeCandidates = [],
  projectTasks = [],
  onGenerateTasks
}) => {
  return (
    <>
      <SavedViewsManagerModal
        isOpen={isSavedViewsOpen}
        currentUserId={currentUserId}
        views={savedViews}
        onClose={onCloseSavedViews}
        onSave={onSaveManagedViews}
        onApply={onApplySavedView}
      />

      <ProjectStageEditorModal
        isOpen={showStageEditor}
        draftStages={draftStages}
        setDraftStages={setDraftStages}
        newStageName={newStageName}
        setNewStageName={setNewStageName}
        onClose={onCloseStageEditor}
        onAddStage={onAddStage}
        onRemoveStage={onRemoveStage}
        onSave={onSaveStages}
      />

      <SaveViewModal
        isOpen={isSaveViewOpen}
        name={saveViewName}
        setName={setSaveViewName}
        shareWithWorkspace={shareViewWithWorkspace}
        setShareWithWorkspace={setShareViewWithWorkspace}
        onClose={onCloseSaveView}
        onSave={onSaveView}
      />

      {activeProjectName && onCloseGenerateTasks && onGenerateTasks ? (
        <AIGenerateTasksModal
          isOpen={isGenerateTasksOpen}
          onClose={onCloseGenerateTasks}
          onGenerate={onGenerateTasks}
          projectName={activeProjectName}
          projectDescription={activeProjectDescription}
          assigneeCandidates={assigneeCandidates}
          projectTasks={projectTasks}
        />
      ) : null}
    </>
  );
};

export default KanbanModals;
