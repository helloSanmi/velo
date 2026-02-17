import React from 'react';
import { X } from 'lucide-react';

interface SaveViewModalProps {
  isOpen: boolean;
  name: string;
  setName: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
}

const SaveViewModal: React.FC<SaveViewModalProps> = ({ isOpen, name, setName, onClose, onSave }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[230] bg-slate-900/45 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <div className="w-full max-w-md rounded-t-2xl md:rounded-xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
        <div className="h-11 px-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">Save View</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-500 flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4">
          <label className="block">
            <p className="text-xs text-slate-500 mb-1.5">View name</p>
            <input
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') onSave();
              }}
              placeholder="e.g. Sprint board"
              className="w-full h-10 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
            />
          </label>
        </div>
        <div className="h-14 px-4 border-t border-slate-200 flex items-center justify-end gap-2">
          <button onClick={onClose} className="h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-700">
            Cancel
          </button>
          <button onClick={onSave} className="h-9 px-3 rounded-lg bg-slate-900 text-white text-sm">
            Save view
          </button>
        </div>
      </div>
    </div>
  );
};

export default SaveViewModal;
