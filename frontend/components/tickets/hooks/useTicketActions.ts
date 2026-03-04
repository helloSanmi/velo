import { Dispatch, SetStateAction } from 'react';
import { IntakeTicket, Project, User } from '../../../types';
import { ticketService } from '../../../services/ticketService';
import { toastService } from '../../../services/toastService';
import { FORWARD_PREFIX, NOTE_PREFIX, parseDateTimeLocalInput } from '../ticketConstants';

interface UseTicketActionsArgs {
  orgId: string;
  currentUser: User;
  activeProjects: Project[];
  canManageSelectedTicket: boolean;
  commentText: string;
  commentStatus: IntakeTicket['status'];
  commentStartAt: string;
  composerMode: 'reply' | 'note' | 'forward';
  forwardTarget: string;
  selectedTicket: IntakeTicket | null;
  selectedTicketId: string | null;
  setBusyId: Dispatch<SetStateAction<string | null>>;
  setTickets: Dispatch<SetStateAction<IntakeTicket[]>>;
  setSelectedTicketId: Dispatch<SetStateAction<string | null>>;
  setCommentText: Dispatch<SetStateAction<string>>;
  setForwardTarget: Dispatch<SetStateAction<string>>;
  onRefreshTasks: () => void;
  openTicketRoute: (ticketId: string | null) => void;
}

export const useTicketActions = ({
  orgId,
  currentUser,
  activeProjects,
  canManageSelectedTicket,
  commentText,
  commentStatus,
  commentStartAt,
  composerMode,
  forwardTarget,
  selectedTicket,
  selectedTicketId,
  setBusyId,
  setTickets,
  setSelectedTicketId,
  setCommentText,
  setForwardTarget,
  onRefreshTasks,
  openTicketRoute
}: UseTicketActionsArgs) => {
  const createTicket = async (input: {
    draftTitle: string;
    draftDescription: string;
    draftStatus: IntakeTicket['status'];
    draftPriority: IntakeTicket['priority'];
    draftProjectId: string;
    draftAssigneeId: string;
    draftTags: string;
    onCreated?: (ticketId: string) => void;
  }) => {
    if (!input.draftTitle.trim()) return;
    setBusyId('create');
    try {
      const created = await ticketService.createTicket(orgId, {
        title: input.draftTitle.trim(),
        description: input.draftDescription.trim(),
        requesterName: currentUser.displayName,
        requesterEmail: currentUser.email,
        status: input.draftStatus,
        priority: input.draftPriority,
        projectId: input.draftProjectId === 'none' ? undefined : input.draftProjectId,
        assigneeId: input.draftAssigneeId === 'auto' ? undefined : input.draftAssigneeId === 'none' ? null : input.draftAssigneeId,
        tags: input.draftTags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean)
      });
      setTickets((prev) => [created, ...prev]);
      setSelectedTicketId(created.id);
      openTicketRoute(created.id);
      input.onCreated?.(created.id);
      toastService.success('Ticket created', `"${created.title}" added.`);
    } catch (error) {
      toastService.error('Create failed', error instanceof Error ? error.message : 'Could not create ticket.');
    } finally {
      setBusyId(null);
    }
  };

  const updateTicket = async (ticketId: string, patch: Parameters<typeof ticketService.updateTicket>[2]) => {
    setBusyId(ticketId);
    try {
      const updated = await ticketService.updateTicket(orgId, ticketId, patch);
      if (!updated) return;
      setTickets((prev) => prev.map((ticket) => (ticket.id === ticketId ? updated : ticket)));
    } catch (error) {
      toastService.error('Update failed', error instanceof Error ? error.message : 'Could not update ticket.');
    } finally {
      setBusyId(null);
    }
  };

  const submitCommentAction = async () => {
    if (!selectedTicket) return;
    const trimmedComment = commentText.trim();
    const trimmedForwardTarget = forwardTarget.trim();
    if (composerMode === 'forward' && !trimmedForwardTarget) {
      toastService.warning('Forward target required', 'Select Forward target before sending.');
      return;
    }
    const requestedStartAt = parseDateTimeLocalInput(commentStartAt);
    const startAtChanged = (selectedTicket.startedAt ?? undefined) !== (requestedStartAt ?? undefined);
    const statusChanged = commentStatus !== selectedTicket.status;
    const shouldApplyTicketUpdate = canManageSelectedTicket && (statusChanged || startAtChanged);
    if (!trimmedComment && !shouldApplyTicketUpdate) return;

    setBusyId(selectedTicket.id);
    try {
      let workingTicket = selectedTicket;
      if (shouldApplyTicketUpdate) {
        const patched = await ticketService.updateTicket(orgId, selectedTicket.id, {
          status: commentStatus,
          startedAt: requestedStartAt ?? null
        });
        if (patched) {
          workingTicket = patched;
          setTickets((prev) => prev.map((ticket) => (ticket.id === selectedTicket.id ? patched : ticket)));
        }
      }

      if (trimmedComment) {
        const outboundComment =
          composerMode === 'forward'
            ? `${FORWARD_PREFIX} ${trimmedForwardTarget ? `to:${trimmedForwardTarget} ` : ''}${trimmedComment}`
            : `${NOTE_PREFIX} ${trimmedComment}`;
        const finalComment = composerMode === 'reply' ? trimmedComment : outboundComment;
        const updated = await ticketService.addComment(orgId, workingTicket.id, finalComment);
        if (!updated) return;
        setTickets((prev) => prev.map((ticket) => (ticket.id === selectedTicket.id ? updated : ticket)));
        setCommentText('');
        if (composerMode === 'forward') setForwardTarget('');
      } else if (shouldApplyTicketUpdate) {
        toastService.success('Ticket updated', 'Status/start time saved.');
      }
    } catch (error) {
      toastService.error('Comment failed', error instanceof Error ? error.message : 'Could not post comment.');
    } finally {
      setBusyId(null);
    }
  };

  const convertTicket = async (ticket: IntakeTicket) => {
    const targetProjectId = ticket.projectId || activeProjects[0]?.id;
    if (!targetProjectId) {
      toastService.warning('No project', 'Create a project first to convert tickets.');
      return;
    }
    setBusyId(ticket.id);
    try {
      const converted = await ticketService.convertTicket(orgId, ticket.id, { projectId: targetProjectId, status: 'todo' });
      if (!converted) return;
      setTickets((prev) => prev.map((row) => (row.id === ticket.id ? converted.ticket : row)));
      onRefreshTasks();
      toastService.success('Converted to task', 'Ticket converted and added to board.');
    } catch (error) {
      toastService.error('Convert failed', error instanceof Error ? error.message : 'Could not convert ticket.');
    } finally {
      setBusyId(null);
    }
  };

  const deleteTicket = async (ticketId: string, allTickets: IntakeTicket[]) => {
    setBusyId(ticketId);
    try {
      await ticketService.deleteTicket(orgId, ticketId);
      const nextCandidate = allTickets.find((ticket) => ticket.id !== ticketId)?.id || null;
      setTickets((prev) => prev.filter((ticket) => ticket.id !== ticketId));
      if (selectedTicketId === ticketId) {
        setSelectedTicketId(nextCandidate);
        openTicketRoute(nextCandidate);
      }
      toastService.info('Ticket removed', 'Intake ticket deleted.');
    } catch (error) {
      toastService.error('Delete failed', error instanceof Error ? error.message : 'Could not delete ticket.');
    } finally {
      setBusyId(null);
    }
  };

  return {
    createTicket,
    updateTicket,
    submitCommentAction,
    convertTicket,
    deleteTicket
  };
};
