import React from 'react';
import { IntakeTicket, IntakeTicketStatus, User } from '../../types';
import AppSelect from '../ui/AppSelect';
import { openStatuses, PRIORITY_RANK, TicketTableSortKey, TICKET_TABLE_COLUMNS, ticketReference } from './ticketConstants';

interface TicketsListPaneProps {
  loading: boolean;
  quickViewLabel: string;
  filteredTicketsLength: number;
  statusFilter: 'all' | IntakeTicketStatus;
  onStatusFilterChange: (value: 'all' | IntakeTicketStatus) => void;
  statusOptions: Array<{ value: IntakeTicketStatus; label: string }>;
  projectFilter: 'all' | string;
  onProjectFilterChange: (value: 'all' | string) => void;
  projectOptions: Array<{ value: string; label: string }>;
  filteredTickets: IntakeTicket[];
  sortedTickets: IntakeTicket[];
  selectedTicketId: string | null;
  allUsers: User[];
  onOpenTicketRoute: (ticketId: string) => void;
  tableWrapRef: React.RefObject<HTMLDivElement | null>;
  tableSort: { key: TicketTableSortKey; direction: 'asc' | 'desc' };
  setTableSort: React.Dispatch<React.SetStateAction<{ key: TicketTableSortKey; direction: 'asc' | 'desc' }>>;
  columnWidths: Record<TicketTableSortKey, number>;
  onStartResize: (params: { event: React.MouseEvent<HTMLSpanElement>; key: TicketTableSortKey; nextKey: TicketTableSortKey }) => void;
}

const columns: Array<{ key: TicketTableSortKey; label: string }> = [
  { key: 'title', label: 'Ticket' },
  { key: 'requester', label: 'Requester' },
  { key: 'priority', label: 'Priority' },
  { key: 'status', label: 'Status' },
  { key: 'assignee', label: 'Agent' },
  { key: 'createdAt', label: 'Created' }
];

const TicketsListPane: React.FC<TicketsListPaneProps> = ({
  loading,
  quickViewLabel,
  filteredTicketsLength,
  statusFilter,
  onStatusFilterChange,
  statusOptions,
  projectFilter,
  onProjectFilterChange,
  projectOptions,
  filteredTickets,
  sortedTickets,
  selectedTicketId,
  allUsers,
  onOpenTicketRoute,
  tableWrapRef,
  tableSort,
  setTableSort,
  columnWidths,
  onStartResize
}) => {
  return (
    <aside className="min-h-0">
      <div className="border-b border-slate-200 p-2.5">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-slate-800">{quickViewLabel}</p>
          <p className="text-xs text-slate-500">{filteredTicketsLength}</p>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <AppSelect
            value={statusFilter}
            onChange={(value) => onStatusFilterChange(value as 'all' | IntakeTicketStatus)}
            options={[{ value: 'all', label: 'All statuses' }, ...statusOptions]}
            className="h-9 rounded-lg border border-slate-200 px-2.5 text-sm"
          />
          <AppSelect
            value={projectFilter}
            onChange={(value) => onProjectFilterChange(value as 'all' | string)}
            options={projectOptions}
            className="h-9 rounded-lg border border-slate-200 px-2.5 text-sm"
          />
        </div>
      </div>
      <div className="min-h-0 overflow-auto">
        {loading ? (
          <div className="p-4 text-sm text-slate-500">Loading tickets...</div>
        ) : filteredTickets.length === 0 ? (
          <div className="p-4 text-sm text-slate-500">No tickets found.</div>
        ) : (
          <div ref={tableWrapRef} className="min-w-[880px]">
            <table className="w-full table-fixed text-sm">
              <colgroup>
                <col style={{ width: `${columnWidths.title}%` }} />
                <col style={{ width: `${columnWidths.requester}%` }} />
                <col style={{ width: `${columnWidths.priority}%` }} />
                <col style={{ width: `${columnWidths.status}%` }} />
                <col style={{ width: `${columnWidths.assignee}%` }} />
                <col style={{ width: `${columnWidths.createdAt}%` }} />
              </colgroup>
              <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50">
                <tr className="text-[11px] uppercase tracking-wide text-slate-500">
                  {columns.map((col, index) => {
                    const nextKey = TICKET_TABLE_COLUMNS[index + 1];
                    const active = tableSort.key === col.key;
                    return (
                      <th key={col.key} className="relative px-3 py-2 text-left font-semibold">
                        <button
                          type="button"
                          onClick={() =>
                            setTableSort((prev) =>
                              prev.key === col.key
                                ? { key: col.key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
                                : { key: col.key, direction: 'asc' }
                            )
                          }
                          className="inline-flex items-center gap-1 hover:text-slate-700"
                        >
                          <span>{col.label}</span>
                          <span className={`text-[10px] ${active ? 'text-slate-700' : 'text-slate-400'}`}>
                            {active ? (tableSort.direction === 'asc' ? '▲' : '▼') : '↕'}
                          </span>
                        </button>
                        {nextKey ? (
                          <span
                            onMouseDown={(event) => onStartResize({ event, key: col.key, nextKey })}
                            className="absolute right-0 top-1/2 h-5 w-1 -translate-y-1/2 cursor-col-resize rounded bg-slate-300/0 hover:bg-slate-300/70"
                          />
                        ) : null}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {sortedTickets.map((ticket) => {
                  const active = ticket.id === selectedTicketId;
                  const overSla = Boolean(openStatuses.has(ticket.status) && ticket.slaDueAt && ticket.slaDueAt < Date.now());
                  const assignedUser = ticket.assigneeId ? allUsers.find((row) => row.id === ticket.assigneeId) : null;
                  return (
                    <tr
                      key={ticket.id}
                      onClick={() => onOpenTicketRoute(ticket.id)}
                      className={`cursor-pointer border-b border-slate-100 text-[13px] ${active ? 'bg-slate-50' : 'hover:bg-slate-50'}`}
                    >
                      <td className="px-3 py-2.5">
                        <div title={ticket.title} className="truncate font-medium text-slate-900">{ticket.title}</div>
                        <div title={ticketReference(ticket)} className="truncate text-[11px] text-slate-500">
                          {ticketReference(ticket)}
                          {overSla ? ' • SLA overdue' : ''}
                        </div>
                      </td>
                      <td title={ticket.requesterName} className="truncate px-3 py-2.5 text-slate-700">{ticket.requesterName}</td>
                      <td title={ticket.priority} className="truncate px-3 py-2.5 capitalize text-slate-700">{ticket.priority}</td>
                      <td title={ticket.status.replace('-', ' ')} className="truncate px-3 py-2.5 capitalize text-slate-700">{ticket.status.replace('-', ' ')}</td>
                      <td title={assignedUser ? assignedUser.displayName : 'Unassigned'} className="truncate px-3 py-2.5 text-slate-700">{assignedUser ? assignedUser.displayName : 'Unassigned'}</td>
                      <td title={new Date(ticket.createdAt).toLocaleDateString()} className="truncate px-3 py-2.5 text-slate-600">{new Date(ticket.createdAt).toLocaleDateString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </aside>
  );
};

export default TicketsListPane;
