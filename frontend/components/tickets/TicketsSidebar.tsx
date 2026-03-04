import React from 'react';
import { IntakeTicketStatus } from '../../types';

interface TicketsSidebarProps {
  query: string;
  onQueryChange: (value: string) => void;
  statusFilter: 'all' | IntakeTicketStatus;
  setStatusFilter: (value: 'all' | IntakeTicketStatus) => void;
  setProjectFilter: (value: 'all' | string) => void;
  currentUserDisplayName: string;
  currentUserEmail: string;
  setQuery: (value: string) => void;
  analyticsTotal: number;
  newCount: number;
  inProgressCount: number;
  resolvedCount: number;
  closedCount: number;
  convertedCount: number;
  myAssignedCount: number;
  raisedCount: number;
}

const SidebarButton: React.FC<{ active?: boolean; onClick: () => void; label: string; count: number }> = ({
  active,
  onClick,
  label,
  count
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`mt-1 w-full rounded-lg px-2 py-2 text-left text-sm ${
      active ? 'bg-slate-100 font-medium text-slate-900' : 'text-slate-600 hover:bg-slate-50'
    }`}
  >
    {label} <span className="float-right text-xs text-slate-500">{count}</span>
  </button>
);

const TicketsSidebar: React.FC<TicketsSidebarProps> = ({
  query,
  onQueryChange,
  statusFilter,
  setStatusFilter,
  setProjectFilter,
  currentUserDisplayName,
  currentUserEmail,
  setQuery,
  analyticsTotal,
  newCount,
  inProgressCount,
  resolvedCount,
  closedCount,
  convertedCount,
  myAssignedCount,
  raisedCount
}) => {
  return (
    <aside className="hidden min-h-0 border-r border-slate-200 xl:flex xl:flex-col">
      <div className="border-b border-slate-200 p-2.5">
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search for a view"
          className="h-9 w-full rounded-lg border border-slate-200 px-2.5 text-sm outline-none focus:border-slate-300"
        />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Default</p>
        <SidebarButton
          active={statusFilter === 'all'}
          onClick={() => {
            setStatusFilter('all');
            setProjectFilter('all');
          }}
          label="All tickets"
          count={analyticsTotal}
        />
        <SidebarButton active={statusFilter === 'new'} onClick={() => setStatusFilter('new')} label="New and untriaged" count={newCount} />
        <SidebarButton active={statusFilter === 'in-progress'} onClick={() => setStatusFilter('in-progress')} label="In progress" count={inProgressCount} />
        <SidebarButton active={statusFilter === 'resolved'} onClick={() => setStatusFilter('resolved')} label="Resolved" count={resolvedCount} />
        <SidebarButton active={statusFilter === 'closed'} onClick={() => setStatusFilter('closed')} label="Closed" count={closedCount} />
        <SidebarButton active={statusFilter === 'converted'} onClick={() => setStatusFilter('converted')} label="Converted to task" count={convertedCount} />
        <div className="mt-4 border-t border-slate-200 pt-3">
          <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Personal</p>
          <button
            type="button"
            onClick={() => {
              setStatusFilter('all');
              setQuery(currentUserDisplayName);
            }}
            className="mt-1 w-full rounded-lg px-2 py-2 text-left text-sm text-slate-600 hover:bg-slate-50"
          >
            My assigned <span className="float-right text-xs text-slate-500">{myAssignedCount}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setStatusFilter('all');
              setQuery(currentUserEmail || '');
            }}
            className="mt-1 w-full rounded-lg px-2 py-2 text-left text-sm text-slate-600 hover:bg-slate-50"
          >
            Tickets I raised <span className="float-right text-xs text-slate-500">{raisedCount}</span>
          </button>
        </div>
      </div>
    </aside>
  );
};

export default TicketsSidebar;
