import { promises as fs } from 'fs';
import path from 'path';
import { createId } from '../../lib/ids.js';

export interface StoredWorkflowRule {
  id: string;
  orgId: string;
  projectId?: string;
  name: string;
  isActive: boolean;
  trigger: 'TASK_CREATED' | 'STATUS_CHANGED' | 'PRIORITY_CHANGED';
  triggerValue?: string;
  action: 'SET_PRIORITY' | 'ASSIGN_USER' | 'ADD_TAG' | 'NOTIFY_OWNER';
  actionValue?: string;
  createdAt: number;
  updatedAt: number;
}

const DATA_FILE = path.resolve(process.cwd(), 'data', 'workflows.json');

const readAll = async (): Promise<StoredWorkflowRule[]> => {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeAll = async (rules: StoredWorkflowRule[]): Promise<void> => {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(rules, null, 2), 'utf8');
};

export const workflowsStore = {
  async list(orgId: string): Promise<StoredWorkflowRule[]> {
    const rules = await readAll();
    return rules.filter((rule) => rule.orgId === orgId);
  },

  async get(orgId: string, id: string): Promise<StoredWorkflowRule | null> {
    const rules = await readAll();
    return rules.find((rule) => rule.orgId === orgId && rule.id === id) || null;
  },

  async create(input: Omit<StoredWorkflowRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<StoredWorkflowRule> {
    const rules = await readAll();
    const now = Date.now();
    const created: StoredWorkflowRule = {
      ...input,
      id: createId('wf'),
      createdAt: now,
      updatedAt: now
    };
    rules.push(created);
    await writeAll(rules);
    return created;
  },

  async update(
    orgId: string,
    id: string,
    patch: Partial<Omit<StoredWorkflowRule, 'id' | 'orgId' | 'createdAt' | 'updatedAt'>>
  ): Promise<StoredWorkflowRule | null> {
    const rules = await readAll();
    const index = rules.findIndex((rule) => rule.orgId === orgId && rule.id === id);
    if (index === -1) return null;
    const next: StoredWorkflowRule = {
      ...rules[index],
      ...patch,
      updatedAt: Date.now()
    };
    rules[index] = next;
    await writeAll(rules);
    return next;
  },

  async remove(orgId: string, id: string): Promise<boolean> {
    const rules = await readAll();
    const next = rules.filter((rule) => !(rule.orgId === orgId && rule.id === id));
    if (next.length === rules.length) return false;
    await writeAll(next);
    return true;
  }
};

