import { useEffect, useMemo, useRef, useState } from 'react';
import { IntakeTicketStatus, Project, User } from '../../../types';
import { getProjectOwnerIds } from '../../../services/accessPolicyService';
import { toDateTimeLocalInput } from '../ticketConstants';
import { useTicketDerived } from './useTicketDerived';
import { useTicketDraft } from './useTicketDraft';
import { useTicketTablePrefs } from './useTicketTablePrefs';
import { useTicketActions } from './useTicketActions';
import { useTicketsData } from './useTicketsData';

interface UseTicketsControllerArgs {
  orgId: string;
  currentUser: User;
  projects: Project[];
  allUsers: User[];
  onRefreshTasks: () => void;
  routeTicketId?: string | null;
  onOpenTicketRoute?: (ticketId: string | null) => void;
}

export const useTicketsController = ({
  orgId,
  currentUser,
  projects,
  allUsers,
  onRefreshTasks,
  routeTicketId,
  onOpenTicketRoute
}: UseTicketsControllerArgs) => {
  const { tickets, setTickets, loading, loadTickets } = useTicketsData({ orgId });
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | IntakeTicketStatus>('all');
  const [projectFilter, setProjectFilter] = useState<'all' | string>('all');
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [commentText, setCommentText] = useState('');
  const [commentStatus, setCommentStatus] = useState<IntakeTicketStatus>('new');
  const [commentStartAt, setCommentStartAt] = useState('');
  const [composerMode, setComposerMode] = useState<'reply' | 'note' | 'forward'>('reply');
  const [forwardTarget, setForwardTarget] = useState('');

  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);
  const actionsMenuRef = useRef<HTMLDivElement | null>(null);
  const composerInputRef = useRef<HTMLTextAreaElement | null>(null);
  const isSingleTicketRoute = Boolean(routeTicketId);

  const activeProjects = useMemo(
    () => projects.filter((project) => !project.isArchived && !project.isCompleted && !project.isDeleted),
    [projects]
  );

  const draft = useTicketDraft({ currentUser, activeProjects, allUsers });
  const tablePrefs = useTicketTablePrefs({ orgId, userId: currentUser.id });

  const { filteredTickets, sortedTickets, analytics, viewCounts, quickViewLabel } = useTicketDerived({
    tickets,
    query,
    statusFilter,
    projectFilter,
    tableSort: tablePrefs.tableSort,
    allUsers,
    currentUser
  });

  useEffect(() => {
    if (routeTicketId) {
      const exists = tickets.some((ticket) => ticket.id === routeTicketId);
      setSelectedTicketId(exists ? routeTicketId : null);
      return;
    }
    setSelectedTicketId(null);
  }, [routeTicketId, tickets]);

  const selectedTicket = useMemo(() => tickets.find((ticket) => ticket.id === selectedTicketId) || null, [tickets, selectedTicketId]);

  const selectedTicketProject = useMemo(
    () => (selectedTicket?.projectId ? projects.find((project) => project.id === selectedTicket.projectId) || null : null),
    [projects, selectedTicket?.projectId]
  );

  const canManageSelectedTicket = useMemo(() => {
    if (!selectedTicket) return false;
    if (currentUser.role === 'admin') return true;
    if (!selectedTicketProject) return false;
    return getProjectOwnerIds(selectedTicketProject).includes(currentUser.id);
  }, [currentUser.id, currentUser.role, selectedTicket, selectedTicketProject]);

  useEffect(() => {
    if (!selectedTicket) return;
    setCommentStatus(selectedTicket.status);
    setCommentStartAt(toDateTimeLocalInput(selectedTicket.startedAt));
  }, [selectedTicket?.id, selectedTicket?.status, selectedTicket?.startedAt]);

  useEffect(() => {
    const onDocClick = (event: MouseEvent) => {
      if (!isActionsMenuOpen) return;
      const target = event.target as Node | null;
      if (actionsMenuRef.current && target && actionsMenuRef.current.contains(target)) return;
      setIsActionsMenuOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [isActionsMenuOpen]);

  const openTicketRoute = (ticketId: string | null) => {
    if (onOpenTicketRoute) {
      onOpenTicketRoute(ticketId);
      return;
    }
    setSelectedTicketId(ticketId);
  };

  const actions = useTicketActions({
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
  });

  const createTicket = () =>
    actions.createTicket({
      draftTitle: draft.draftTitle,
      draftDescription: draft.draftDescription,
      draftStatus: draft.draftStatus,
      draftPriority: draft.draftPriority,
      draftProjectId: draft.draftProjectId,
      draftAssigneeId: draft.draftAssigneeId,
      draftTags: draft.draftTags,
      onCreated: () => {
        draft.setIsCreateModalOpen(false);
        draft.resetDraft();
      }
    });

  const deleteTicket = (ticketId: string) => actions.deleteTicket(ticketId, tickets);

  return {
    tickets,
    loading,
    query,
    setQuery,
    statusFilter,
    setStatusFilter,
    projectFilter,
    setProjectFilter,
    selectedTicketId,
    busyId,
    commentText,
    setCommentText,
    commentStatus,
    setCommentStatus,
    commentStartAt,
    setCommentStartAt,
    composerMode,
    setComposerMode,
    forwardTarget,
    setForwardTarget,
    isActionsMenuOpen,
    setIsActionsMenuOpen,
    actionsMenuRef,
    composerInputRef,
    isSingleTicketRoute,
    activeProjects,
    filteredTickets,
    sortedTickets,
    selectedTicket,
    canManageSelectedTicket,
    analytics,
    viewCounts,
    quickViewLabel,
    loadTickets,
    openTicketRoute,
    createTicket,
    updateTicket: actions.updateTicket,
    submitCommentAction: actions.submitCommentAction,
    convertTicket: actions.convertTicket,
    deleteTicket,
    ...draft,
    ...tablePrefs
  };
};
