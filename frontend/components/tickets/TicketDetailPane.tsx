import React from 'react';
import { MoreHorizontal, TicketCheck, Trash2 } from 'lucide-react';
import { IntakeTicket, IntakeTicketPriority, IntakeTicketStatus } from '../../types';
import Button from '../ui/Button';
import TicketConversationPanel from './TicketConversationPanel';
import TicketPropertiesPanel from './TicketPropertiesPanel';
import { ComposerMode, ticketReference } from './ticketConstants';

interface TicketDetailPaneProps {
  selectedTicket: IntakeTicket | null;
  busyId: string | null;
  setComposerMode: (mode: ComposerMode) => void;
  composerMode: ComposerMode;
  setIsActionsMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isActionsMenuOpen: boolean;
  actionsMenuRef: React.RefObject<HTMLDivElement | null>;
  onClose: () => void;
  onConvert: () => void;
  onDelete: () => void;
  commentStatus: IntakeTicketStatus;
  setCommentStatus: (value: IntakeTicketStatus) => void;
  commentStartAt: string;
  setCommentStartAt: (value: string) => void;
  canManageSelectedTicket: boolean;
  forwardTarget: string;
  setForwardTarget: (value: string) => void;
  commentText: string;
  setCommentText: (value: string) => void;
  composerInputRef: React.RefObject<HTMLTextAreaElement | null>;
  onSubmit: () => void;
  createStatusOptions: Array<{ value: IntakeTicketStatus; label: string }>;
  createProjectOptions: Array<{ value: string; label: string }>;
  assigneeOptions: Array<{ value: string; label: string }>;
  onUpdateTicket: (patch: { status?: IntakeTicketStatus; startedAt?: number | null; projectId?: string; assigneeId?: string | null; priority?: IntakeTicketPriority }) => void;
}

const TicketDetailPane: React.FC<TicketDetailPaneProps> = ({
  selectedTicket,
  busyId,
  setComposerMode,
  composerMode,
  setIsActionsMenuOpen,
  isActionsMenuOpen,
  actionsMenuRef,
  onClose,
  onConvert,
  onDelete,
  commentStatus,
  setCommentStatus,
  commentStartAt,
  setCommentStartAt,
  canManageSelectedTicket,
  forwardTarget,
  setForwardTarget,
  commentText,
  setCommentText,
  composerInputRef,
  onSubmit,
  createStatusOptions,
  createProjectOptions,
  assigneeOptions,
  onUpdateTicket
}) => {
  if (!selectedTicket) return <div className="mt-12 text-center text-sm text-slate-500">Ticket not found.</div>;

  return (
    <div className="grid min-h-full grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-h-0 border-r border-slate-200">
        <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-4 py-3">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Button variant={composerMode === 'reply' ? 'primary' : 'secondary'} className="h-8 px-3 text-xs" onClick={() => setComposerMode('reply')}>
              Reply
            </Button>
            <Button variant={composerMode === 'forward' ? 'primary' : 'secondary'} className="h-8 px-3 text-xs" onClick={() => setComposerMode('forward')}>
              Forward
            </Button>
            <Button variant="secondary" className="h-8 px-3 text-xs" onClick={onClose} disabled={busyId === selectedTicket.id}>
              Close
            </Button>
            <div className="relative" ref={actionsMenuRef}>
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                onClick={() => setIsActionsMenuOpen((prev) => !prev)}
                title="More actions"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
              {isActionsMenuOpen ? (
                <div className="absolute right-0 z-20 mt-1.5 w-44 rounded-lg border border-slate-200 bg-white p-1.5 shadow-lg">
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    disabled={busyId === selectedTicket.id || selectedTicket.status === 'converted'}
                    onClick={onConvert}
                  >
                    <TicketCheck className="h-3.5 w-3.5" />
                    Convert to task
                  </button>
                  <button
                    type="button"
                    className="mt-1 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                    disabled={busyId === selectedTicket.id}
                    onClick={onDelete}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete ticket
                  </button>
                </div>
              ) : null}
            </div>
          </div>
          <h3 className="text-xl font-semibold text-slate-900">{selectedTicket.title}</h3>
          <p className="mt-1 text-xs text-slate-500">
            {ticketReference(selectedTicket)} • Requested by {selectedTicket.requesterName}
            {selectedTicket.requesterEmail ? ` (${selectedTicket.requesterEmail})` : ''}
          </p>
        </div>

        <TicketConversationPanel
          composerMode={composerMode}
          setComposerMode={setComposerMode}
          commentStatus={commentStatus}
          setCommentStatus={setCommentStatus}
          commentStartAt={commentStartAt}
          setCommentStartAt={setCommentStartAt}
          canManageSelectedTicket={canManageSelectedTicket}
          createStatusOptions={createStatusOptions}
          forwardTarget={forwardTarget}
          setForwardTarget={setForwardTarget}
          commentText={commentText}
          setCommentText={setCommentText}
          composerInputRef={composerInputRef}
          onSubmit={onSubmit}
          selectedTicketStatus={selectedTicket.status}
          selectedTicketStartedAt={selectedTicket.startedAt}
          comments={selectedTicket.comments || []}
          originalDescription={selectedTicket.description}
        />
      </div>

      <TicketPropertiesPanel
        selectedTicket={selectedTicket}
        busyId={busyId}
        createProjectOptions={createProjectOptions}
        assigneeOptions={assigneeOptions}
        onUpdateTicket={onUpdateTicket}
      />
    </div>
  );
};

export default TicketDetailPane;
