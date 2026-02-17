import { TaskPriority } from '../types';
import { createId } from '../utils/id';

export interface SavedBoardView {
  id: string;
  userId: string;
  orgId: string;
  name: string;
  searchQuery: string;
  projectFilter: string | 'All';
  statusFilter: string | 'All';
  priorityFilter: TaskPriority | 'All';
  tagFilter: string | 'All';
  assigneeFilter: string | 'All';
  dueFrom?: number;
  dueTo?: number;
  createdAt: number;
  sortOrder?: number;
}

const KEY = 'velo_saved_views';

const read = (): SavedBoardView[] => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch {
    return [];
  }
};

const write = (views: SavedBoardView[]) => localStorage.setItem(KEY, JSON.stringify(views));

export const savedViewService = {
  list: (userId: string, orgId: string) =>
    read()
      .filter((v) => v.userId === userId && v.orgId === orgId)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || b.createdAt - a.createdAt),
  create: (view: Omit<SavedBoardView, 'id' | 'createdAt'>): SavedBoardView => {
    const current = read();
    const next: SavedBoardView = { ...view, id: createId(), createdAt: Date.now(), sortOrder: 0 };
    const shifted = current.map((item) => ({ ...item, sortOrder: (item.sortOrder ?? 0) + 1 }));
    write([next, ...shifted]);
    return next;
  },
  update: (userId: string, orgId: string, id: string, updates: Partial<Pick<SavedBoardView, 'name'>>) => {
    const current = read();
    const updated = current.map((item) =>
      item.id === id && item.userId === userId && item.orgId === orgId ? { ...item, ...updates } : item
    );
    write(updated);
  },
  replaceForUser: (userId: string, orgId: string, ordered: SavedBoardView[]) => {
    const current = read();
    const retained = current.filter((item) => !(item.userId === userId && item.orgId === orgId));
    const normalized = ordered.map((item, index) => ({ ...item, sortOrder: index }));
    write([...retained, ...normalized]);
  },
  remove: (userId: string, orgId: string, id: string) => {
    write(read().filter((v) => !(v.id === id && v.userId === userId && v.orgId === orgId)));
  }
};
