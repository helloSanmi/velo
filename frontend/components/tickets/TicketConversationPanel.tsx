import React, { useMemo } from 'react';
import { MessageSquare } from 'lucide-react';
import { IntakeTicketStatus } from '../../types';
import Button from '../ui/Button';
import AppSelect from '../ui/AppSelect';
import { ComposerMode, parseCommentPresentation, parseDateTimeLocalInput } from './ticketConstants';

interface TicketConversationPanelProps {
  composerMode: ComposerMode;
  setComposerMode: (mode: ComposerMode) => void;
  commentStatus: IntakeTicketStatus;
  setCommentStatus: (value: IntakeTicketStatus) => void;
  commentStartAt: string;
  setCommentStartAt: (value: string) => void;
  canManageSelectedTicket: boolean;
  createStatusOptions: Array<{ value: IntakeTicketStatus; label: string }>;
  forwardTarget: string;
  setForwardTarget: (value: string) => void;
  commentText: string;
  setCommentText: (value: string) => void;
  composerInputRef: React.RefObject<HTMLTextAreaElement | null>;
  onSubmit: () => void;
  selectedTicketStatus: IntakeTicketStatus;
  selectedTicketStartedAt?: number;
  comments: Array<{ id: string; userName: string; text: string; createdAt: number }>;
  originalDescription?: string;
}

const TicketConversationPanel: React.FC<TicketConversationPanelProps> = ({
  composerMode,
  setComposerMode,
  commentStatus,
  setCommentStatus,
  commentStartAt,
  setCommentStartAt,
  canManageSelectedTicket,
  createStatusOptions,
  forwardTarget,
  setForwardTarget,
  commentText,
  setCommentText,
  composerInputRef,
  onSubmit,
  selectedTicketStatus,
  selectedTicketStartedAt,
  comments,
  originalDescription
}) => {
  const formatDayHeading = (timestamp: number) => {
    const date = new Date(timestamp);
    const target = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const oneDay = 24 * 60 * 60 * 1000;
    if (target === today) return 'Today';
    if (target === today - oneDay) return 'Yesterday';
    return date.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const groupedComments = useMemo(() => {
    const sorted = [...comments].sort((a, b) => b.createdAt - a.createdAt);
    const groups: Array<{ key: string; heading: string; comments: typeof sorted }> = [];
    sorted.forEach((comment) => {
      const date = new Date(comment.createdAt || Date.now());
      const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      const existing = groups.find((group) => group.key === key);
      if (existing) {
        existing.comments.push(comment);
        return;
      }
      groups.push({
        key,
        heading: formatDayHeading(comment.createdAt || Date.now()),
        comments: [comment]
      });
    });
    return groups;
  }, [comments]);

  const canSend =
    (composerMode !== 'forward' || forwardTarget.trim().length > 0) &&
    (!!commentText.trim() ||
      (canManageSelectedTicket &&
        (commentStatus !== selectedTicketStatus || parseDateTimeLocalInput(commentStartAt) !== (selectedTicketStartedAt ?? undefined))));

  return (
    <div className="flex h-[calc(100%-88px)] flex-col bg-slate-50">
      <section className="border-b border-slate-200 bg-white p-3">
        <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-800">
          <MessageSquare className="h-4 w-4" />
          {composerMode === 'forward' ? 'Forward message' : 'Reply'}
        </div>
        <div className="mb-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <AppSelect
            value={commentStatus}
            onChange={(value) => setCommentStatus(value as IntakeTicketStatus)}
            options={createStatusOptions}
            className="h-10 rounded-lg border border-slate-200 px-2.5 text-sm"
            disabled={!canManageSelectedTicket}
          />
          <input
            type="datetime-local"
            value={commentStartAt}
            onChange={(event) => setCommentStartAt(event.target.value)}
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-slate-300 disabled:bg-slate-50 disabled:text-slate-400"
            disabled={!canManageSelectedTicket}
          />
        </div>
        {composerMode === 'forward' ? (
          <input
            value={forwardTarget}
            onChange={(event) => setForwardTarget(event.target.value)}
            placeholder="Forward target (required)"
            className="mb-2 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-slate-300"
          />
        ) : null}
        <div className="flex items-end gap-2">
          <textarea
            ref={composerInputRef}
            value={commentText}
            onChange={(event) => setCommentText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                onSubmit();
              }
            }}
            placeholder={composerMode === 'forward' ? 'Write forward message and press Enter' : 'Write reply and press Enter'}
            rows={4}
            className="min-h-[96px] flex-1 resize-y rounded-lg border border-slate-200 px-3 py-2 text-sm leading-6 outline-none focus:border-slate-300"
          />
          <Button className="h-10 shrink-0 px-3 text-sm" onClick={onSubmit} disabled={!canSend}>
            Send
          </Button>
        </div>
      </section>

      <section className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        {comments.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-500">No conversation yet.</div>
        ) : (
          groupedComments.map((group) => (
            <div key={group.key} className="space-y-2">
              <div className="sticky top-0 z-[1] flex justify-center">
                <span className="inline-flex items-center rounded-full border border-slate-200 bg-white/95 px-2 py-0.5 text-[11px] font-medium text-slate-500 backdrop-blur">
                  {group.heading}
                </span>
              </div>
              {group.comments.map((comment) => {
                const parsed = parseCommentPresentation(comment.text);
                return (
                  <div key={comment.id} className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs font-medium text-slate-700">{comment.userName}</div>
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] text-slate-600">
                        {parsed.mode === 'forward' ? 'Forwarded' : parsed.mode === 'note' ? 'Internal note' : 'Reply'}
                      </span>
                    </div>
                    <div className="mt-1 whitespace-pre-wrap text-sm text-slate-800">{parsed.body}</div>
                    <div className="mt-1 text-[11px] text-slate-500">
                      {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="text-xs font-medium text-slate-600">Original request</div>
          <div className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">{originalDescription || 'No description'}</div>
        </div>
      </section>
    </div>
  );
};

export default TicketConversationPanel;
