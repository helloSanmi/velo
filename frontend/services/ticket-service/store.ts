import { IntakeTicket } from '../../types';

export const TICKETS_KEY = 'velo_intake_tickets';

export const readAllTickets = (): IntakeTicket[] => {
  try {
    const parsed = JSON.parse(localStorage.getItem(TICKETS_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const writeAllTickets = (rows: IntakeTicket[]): void => {
  localStorage.setItem(TICKETS_KEY, JSON.stringify(rows));
};
