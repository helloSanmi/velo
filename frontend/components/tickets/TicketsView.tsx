import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, MessageSquare, Plus, RefreshCcw, TicketCheck, Trash2, X } from 'lucide-react';
import { IntakeTicket, IntakeTicketPriority, IntakeTicketStatus, Project, User } from '../../types';
import { ticketService } from '../../services/ticketService';
import { getProjectOwnerIds } from '../../services/accessPolicyService';
import Button from '../ui/Button';
import AppSelect from '../ui/AppSelect';
import { toastService } from '../../services/toastService';

interface TicketsViewProps {
  orgId: string;
  currentUser: User;
  projects: Project[];
  allUsers: User[];
  onRefreshTasks: () => void;
  routeTicketId?: string | null;
  onOpenTicketRoute?: (ticketId: string | null) => void;
}

const STATUS_OPTIONS: Array<{ value: IntakeTicketStatus; label: string }> = [
  { value: 'new', label: 'New' },
  { value: 'triaged', label: 'Triaged' },
  { value: 'planned', label: 'Planned' },
  { value: 'in-progress', label: 'In progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
  { value: 'converted', label: 'Converted' }
];

const PRIORITY_OPTIONS: Array<{ value: IntakeTicketPriority; label: string }> = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' }
];

const openStatuses = new Set<IntakeTicketStatus>(['new', 'triaged', 'planned', 'in-progress']);
const ticketReference = (ticket: IntakeTicket): string => ticket.ticketCode || ticket.id;

