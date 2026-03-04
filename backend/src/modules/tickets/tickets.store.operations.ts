import { createId } from '../../lib/ids.js';
import { parseTicketCodeSequence } from './tickets.reference.js';
import { readAllTickets, writeAllTickets } from './tickets.store.file.js';
import type {
  IntakeTicketPriority,
  IntakeTicketStatus,
  StoredIntakeTicket,
  StoredTicketComment
} from './tickets.store.types.js';

export const listTickets = async (orgId: string): Promise<StoredIntakeTicket[]> => {
  const rows = await readAllTickets();
  return rows
    .filter((row) => row.orgId === orgId)
    .sort((a, b) => (a.updatedAt === b.updatedAt ? b.createdAt - a.createdAt : b.updatedAt - a.updatedAt));
};

export const getTicket = async (orgId: string, id: string): Promise<StoredIntakeTicket | null> => {
  const rows = await readAllTickets();
  return rows.find((row) => row.orgId === orgId && row.id === id) || null;
};

export const createTicket = async (
  input: Omit<StoredIntakeTicket, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'priority' | 'tags' | 'source' | 'comments'> & {
    status?: IntakeTicketStatus;
    priority?: IntakeTicketPriority;
    tags?: string[];
    source?: StoredIntakeTicket['source'];
    comments?: StoredTicketComment[];
  }
): Promise<StoredIntakeTicket> => {
  const rows = await readAllTickets();
  const now = Date.now();
  const created: StoredIntakeTicket = {
    id: createId('tkt'),
    orgId: input.orgId,
    ticketCode: input.ticketCode,
    ticketNumber: input.ticketNumber,
    projectId: input.projectId,
    title: input.title,
    description: input.description,
    requesterName: input.requesterName,
    requesterEmail: input.requesterEmail,
    requesterUserId: input.requesterUserId,
    assigneeId: input.assigneeId,
    metadata: input.metadata,
    status: input.status || 'new',
    priority: input.priority || 'medium',
    tags: Array.isArray(input.tags) ? input.tags : [],
    source: input.source || 'workspace',
    comments: Array.isArray(input.comments) ? input.comments : [],
    createdAt: now,
    updatedAt: now
  };
  rows.push(created);
  await writeAllTickets(rows);
  return created;
};

export const updateTicket = async (
  orgId: string,
  id: string,
  patch: Partial<Omit<StoredIntakeTicket, 'id' | 'orgId' | 'createdAt' | 'updatedAt'>>
): Promise<StoredIntakeTicket | null> => {
  const rows = await readAllTickets();
  const index = rows.findIndex((row) => row.orgId === orgId && row.id === id);
  if (index === -1) return null;
  const current = rows[index];
  const next: StoredIntakeTicket = {
    ...current,
    ...patch,
    updatedAt: Date.now()
  };
  rows[index] = next;
  await writeAllTickets(rows);
  return next;
};

export const removeTicket = async (orgId: string, id: string): Promise<boolean> => {
  const rows = await readAllTickets();
  const next = rows.filter((row) => !(row.orgId === orgId && row.id === id));
  if (rows.length === next.length) return false;
  await writeAllTickets(next);
  return true;
};

export const findTicketByCode = async (orgId: string, ticketCode: string): Promise<StoredIntakeTicket | null> => {
  const code = String(ticketCode || '').trim().toUpperCase();
  if (!code) return null;
  const rows = await readAllTickets();
  return rows.find((row) => row.orgId === orgId && String(row.ticketCode || '').toUpperCase() === code) || null;
};

export const nextTicketNumber = async (orgId: string): Promise<number> => {
  const rows = await readAllTickets();
  const orgRows = rows.filter((row) => row.orgId === orgId);
  const maxExisting = orgRows.reduce((acc, row) => {
    const direct = Number(row.ticketNumber || 0);
    const byCode = parseTicketCodeSequence(row.ticketCode);
    return Math.max(acc, Number.isFinite(direct) ? direct : 0, byCode);
  }, 0);
  return maxExisting + 1;
};
