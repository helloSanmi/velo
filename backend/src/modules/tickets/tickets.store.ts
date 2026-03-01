import { promises as fs } from 'fs';
import path from 'path';
import { createId } from '../../lib/ids.js';
import { parseTicketCodeSequence } from './tickets.reference.js';

export type IntakeTicketStatus =
  | 'new'
  | 'triaged'
  | 'planned'
  | 'in-progress'
  | 'resolved'
  | 'closed'
  | 'converted';

export type IntakeTicketPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface StoredTicketComment {
  id: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: number;
}

export interface StoredIntakeTicket {
  id: string;
  orgId: string;
  ticketCode?: string;
  ticketNumber?: number;
  projectId?: string;
  title: string;
  description: string;
  requesterName: string;
  requesterEmail?: string;
  requesterUserId?: string;
  status: IntakeTicketStatus;
  priority: IntakeTicketPriority;
  assigneeId?: string;
  tags: string[];
  source: 'workspace' | 'email' | 'form' | 'api';
  convertedTaskId?: string;
  convertedProjectId?: string;
  convertedAt?: number;
  convertedBy?: string;
  startedAt?: number;
  slaDueAt?: number;
  firstResponseAt?: number;
  resolvedAt?: number;
  comments: StoredTicketComment[];
  metadata?: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

const DATA_FILE = path.resolve(process.cwd(), 'data', 'tickets.json');

const readAll = async (): Promise<StoredIntakeTicket[]> => {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeAll = async (rows: StoredIntakeTicket[]): Promise<void> => {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(rows, null, 2), 'utf8');
};

export const ticketsStore = {
  async list(orgId: string): Promise<StoredIntakeTicket[]> {
    const rows = await readAll();
    return rows
      .filter((row) => row.orgId === orgId)
      .sort((a, b) => (a.updatedAt === b.updatedAt ? b.createdAt - a.createdAt : b.updatedAt - a.updatedAt));
  },

  async get(orgId: string, id: string): Promise<StoredIntakeTicket | null> {
    const rows = await readAll();
    return rows.find((row) => row.orgId === orgId && row.id === id) || null;
  },

  async create(
    input: Omit<StoredIntakeTicket, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'priority' | 'tags' | 'source' | 'comments'> & {
      status?: IntakeTicketStatus;
      priority?: IntakeTicketPriority;
      tags?: string[];
      source?: StoredIntakeTicket['source'];
      comments?: StoredTicketComment[];
    }
  ): Promise<StoredIntakeTicket> {
    const rows = await readAll();
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
    await writeAll(rows);
    return created;
  },

  async update(
    orgId: string,
    id: string,
    patch: Partial<Omit<StoredIntakeTicket, 'id' | 'orgId' | 'createdAt' | 'updatedAt'>>
  ): Promise<StoredIntakeTicket | null> {
    const rows = await readAll();
    const index = rows.findIndex((row) => row.orgId === orgId && row.id === id);
    if (index === -1) return null;
    const current = rows[index];
    const next: StoredIntakeTicket = {
      ...current,
      ...patch,
      updatedAt: Date.now()
    };
    rows[index] = next;
    await writeAll(rows);
    return next;
  },

  async remove(orgId: string, id: string): Promise<boolean> {
    const rows = await readAll();
    const next = rows.filter((row) => !(row.orgId === orgId && row.id === id));
    if (rows.length === next.length) return false;
    await writeAll(next);
    return true;
  },

  async findByCode(orgId: string, ticketCode: string): Promise<StoredIntakeTicket | null> {
    const code = String(ticketCode || '').trim().toUpperCase();
    if (!code) return null;
    const rows = await readAll();
    return rows.find((row) => row.orgId === orgId && String(row.ticketCode || '').toUpperCase() === code) || null;
  },

  async nextTicketNumber(orgId: string): Promise<number> {
    const rows = await readAll();
    const orgRows = rows.filter((row) => row.orgId === orgId);
    const maxExisting = orgRows.reduce((acc, row) => {
      const direct = Number(row.ticketNumber || 0);
      const byCode = parseTicketCodeSequence(row.ticketCode);
      return Math.max(acc, Number.isFinite(direct) ? direct : 0, byCode);
    }, 0);
    return maxExisting + 1;
  }
};
