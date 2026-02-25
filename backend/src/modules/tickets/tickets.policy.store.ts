import { promises as fs } from 'fs';
import path from 'path';

export type TicketAssignmentMode = 'manual' | 'round_robin' | 'least_load';

export interface StoredTicketPolicy {
  orgId: string;
  projectId?: string;
  assignmentMode: TicketAssignmentMode;
  assigneePoolIds: string[];
  slaHours: {
    low: number;
    medium: number;
    high: number;
    urgent: number;
  };
  roundRobinCursor: number;
  updatedAt: number;
}

const DATA_FILE = path.resolve(process.cwd(), 'data', 'ticket-policies.json');

const readAll = async (): Promise<StoredTicketPolicy[]> => {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeAll = async (rows: StoredTicketPolicy[]): Promise<void> => {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(rows, null, 2), 'utf8');
};

const defaultPolicy = (orgId: string, projectId?: string): StoredTicketPolicy => ({
  orgId,
  projectId,
  assignmentMode: 'manual',
  assigneePoolIds: [],
  slaHours: {
    low: 120,
    medium: 72,
    high: 24,
    urgent: 8
  },
  roundRobinCursor: 0,
  updatedAt: Date.now()
});

export const ticketsPolicyStore = {
  async get(orgId: string, projectId?: string): Promise<StoredTicketPolicy> {
    const rows = await readAll();
    const projectMatch = rows.find((row) => row.orgId === orgId && row.projectId === projectId);
    if (projectMatch) return projectMatch;
    if (projectId) {
      const orgDefault = rows.find((row) => row.orgId === orgId && !row.projectId);
      if (orgDefault) return { ...orgDefault, projectId };
    }
    return defaultPolicy(orgId, projectId);
  },

  async upsert(input: Omit<StoredTicketPolicy, 'updatedAt'>): Promise<StoredTicketPolicy> {
    const rows = await readAll();
    const index = rows.findIndex((row) => row.orgId === input.orgId && row.projectId === input.projectId);
    const next: StoredTicketPolicy = { ...input, updatedAt: Date.now() };
    if (index === -1) rows.push(next);
    else rows[index] = next;
    await writeAll(rows);
    return next;
  }
};
