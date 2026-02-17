import React, { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Copy, Trash2, X } from 'lucide-react';
import { SavedBoardView } from '../../services/savedViewService';
import { dialogService } from '../../services/dialogService';

interface SavedViewsManagerModalProps {
  isOpen: boolean;
  views: SavedBoardView[];
  onClose: () => void;
  onSave: (views: SavedBoardView[]) => void;
  onApply: (id: string) => void;
}

const SavedViewsManagerModal: React.FC<SavedViewsManagerModalProps> = ({ isOpen, views, onClose, onSave, onApply }) => {
  const [draft, setDraft] = useState<SavedBoardView[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    setDraft(views.map((view) => ({ ...view })));
  }, [isOpen, views]);

  const canSave = useMemo(() => {
    if (draft.length !== views.length) return true;
    return draft.some((view, index) => view.id !== views[index]?.id || view.name !== views[index]?.name);
  }, [draft, views]);

  if (!isOpen) return null;

  const move = (index: number, dir: -1 | 1) => {
    const nextIndex = index + dir;
    if (nextIndex < 0 || nextIndex >= draft.length) return;
    setDraft((prev) => {
      const clone = [...prev];
      const [item] = clone.splice(index, 1);
      clone.splice(nextIndex, 0, item);
      return clone;
    });
  };

  const remove = async (id: string) => {
    const target = draft.find((item) => item.id === id);
    const confirmed = await dialogService.confirm(`Remove saved view "${target?.name || 'this view'}"?`, {
      title: 'Remove saved view',
      confirmText: 'Remove',
      danger: true
    });
    if (!confirmed) return;
    setDraft((prev) => prev.filter((item) => item.id !== id));
  };

  const copyConfig = async (view: SavedBoardView) => {
    const payload = {
      name: view.name,
      projectFilter: view.projectFilter,
      statusFilter: view.statusFilter,
      priorityFilter: view.priorityFilter,
      tagFilter: view.tagFilter,
      assigneeFilter: view.assigneeFilter,
      searchQuery: view.searchQuery,
      dueFrom: view.dueFrom,
      dueTo: view.dueTo
    };
    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    } catch {
      // no-op if clipboard API is unavailable
    }
  };

  return (
    <div className="fixed inset-0 z-[250] bg-slate-900/45 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-2xl rounded-none md:rounded-xl border border-slate-200 bg-white shadow-2xl overflow-hidden h-[100dvh] md:h-auto md:max-h-[84vh] flex flex-col">
        <div className="h-12 px-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">Saved Views Manager</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-500 flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 flex-1 min-h-0 md:max-h-[62vh] overflow-y-auto custom-scrollbar space-y-2">
          {draft.length === 0 ? (
            <div className="h-24 rounded-lg border border-dashed border-slate-200 text-sm text-slate-500 flex items-center justify-center">No saved views.</div>
          ) : (
            draft.map((view, index) => (
              <div key={view.id} className="rounded-lg border border-slate-200 bg-white p-3 flex items-center gap-2">
                <input
                  value={view.name}
                  onChange={(e) => setDraft((prev) => prev.map((item) => (item.id === view.id ? { ...item, name: e.target.value } : item)))}
                  className="h-9 flex-1 rounded-lg border border-slate-300 px-3 text-sm outline-none"
                />
                <button onClick={() => onApply(view.id)} className="h-9 px-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-700">Apply</button>
                <button onClick={() => copyConfig(view)} className="h-9 px-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 inline-flex items-center gap-1"><Copy className="w-3.5 h-3.5" /> Share</button>
                <button onClick={() => move(index, -1)} disabled={index === 0} className="w-9 h-9 rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-40 flex items-center justify-center"><ArrowUp className="w-3.5 h-3.5" /></button>
                <button onClick={() => move(index, 1)} disabled={index === draft.length - 1} className="w-9 h-9 rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-40 flex items-center justify-center"><ArrowDown className="w-3.5 h-3.5" /></button>
                <button onClick={() => remove(view.id)} className="w-9 h-9 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 flex items-center justify-center"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            ))
          )}
        </div>

        <div className="h-14 px-4 border-t border-slate-200 flex items-center justify-end gap-2">
          <button onClick={onClose} className="h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-700">Close</button>
          <button
            disabled={!canSave}
            onClick={() => onSave(draft.map((view) => ({ ...view, name: view.name.trim() || 'Untitled view' })))}
            className="h-9 px-3 rounded-lg bg-slate-900 text-white text-sm disabled:opacity-40"
          >
            Save changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default SavedViewsManagerModal;
