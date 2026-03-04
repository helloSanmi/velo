import { useEffect, useState } from 'react';
import { IntakeTicket } from '../../../types';
import { ticketService } from '../../../services/ticketService';
import { toastService } from '../../../services/toastService';

interface UseTicketsDataArgs {
  orgId: string;
}

export const useTicketsData = ({ orgId }: UseTicketsDataArgs) => {
  const [tickets, setTickets] = useState<IntakeTicket[]>([]);
  const [loading, setLoading] = useState(true);

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

  return {
    tickets,
    setTickets,
    loading,
    loadTickets
  };
};
