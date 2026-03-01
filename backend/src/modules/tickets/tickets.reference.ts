import type { StoredIntakeTicket } from './tickets.store.js';

const CODE_PATTERN = /^([A-Z0-9]{3})-(\d{6})$/;

export const toWorkspaceTicketPrefix = (workspaceName: string): string => {
  const compact = String(workspaceName || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  const firstThree = compact.slice(0, 3);
  return (firstThree + 'XXX').slice(0, 3);
};

export const formatTicketCode = (prefix: string, sequence: number): string => {
  const normalizedPrefix = String(prefix || 'TKT')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 3)
    .padEnd(3, 'X');
  const normalizedSequence = Math.max(1, Math.floor(Number(sequence) || 1));
  return `${normalizedPrefix}-${String(normalizedSequence).padStart(6, '0')}`;
};

export const parseTicketCodeSequence = (ticketCode?: string): number => {
  const match = String(ticketCode || '').toUpperCase().match(CODE_PATTERN);
  if (!match) return 0;
  const value = Number(match[2]);
  return Number.isFinite(value) ? value : 0;
};

export const isTicketCode = (value?: string): boolean => CODE_PATTERN.test(String(value || '').toUpperCase());

export const getTicketReference = (ticket: Pick<StoredIntakeTicket, 'ticketCode' | 'id'>): string =>
  ticket.ticketCode || ticket.id;

