import { createId } from '../utils/id';

export type AnalyticsPresetKey = 'overview' | 'delivery' | 'risk' | 'budget';

export interface AnalyticsPreset {
  id: string;
  userId: string;
  orgId: string;
  name: string;
  key: AnalyticsPresetKey;
  selectedProjectId: string;
  visibility: 'personal' | 'shared';
  createdAt: number;
}

const KEY = 'velo_analytics_presets';

const read = (): AnalyticsPreset[] => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch {
    return [];
  }
};

const write = (items: AnalyticsPreset[]) => localStorage.setItem(KEY, JSON.stringify(items));

export const analyticsPresetService = {
  list: (userId: string, orgId: string) =>
    read()
      .filter((item) => item.orgId === orgId && (item.userId === userId || item.visibility === 'shared'))
      .sort((a, b) => b.createdAt - a.createdAt),
  create: (preset: Omit<AnalyticsPreset, 'id' | 'createdAt'>): AnalyticsPreset => {
    const next: AnalyticsPreset = { ...preset, id: createId(), createdAt: Date.now() };
    write([next, ...read()]);
    return next;
  },
  remove: (userId: string, orgId: string, presetId: string) => {
    write(read().filter((item) => !(item.id === presetId && item.userId === userId && item.orgId === orgId)));
  }
};

