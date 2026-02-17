const STORAGE_KEY = 'velo_copilot_insights_v1';

interface InsightStore {
  [orgId: string]: {
    [projectId: string]: string[];
  };
}

const readStore = (): InsightStore => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const writeStore = (store: InsightStore) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
};

const normalize = (text: string) => text.replace(/\s+/g, ' ').trim();

export const copilotInsightService = {
  list(orgId: string, projectId: string) {
    const store = readStore();
    return store[orgId]?.[projectId] || [];
  },
  isPinned(orgId: string, projectId: string, insight: string) {
    const normalized = normalize(insight);
    return this.list(orgId, projectId).includes(normalized);
  },
  pin(orgId: string, projectId: string, insight: string) {
    const normalized = normalize(insight);
    if (!normalized) return;
    const store = readStore();
    const existing = store[orgId]?.[projectId] || [];
    if (existing.includes(normalized)) return;
    const nextForProject = [normalized, ...existing].slice(0, 80);
    writeStore({
      ...store,
      [orgId]: {
        ...(store[orgId] || {}),
        [projectId]: nextForProject
      }
    });
  },
  unpin(orgId: string, projectId: string, insight: string) {
    const normalized = normalize(insight);
    const store = readStore();
    const existing = store[orgId]?.[projectId] || [];
    const next = existing.filter((item) => item !== normalized);
    writeStore({
      ...store,
      [orgId]: {
        ...(store[orgId] || {}),
        [projectId]: next
      }
    });
  }
};
