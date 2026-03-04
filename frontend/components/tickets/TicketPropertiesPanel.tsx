import React from 'react';
import { IntakeTicket, IntakeTicketPriority, IntakeTicketStatus } from '../../types';
import AppSelect from '../ui/AppSelect';
import { PRIORITY_OPTIONS, STATUS_OPTIONS } from './ticketConstants';

interface TicketPropertiesPanelProps {
  selectedTicket: IntakeTicket;
  busyId: string | null;
  createProjectOptions: Array<{ value: string; label: string }>;
  assigneeOptions: Array<{ value: string; label: string }>;
  onUpdateTicket: (patch: { status?: IntakeTicketStatus; projectId?: string; assigneeId?: string | null; priority?: IntakeTicketPriority }) => void;
}

const TicketPropertiesPanel: React.FC<TicketPropertiesPanelProps> = ({
  selectedTicket,
  busyId,
  createProjectOptions,
  assigneeOptions,
  onUpdateTicket
}) => {
  return (
    <aside className="border-t border-slate-200 bg-white p-4 xl:border-t-0">
      <p className="mb-0.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Ticket properties</p>
      <p className="mb-3 text-[11px] text-slate-500">Update ownership, priority, and status.</p>
      <div className="space-y-2">
        <label className="text-[11px] font-medium text-slate-500">Project</label>
        <AppSelect
          value={selectedTicket.projectId || 'none'}
          onChange={(value) => onUpdateTicket({ projectId: value === 'none' ? undefined : value })}
          options={createProjectOptions}
          className="h-10 rounded-lg border border-slate-200 px-2.5 text-sm"
          disabled={busyId === selectedTicket.id}
        />
        <label className="text-[11px] font-medium text-slate-500">Agent</label>
        <AppSelect
          value={selectedTicket.assigneeId || 'none'}
          onChange={(value) => onUpdateTicket({ assigneeId: value === 'none' ? null : value })}
          options={assigneeOptions}
          className="h-10 rounded-lg border border-slate-200 px-2.5 text-sm"
          disabled={busyId === selectedTicket.id}
        />
        <label className="text-[11px] font-medium text-slate-500">Priority</label>
        <AppSelect
          value={selectedTicket.priority}
          onChange={(value) => onUpdateTicket({ priority: value as IntakeTicketPriority })}
          options={PRIORITY_OPTIONS}
          className="h-10 rounded-lg border border-slate-200 px-2.5 text-sm"
          disabled={busyId === selectedTicket.id}
        />
        <label className="text-[11px] font-medium text-slate-500">Status</label>
        <AppSelect
          value={selectedTicket.status}
          onChange={(value) => onUpdateTicket({ status: value as IntakeTicketStatus })}
          options={STATUS_OPTIONS}
          className="h-10 rounded-lg border border-slate-200 px-2.5 text-sm"
          disabled={busyId === selectedTicket.id}
        />
      </div>
    </aside>
  );
};

export default TicketPropertiesPanel;
