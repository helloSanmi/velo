import React from 'react';

interface GanttDependencyModalProps {
  editingTaskTitle: string;
  dependencyCandidates: Array<{ id: string; title: string; status: string }>;
  draftDependencyIds: string[];
  onDraftDependencyIdsChange: (ids: string[]) => void;
  onClose: () => void;
  onSave: () => void;
}

const GanttDependencyModal: React.FC<GanttDependencyModalProps> = ({
  editingTaskTitle,
  dependencyCandidates,
  draftDependencyIds,
  onDraftDependencyIdsChange,
  onClose,
  onSave
}) => {
  return (
    <div
      className="fixed inset-0 z-[220] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        onClose();
      }}
    >
      <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white shadow-2xl">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-slate-900 truncate">Dependencies for {editingTaskTitle}</p>
          <button
            type="button"
            onClick={onClose}
            className="h-8 rounded-md border border-slate-300 bg-white px-2.5 text-xs text-slate-700 hover:bg-slate-100"
          >
            Close
          </button>
        </div>
        <div className="px-4 py-3">
          <p className="text-xs text-slate-500 mb-2">Select tasks that must finish before this task can start.</p>
          <div className="max-h-72 overflow-y-auto space-y-1.5">
            {dependencyCandidates.map((candidate) => {
              const checked = draftDependencyIds.includes(candidate.id);
              return (
                <label key={candidate.id} className="flex items-center gap-2 rounded border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-700">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(event) => {
                      const next = event.target.checked
                        ? [...draftDependencyIds, candidate.id]
                        : draftDependencyIds.filter((id) => id !== candidate.id);
                      onDraftDependencyIdsChange(next);
                    }}
                  />
                  <span className="truncate">{candidate.title}</span>
                  <span className="text-slate-500 ml-auto">{candidate.status}</span>
                </label>
              );
            })}
            {dependencyCandidates.length === 0 ? (
              <p className="text-xs text-slate-500">No scheduled tasks available as dependencies.</p>
            ) : null}
          </div>
        </div>
        <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            className="h-9 rounded-md border border-slate-900 bg-slate-900 px-3 text-sm text-white hover:bg-slate-800"
          >
            Save dependencies
          </button>
        </div>
      </div>
    </div>
  );
};

export default GanttDependencyModal;
