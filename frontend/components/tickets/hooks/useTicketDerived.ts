import { useMemo } from 'react';
import { IntakeTicket, IntakeTicketStatus, User } from '../../../types';
import { openStatuses, PRIORITY_RANK, TicketTableSortKey } from '../ticketConstants';

interface UseTicketDerivedArgs {
  tickets: IntakeTicket[];
  query: string;
  statusFilter: 'all' | IntakeTicketStatus;
  projectFilter: 'all' | string;
  tableSort: { key: TicketTableSortKey; direction: 'asc' | 'desc' };
  allUsers: User[];
  currentUser: User;
}

export const useTicketDerived = ({
  tickets,
  query,
  statusFilter,
  projectFilter,
  tableSort,
  allUsers,
  currentUser
}: UseTicketDerivedArgs) => {
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
  }, [projectFilter, query, statusFilter, tickets]);

  const sortedTickets = useMemo(() => {
    const rows = [...filteredTickets];
    const direction = tableSort.direction === 'asc' ? 1 : -1;
    rows.sort((a, b) => {
      if (tableSort.key === 'title') return direction * a.title.localeCompare(b.title);
      if (tableSort.key === 'requester') return direction * a.requesterName.localeCompare(b.requesterName);
      if (tableSort.key === 'priority') return direction * (PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
      if (tableSort.key === 'status') return direction * a.status.localeCompare(b.status);
      if (tableSort.key === 'assignee') {
        const aName = a.assigneeId ? allUsers.find((u) => u.id === a.assigneeId)?.displayName || '' : '';
        const bName = b.assigneeId ? allUsers.find((u) => u.id === b.assigneeId)?.displayName || '' : '';
        return direction * aName.localeCompare(bName);
      }
      return direction * (a.createdAt - b.createdAt);
    });
    return rows;
  }, [allUsers, filteredTickets, tableSort.direction, tableSort.key]);

  const analytics = useMemo(() => {
    const open = tickets.filter((ticket) => openStatuses.has(ticket.status)).length;
    const overdueSla = tickets.filter((ticket) => openStatuses.has(ticket.status) && ticket.slaDueAt && ticket.slaDueAt < Date.now()).length;
    return { open, overdueSla, total: tickets.length };
  }, [tickets]);

  const viewCounts = useMemo(() => {
    const resolved = tickets.filter((ticket) => ticket.status === 'resolved').length;
    const closed = tickets.filter((ticket) => ticket.status === 'closed').length;
    const converted = tickets.filter((ticket) => ticket.status === 'converted').length;
    const mine = tickets.filter((ticket) => ticket.assigneeId === currentUser.id).length;
    const raised = tickets.filter((ticket) => ticket.requesterEmail === currentUser.email).length;
    const newCount = tickets.filter((ticket) => ticket.status === 'new').length;
    const inProgress = tickets.filter((ticket) => ticket.status === 'in-progress').length;
    return { resolved, closed, converted, mine, raised, newCount, inProgress };
  }, [tickets, currentUser.email, currentUser.id]);

  const quickViewLabel = useMemo(() => {
    if (statusFilter === 'all') return 'All tickets';
    if (statusFilter === 'resolved') return 'Resolved tickets';
    if (statusFilter === 'closed') return 'Closed tickets';
    if (statusFilter === 'converted') return 'Converted tickets';
    return 'Unresolved tickets';
  }, [statusFilter]);

  return { filteredTickets, sortedTickets, analytics, viewCounts, quickViewLabel };
};
