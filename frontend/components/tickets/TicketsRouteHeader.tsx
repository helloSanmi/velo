import React from 'react';
import { ArrowLeft, Plus, RefreshCcw } from 'lucide-react';
import { IntakeTicket } from '../../types';
import Button from '../ui/Button';
import { ticketReference } from './ticketConstants';

interface TicketsRouteHeaderProps {
  selectedTicket: IntakeTicket | null;
  loading: boolean;
  onBack: () => void;
  onRefresh: () => void;
  onCreate: () => void;
}

const TicketsRouteHeader: React.FC<TicketsRouteHeaderProps> = ({ selectedTicket, loading, onBack, onRefresh, onCreate }) => {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2 text-sm text-slate-700">
          <button type="button" onClick={onBack} className="font-semibold text-slate-900 hover:text-slate-700">
            Tickets
          </button>
          <span className="text-slate-400">/</span>
          <span className="truncate font-medium text-slate-900">
            {selectedTicket ? `${ticketReference(selectedTicket)} · ${selectedTicket.title}` : 'Not found'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={onBack} className="h-9 px-3 text-xs" leftIcon={<ArrowLeft className="h-3.5 w-3.5" />}>
            Back
          </Button>
          <Button
            variant="secondary"
            onClick={onRefresh}
            className="h-9 px-3 text-xs"
            leftIcon={<RefreshCcw className="h-3.5 w-3.5" />}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button className="h-9 px-3 text-xs" leftIcon={<Plus className="h-3.5 w-3.5" />} onClick={onCreate}>
            New ticket
          </Button>
        </div>
      </div>
    </section>
  );
};

export default TicketsRouteHeader;
