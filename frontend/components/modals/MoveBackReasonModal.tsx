import React from 'react';

interface MoveBackReasonModalProps {
  isOpen: boolean;
  reason: string;
  reasonError: string;
  onReasonChange: (value: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
}

const MoveBackReasonModal: React.FC<MoveBackReasonModalProps> = ({
  isOpen,
  reason,
  reasonError,
  onReasonChange,
  onCancel,
  onSubmit
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[280] bg-slate-900/45 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4"
      onClick={(event) => event.target === event.currentTarget && onCancel()}
    >
      <div className="w-full max-w-[560px] rounded-t-2xl md:rounded-2xl border border-slate-200 bg-white shadow-2xl p-4 md:p-5 max-h-[94dvh] overflow-y-auto custom-scrollbar">
        <h3 className="text-lg font-semibold text-slate-900">Reason Required</h3>
        <p className="text-sm text-slate-600 mt-1">Completed tasks need a comment before moving backward.</p>
        <textarea
          autoFocus
          value={reason}
          onChange={(event) => onReasonChange(event.target.value)}
          placeholder="Explain why this task is moving back..."
          className="mt-3 w-full min-h-[120px] rounded-xl border border-slate-300 p-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
        />
        {reasonError ? <p className="text-xs text-rose-600 mt-1.5">{reasonError}</p> : null}
        <div className="mt-4 flex items-center justify-end gap-2 pb-1">
          <button
            onClick={onCancel}
            className="h-10 px-4 rounded-lg border border-slate-300 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            className="h-10 px-4 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800"
          >
            Save reason and move
          </button>
        </div>
      </div>
    </div>
  );
};

export default MoveBackReasonModal;
