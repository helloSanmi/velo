import React from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { ProjectStage } from '../../types';

interface ProjectStageEditorModalProps {
  isOpen: boolean;
  draftStages: ProjectStage[];
  setDraftStages: React.Dispatch<React.SetStateAction<ProjectStage[]>>;
  newStageName: string;
  setNewStageName: (value: string) => void;
  onClose: () => void;
  onAddStage: () => void;
  onRemoveStage: (stageId: string) => void;
  onSave: () => void;
}

const ProjectStageEditorModal: React.FC<ProjectStageEditorModalProps> = ({
  isOpen,
  draftStages,
  setDraftStages,
  newStageName,
  setNewStageName,
  onClose,
  onAddStage,
  onRemoveStage,
  onSave
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[180] bg-slate-900/40 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4"
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <div className="w-full max-w-lg rounded-none md:rounded-xl border border-slate-200 bg-white shadow-2xl overflow-hidden h-[100dvh] md:h-auto md:max-h-[78vh] flex flex-col">
        <div className="h-11 px-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">Project stages</h3>
          <button onClick={onClose} className="w-7 h-7 rounded-md hover:bg-slate-100 text-slate-500 flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 space-y-3 overflow-hidden flex-1 min-h-0">
          <div className="space-y-3 max-h-[46vh] overflow-y-auto custom-scrollbar pr-1">
            {draftStages.map((stage) => (
              <div key={stage.id}>
                <p className="text-[11px] text-slate-500 mb-1">Stage name</p>
                <div className="flex gap-2">
                  <input
                    value={stage.name}
                    onChange={(event) =>
                      setDraftStages((prev) =>
                        prev.map((item) => (item.id === stage.id ? { ...item, name: event.target.value } : item))
                      )
                    }
                    className="flex-1 h-9 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                  />
                  <button
                    onClick={() => onRemoveStage(stage.id)}
                    className="h-9 px-2 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 inline-flex items-center gap-1 text-xs"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="pt-2 border-t border-slate-200">
            <p className="text-[11px] text-slate-500 mb-1.5">Add stage</p>
            <div className="flex gap-2">
              <input
                value={newStageName}
                onChange={(event) => setNewStageName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    onAddStage();
                  }
                }}
                placeholder="Example: Review"
                className="flex-1 h-9 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
              />
              <button
                onClick={onAddStage}
                className="h-9 px-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>
          </div>
        </div>
        <div className="p-3 border-t border-slate-200 bg-white flex items-center gap-2">
          <button onClick={onClose} className="flex-1 h-9 rounded-lg border border-slate-300 text-sm text-slate-700 hover:bg-slate-50">
            Cancel
          </button>
          <button onClick={onSave} className="flex-1 h-9 rounded-lg bg-slate-900 text-white text-sm hover:bg-slate-800">
            Save stages
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProjectStageEditorModal;