const toDateTimeLocalInput = (value?: number) => {
  if (!value) return '';
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const parseDateTimeLocalInput = (value: string): number | undefined => {
  if (!value.trim()) return undefined;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : undefined;
};

const TicketsView: React.FC<TicketsViewProps> = ({
  orgId,
  currentUser,
  projects,
  allUsers,
  onRefreshTasks,
  routeTicketId,
  onOpenTicketRoute
}) => {
  const [tickets, setTickets] = useState<IntakeTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | IntakeTicketStatus>('all');
  const [projectFilter, setProjectFilter] = useState<'all' | string>('all');
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftDescription, setDraftDescription] = useState('');
  const [draftStatus, setDraftStatus] = useState<IntakeTicketStatus>('new');
  const [draftPriority, setDraftPriority] = useState<IntakeTicketPriority>('medium');
  const [draftProjectId, setDraftProjectId] = useState<string>('none');
  const [draftAssigneeId, setDraftAssigneeId] = useState<string>('auto');
  const [draftTags, setDraftTags] = useState('');

  const [commentText, setCommentText] = useState('');
  const [commentStatus, setCommentStatus] = useState<IntakeTicketStatus>('new');
  const [commentStartAt, setCommentStartAt] = useState('');
  const isSingleTicketRoute = Boolean(routeTicketId);

  const activeProjects = useMemo(
    () => projects.filter((project) => !project.isArchived && !project.isCompleted && !project.isDeleted),
    [projects]
  );
  const createProjectOptions = useMemo(
    () => [{ value: 'none', label: 'No linked project' }, ...activeProjects.map((project) => ({ value: project.id, label: project.name }))],
    [activeProjects]
  );
  const projectOptions = useMemo(
    () => [{ value: 'all', label: 'All projects' }, ...activeProjects.map((project) => ({ value: project.id, label: project.name }))],
    [activeProjects]
  );
  const assigneeOptions = useMemo(
    () => [{ value: 'none', label: 'Unassigned' }, ...allUsers.map((user) => ({ value: user.id, label: user.displayName }))],
    [allUsers]
  );
  const createAssigneeOptions = useMemo(
    () => [
      { value: 'auto', label: 'Auto assign (policy)' },
      { value: 'none', label: 'Unassigned' },
      ...allUsers.map((user) => ({ value: user.id, label: user.displayName }))
    ],
    [allUsers]
  );
  const createStatusOptions = useMemo(
    () => STATUS_OPTIONS.filter((option) => option.value !== 'converted'),
    []
  );
  const draftProject = useMemo(
    () => (draftProjectId === 'none' ? null : activeProjects.find((project) => project.id === draftProjectId) || null),
    [activeProjects, draftProjectId]
  );
  const canManageDraftTriageFields = useMemo(() => {
    if (currentUser.role === 'admin') return true;
    if (!draftProject) return false;
    return getProjectOwnerIds(draftProject).includes(currentUser.id);
  }, [currentUser.id, currentUser.role, draftProject]);

  useEffect(() => {
    if (canManageDraftTriageFields) return;
    if (draftStatus !== 'new') setDraftStatus('new');
    if (draftAssigneeId !== 'auto') setDraftAssigneeId('auto');
  }, [canManageDraftTriageFields, draftAssigneeId, draftStatus]);

  const loadTickets = async () => {
    setLoading(true);
    try {
      const rows = await ticketService.getTickets(orgId);
      setTickets(rows);
    } catch (error) {
      toastService.error('Tickets unavailable', error instanceof Error ? error.message : 'Could not load tickets.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTickets();
  }, [orgId]);

  const filteredTickets = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return tickets.filter((ticket) => {
      const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
      const matchesProject = projectFilter === 'all' || ticket.projectId === projectFilter;
      const matchesQuery =
        normalized.length === 0 ||
        `${ticket.title} ${ticket.description} ${ticket.requesterName} ${ticket.requesterEmail || ''} ${ticket.ticketCode || ''}`
          .toLowerCase()
          .includes(normalized);
      return matchesStatus && matchesProject && matchesQuery;
    });
  }, [tickets, query, statusFilter, projectFilter]);

  useEffect(() => {
    if (routeTicketId) {
      const exists = tickets.some((ticket) => ticket.id === routeTicketId);
      setSelectedTicketId(exists ? routeTicketId : null);
      return;
    }
    if (selectedTicketId && filteredTickets.some((ticket) => ticket.id === selectedTicketId)) return;
    setSelectedTicketId(filteredTickets[0]?.id || null);
  }, [filteredTickets, routeTicketId, selectedTicketId, tickets]);

  const selectedTicket = useMemo(
    () => tickets.find((ticket) => ticket.id === selectedTicketId) || null,
    [tickets, selectedTicketId]
  );
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

  const analytics = useMemo(() => {
    const open = tickets.filter((ticket) => openStatuses.has(ticket.status)).length;
    const overdueSla = tickets.filter(
      (ticket) => openStatuses.has(ticket.status) && ticket.slaDueAt && ticket.slaDueAt < Date.now()
    ).length;
    return { open, overdueSla, total: tickets.length };
  }, [tickets]);

  useEffect(() => {
    if (!selectedTicket) return;
    setCommentStatus(selectedTicket.status);
    setCommentStartAt(toDateTimeLocalInput(selectedTicket.startedAt));
  }, [selectedTicket?.id, selectedTicket?.status, selectedTicket?.startedAt]);

  const createTicket = async () => {
    if (!draftTitle.trim()) return;
    setBusyId('create');
    try {
      const created = await ticketService.createTicket(orgId, {
        title: draftTitle.trim(),
        description: draftDescription.trim(),
        requesterName: currentUser.displayName,
        requesterEmail: currentUser.email,
        status: draftStatus,
        priority: draftPriority,
        projectId: draftProjectId === 'none' ? undefined : draftProjectId,
        assigneeId: draftAssigneeId === 'auto' ? undefined : draftAssigneeId === 'none' ? null : draftAssigneeId,
        tags: draftTags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean)
      });
      setTickets((prev) => [created, ...prev]);
      setSelectedTicketId(created.id);
      onOpenTicketRoute?.(created.id);
      setIsCreateModalOpen(false);
      setDraftTitle('');
      setDraftDescription('');
      setDraftStatus('new');
      setDraftPriority('medium');
      setDraftProjectId('none');
      setDraftAssigneeId('auto');
      setDraftTags('');
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
    const requestedStartAt = parseDateTimeLocalInput(commentStartAt);
    const startAtChanged =
      (selectedTicket.startedAt ?? undefined) !== (requestedStartAt ?? undefined);
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
        const updated = await ticketService.addComment(orgId, workingTicket.id, trimmedComment);
        if (!updated) return;
        setTickets((prev) => prev.map((ticket) => (ticket.id === selectedTicket.id ? updated : ticket)));
        setCommentText('');
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

  const deleteTicket = async (ticketId: string) => {
    setBusyId(ticketId);
    try {
      await ticketService.deleteTicket(orgId, ticketId);
      const nextCandidate = tickets.find((ticket) => ticket.id !== ticketId)?.id || null;
      setTickets((prev) => prev.filter((ticket) => ticket.id !== ticketId));
      if (selectedTicketId === ticketId) {
        setSelectedTicketId(nextCandidate);
        onOpenTicketRoute?.(nextCandidate);
      }
      toastService.info('Ticket removed', 'Intake ticket deleted.');
    } catch (error) {
      toastService.error('Delete failed', error instanceof Error ? error.message : 'Could not delete ticket.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="flex-1 overflow-hidden p-4 md:p-6">
      <div className="mx-auto flex h-full max-w-[1480px] flex-col gap-3">
        <section className="rounded-2xl border border-slate-200 bg-white p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <span className="font-medium text-slate-900">Intake tickets</span>
              <span>{analytics.total} total</span>
              <span>•</span>
              <span>{analytics.open} open</span>
              <span>•</span>
              <span className={analytics.overdueSla > 0 ? 'text-rose-600 font-medium' : ''}>{analytics.overdueSla} SLA overdue</span>
            </div>
            <div className="flex items-center gap-2">
              {isSingleTicketRoute ? (
                <Button
                  variant="secondary"
                  onClick={() => onOpenTicketRoute?.(null)}
                  className="h-9 px-3 text-xs"
                  leftIcon={<ArrowLeft className="h-3.5 w-3.5" />}
                >
                  Back to all tickets
                </Button>
              ) : null}
              <Button
                variant="secondary"
                onClick={() => void loadTickets()}
                className="h-9 px-3 text-xs"
                leftIcon={<RefreshCcw className="h-3.5 w-3.5" />}
                disabled={loading}
              >
                Refresh
              </Button>
              <Button className="h-9 px-3 text-xs" leftIcon={<Plus className="h-3.5 w-3.5" />} onClick={() => setIsCreateModalOpen(true)}>
                New ticket
              </Button>
            </div>
          </div>
        </section>

        <section className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className={`grid h-full min-h-0 ${isSingleTicketRoute ? 'grid-cols-1' : 'lg:grid-cols-[360px_1fr]'}`}>
            {!isSingleTicketRoute ? (
              <aside className="flex min-h-0 flex-col border-b border-slate-200 lg:border-b-0 lg:border-r">
                <div className="space-y-2 border-b border-slate-200 p-3">
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search tickets"
                    className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-slate-300"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <AppSelect
                      value={statusFilter}
                      onChange={(value) => setStatusFilter(value as 'all' | IntakeTicketStatus)}
                      options={[{ value: 'all', label: 'All statuses' }, ...STATUS_OPTIONS]}
                      className="h-10 rounded-lg border border-slate-200 px-2.5 text-sm"
                    />
                    <AppSelect
                      value={projectFilter}
                      onChange={(value) => setProjectFilter(value as 'all' | string)}
                      options={projectOptions}
                      className="h-10 rounded-lg border border-slate-200 px-2.5 text-sm"
                    />
                  </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto">
                  {loading ? (
                    <div className="p-4 text-sm text-slate-500">Loading tickets...</div>
                  ) : filteredTickets.length === 0 ? (
                    <div className="p-4 text-sm text-slate-500">No tickets found.</div>
                  ) : (
                    filteredTickets.map((ticket) => {
                      const active = ticket.id === selectedTicketId;
                      const overSla = Boolean(openStatuses.has(ticket.status) && ticket.slaDueAt && ticket.slaDueAt < Date.now());
                      return (
                        <button
                          key={ticket.id}
                          type="button"
                          onClick={() => {
                            setSelectedTicketId(ticket.id);
                            onOpenTicketRoute?.(ticket.id);
                          }}
                          className={`w-full border-b border-slate-100 p-3 text-left ${active ? 'bg-slate-50' : 'hover:bg-slate-50'}`}
                        >
                          <div className="truncate text-sm font-medium text-slate-900">{ticket.title}</div>
                          <div className="mt-1 text-xs text-slate-500">
                            {ticketReference(ticket)} • {ticket.status} • {ticket.priority}
                          </div>
                          {overSla ? <div className="mt-1 text-[11px] font-medium text-rose-600">SLA overdue</div> : null}
                        </button>
                      );
                    })
                  )}
                </div>
              </aside>
            ) : null}

            <main className="min-h-0 overflow-y-auto p-4">
              {!selectedTicket ? (
                <div className="mt-12 text-center text-sm text-slate-500">
                  {isSingleTicketRoute ? 'Ticket not found.' : 'Select a ticket to open details.'}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">{selectedTicket.title}</h3>
                      <p className="mt-0.5 text-xs font-medium text-slate-500">Reference: {ticketReference(selectedTicket)}</p>
                      <p className="mt-1 text-sm text-slate-600">{selectedTicket.description || 'No description'}</p>
                      <p className="mt-2 text-xs text-slate-500">
                        Requested by {selectedTicket.requesterName}
                        {selectedTicket.requesterEmail ? ` (${selectedTicket.requesterEmail})` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        className="h-8 px-3 text-xs"
                        disabled={busyId === selectedTicket.id || selectedTicket.status === 'converted'}
                        leftIcon={<TicketCheck className="h-3.5 w-3.5" />}
                        onClick={() => void convertTicket(selectedTicket)}
                      >
                        Convert
                      </Button>
                      <button
                        type="button"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 disabled:opacity-60"
                        disabled={busyId === selectedTicket.id}
                        onClick={() => void deleteTicket(selectedTicket.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <AppSelect
                      value={selectedTicket.projectId || 'none'}
                      onChange={(value) => void updateTicket(selectedTicket.id, { projectId: value === 'none' ? undefined : value })}
                      options={createProjectOptions}
                      className="h-10 rounded-lg border border-slate-200 px-2.5 text-sm"
                      disabled={busyId === selectedTicket.id}
                    />
                    <AppSelect
                      value={selectedTicket.assigneeId || 'none'}
                      onChange={(value) => void updateTicket(selectedTicket.id, { assigneeId: value === 'none' ? null : value })}
                      options={assigneeOptions}
                      className="h-10 rounded-lg border border-slate-200 px-2.5 text-sm"
                      disabled={busyId === selectedTicket.id}
                    />
                    <AppSelect
                      value={selectedTicket.priority}
                      onChange={(value) => void updateTicket(selectedTicket.id, { priority: value as IntakeTicketPriority })}
                      options={PRIORITY_OPTIONS}
                      className="h-10 rounded-lg border border-slate-200 px-2.5 text-sm"
                      disabled={busyId === selectedTicket.id}
                    />
                    <AppSelect
                      value={selectedTicket.status}
                      onChange={(value) => void updateTicket(selectedTicket.id, { status: value as IntakeTicketStatus })}
                      options={STATUS_OPTIONS}
                      className="h-10 rounded-lg border border-slate-200 px-2.5 text-sm"
                      disabled={busyId === selectedTicket.id}
                    />
                  </div>

                  <div className="rounded-xl border border-slate-200 p-3">
                    <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-800">
                      <MessageSquare className="h-4 w-4" />
                      Communication
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
                    {!canManageSelectedTicket ? (
                      <p className="mb-2 text-xs text-slate-500">Only owner/admin can update ticket status/start time here.</p>
                    ) : null}
                    <div className="max-h-64 space-y-2 overflow-y-auto rounded-lg border border-slate-100 bg-slate-50 p-2">
                      {(selectedTicket.comments || []).length === 0 ? (
                        <p className="text-xs text-slate-500">No conversation yet.</p>
                      ) : (
                        (selectedTicket.comments || []).map((comment) => (
                          <div key={comment.id} className="rounded-md border border-slate-200 bg-white p-2">
                            <div className="text-xs font-medium text-slate-700">{comment.userName}</div>
                            <div className="mt-0.5 text-sm text-slate-800">{comment.text}</div>
                            <div className="mt-1 text-[11px] text-slate-500">{new Date(comment.createdAt).toLocaleString()}</div>
                          </div>
                        ))
                      )}
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        value={commentText}
                        onChange={(event) => setCommentText(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' && !event.shiftKey) {
                            event.preventDefault();
                            void submitCommentAction();
                          }
                        }}
                        placeholder="Write a comment and press Enter (or send updates only)"
                        className="h-10 flex-1 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-slate-300"
                      />
                      <Button
                        className="h-10 px-3 text-sm"
                        onClick={() => void submitCommentAction()}
                        disabled={
                          !commentText.trim() &&
                          !(canManageSelectedTicket && (commentStatus !== selectedTicket.status || parseDateTimeLocalInput(commentStartAt) !== (selectedTicket.startedAt ?? undefined)))
                        }
                      >
                        Send
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </main>
          </div>
        </section>
      </div>

      {isCreateModalOpen ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/45 p-4">
          <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <h4 className="text-base font-semibold text-slate-900">New ticket</h4>
              <button type="button" className="rounded-md p-1 text-slate-500 hover:bg-slate-100" onClick={() => setIsCreateModalOpen(false)}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3 p-4">
              <input
                value={draftTitle}
                onChange={(event) => setDraftTitle(event.target.value)}
                placeholder="Title"
                className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-slate-300"
              />
              <textarea
                value={draftDescription}
                onChange={(event) => setDraftDescription(event.target.value)}
                placeholder="Description"
                rows={4}
                className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-300"
              />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 inline-flex items-center">
                  {currentUser.displayName}
                </div>
                <div className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 inline-flex items-center">
                  {currentUser.email}
                </div>
                <AppSelect
                  value={draftStatus}
                  onChange={(value) => setDraftStatus(value as IntakeTicketStatus)}
                  options={createStatusOptions}
                  className="h-11 rounded-lg border border-slate-200 px-3 text-sm"
                  disabled={!canManageDraftTriageFields}
                />
                <AppSelect
                  value={draftPriority}
                  onChange={(value) => setDraftPriority(value as IntakeTicketPriority)}
                  options={PRIORITY_OPTIONS}
                  className="h-11 rounded-lg border border-slate-200 px-3 text-sm"
                />
                <AppSelect
                  value={draftProjectId}
                  onChange={setDraftProjectId}
                  options={createProjectOptions}
                  className="h-11 rounded-lg border border-slate-200 px-3 text-sm"
                />
                <AppSelect
                  value={draftAssigneeId}
                  onChange={setDraftAssigneeId}
                  options={createAssigneeOptions}
                  className="h-11 rounded-lg border border-slate-200 px-3 text-sm"
                  disabled={!canManageDraftTriageFields}
                />
              </div>
              {!canManageDraftTriageFields ? (
                <p className="text-xs text-slate-500">
                  Initial status/assignee are owner-admin managed. Ticket will start as New.
                </p>
              ) : null}
              <input
                value={draftTags}
                onChange={(event) => setDraftTags(event.target.value)}
                placeholder="Tags (comma separated)"
                className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-slate-300"
              />
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-4 py-3">
              <Button variant="secondary" className="h-10 px-3 text-sm" onClick={() => setIsCreateModalOpen(false)}>
                Cancel
              </Button>
              <Button className="h-10 px-3 text-sm" onClick={() => void createTicket()} disabled={busyId === 'create' || !draftTitle.trim()}>
                Create ticket
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default TicketsView;
