import { promises as fs } from 'fs';
import path from 'path';
import type { StoredIntakeTicket } from './tickets.store.types.js';

const DATA_FILE = path.resolve(process.cwd(), 'data', 'tickets.json');

export const readAllTickets = async (): Promise<StoredIntakeTicket[]> => {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const writeAllTickets = async (rows: StoredIntakeTicket[]): Promise<void> => {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(rows, null, 2), 'utf8');
};
