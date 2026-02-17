import { createId } from '../utils/id';
import { toastService } from './toastService';

type AiJobStatus = 'running' | 'completed' | 'failed';

export interface AiJobRecord {
  id: string;
  orgId: string;
  userId: string;
  type: string;
  label: string;
  status: AiJobStatus;
  dedupeKey?: string;
  startedAt: number;
  updatedAt: number;
  error?: string;
}

interface RunAiJobInput<T> {
  orgId: string;
  userId: string;
  type: string;
  label: string;
  dedupeKey?: string;
  run: () => Promise<T>;
  onSuccess?: (result: T) => void;
  onError?: (error: unknown) => void;
}

const STORAGE_KEY = 'velo_ai_jobs_v1';
const EVENT_NAME = 'velo:ai-jobs:updated';

const safeRead = (): AiJobRecord[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const safeWrite = (records: AiJobRecord[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records.slice(-120)));
  window.dispatchEvent(new CustomEvent(EVENT_NAME));
};

const activeRuns = new Map<string, Promise<unknown>>();

const upsertRecord = (record: AiJobRecord) => {
  const current = safeRead();
  const idx = current.findIndex((item) => item.id === record.id);
  if (idx >= 0) current[idx] = record;
  else current.push(record);
  safeWrite(current);
};

const findRunningByDedupeKey = (orgId: string, userId: string, dedupeKey?: string) => {
  if (!dedupeKey) return null;
  const current = safeRead();
  return current.find(
    (item) => item.orgId === orgId && item.userId === userId && item.dedupeKey === dedupeKey && item.status === 'running'
  );
};

export const aiJobService = {
  eventName: EVENT_NAME,

  getJobs(orgId: string, userId?: string): AiJobRecord[] {
    return safeRead()
      .filter((item) => item.orgId === orgId && (!userId || item.userId === userId))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  },

  isJobRunning(orgId: string, userId: string, dedupeKey: string): boolean {
    return Boolean(findRunningByDedupeKey(orgId, userId, dedupeKey));
  },

  async runJob<T>(input: RunAiJobInput<T>): Promise<T | null> {
    const running = findRunningByDedupeKey(input.orgId, input.userId, input.dedupeKey);
    if (running) {
      toastService.info('AI already running', `${input.label} is still processing.`);
      return null;
    }

    const id = createId();
    const baseRecord: AiJobRecord = {
      id,
      orgId: input.orgId,
      userId: input.userId,
      type: input.type,
      label: input.label,
      status: 'running',
      dedupeKey: input.dedupeKey,
      startedAt: Date.now(),
      updatedAt: Date.now()
    };
    upsertRecord(baseRecord);

    const promise = input.run();
    activeRuns.set(id, promise);

    try {
      const result = await promise;
      upsertRecord({
        ...baseRecord,
        status: 'completed',
        updatedAt: Date.now()
      });
      activeRuns.delete(id);
      input.onSuccess?.(result);
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'AI request failed.';
      upsertRecord({
        ...baseRecord,
        status: 'failed',
        updatedAt: Date.now(),
        error: message
      });
      activeRuns.delete(id);
      input.onError?.(error);
      return null;
    }
  }
};
