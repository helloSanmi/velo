import React, { useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';

interface ProjectCompletionPromptModalProps {
  isOpen: boolean;
  projectName: string;
  finalStageName: string;
  mode?: 'direct' | 'request' | 'approve';
  requestedByName?: string;
  requestedComment?: string;
  isSubmitting?: boolean;
  onClose: () => void;
  onComplete: (comment: string) => void;
  onReject?: (comment: string) => void;
}

const ProjectCompletionPromptModal: React.FC<ProjectCompletionPromptModalProps> = ({
  isOpen,
  projectName,
  finalStageName,
  mode = 'direct',
  requestedByName,
  requestedComment,
  isSubmitting = false,
  onClose,
  onComplete,
  onReject
}) => {
  const [comment, setComment] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setComment('');
  }, [isOpen, projectName]);

  if (!isOpen) return null;

  const title =
    mode === 'approve' ? 'Approve Project Completion?' : mode === 'request' ? 'Request Project Completion?' : 'Complete Project?';
  const primaryCta =
    mode === 'approve' ? 'Approve completion' : mode === 'request' ? 'Send for approval' : 'Complete project';
  const commentLabel =
    mode === 'approve'
      ? 'Approval comment (optional)'
      : mode === 'request'
        ? 'Completion comment (required)'
        : 'Completion comment (optional)';

  return (
    <div
      className="fixed inset-0 z-[280] bg-slate-900/45 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4"
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <div className="w-full max-w-[560px] rounded-t-2xl md:rounded-2xl border border-slate-200 bg-white shadow-2xl p-4 md:p-5 max-h-[94dvh] overflow-y-auto custom-scrollbar">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
            <p className="text-sm text-slate-600 mt-1">
              All tasks in <span className="font-medium text-slate-900">{projectName}</span> are in{' '}
              <span className="font-medium text-slate-900">{finalStageName}</span>.
            </p>
            {mode === 'approve' && requestedByName ? (
              <p className="text-xs text-slate-500 mt-1.5">Requested by {requestedByName}.</p>
            ) : null}
          </div>
        </div>

        {mode === 'approve' && requestedComment ? (
          <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-[11px] text-slate-500 uppercase tracking-wide">Requester comment</p>
            <p className="text-sm text-slate-700 mt-1">{requestedComment}</p>
          </div>
        ) : null}

        <div className="mt-4">
          <label className="text-xs font-medium text-slate-600">{commentLabel}</label>
          <textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="Add a summary note before moving this project to completed..."
            className="mt-1.5 w-full min-h-[110px] rounded-xl border border-slate-300 p-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
          />
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          {mode === 'approve' && onReject ? (
            <button
              disabled={isSubmitting}
              onClick={() => onReject(comment)}
              className="h-10 px-4 rounded-lg border border-rose-300 bg-rose-50 text-sm font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Reject and move task back
            </button>
          ) : null}
          <button
            disabled={isSubmitting}
            onClick={onClose}
            className="h-10 px-4 rounded-lg border border-slate-300 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            Not now
          </button>
          <button
            disabled={isSubmitting}
            onClick={() => onComplete(comment)}
            className="h-10 px-4 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {primaryCta}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProjectCompletionPromptModal;
