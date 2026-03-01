const attempts = new Map<string, number[]>();
const locks = new Map<string, number>();

const MAX_FAILED_ATTEMPTS = 6;
const WINDOW_MS = 10 * 60 * 1000;
const LOCK_MS = 15 * 60 * 1000;

const cleanup = (nowMs: number, key: string) => {
  const lockedUntil = locks.get(key);
  if (typeof lockedUntil === 'number' && lockedUntil <= nowMs) {
    locks.delete(key);
  }

  const history = attempts.get(key);
  if (!history) return;

  const filtered = history.filter((ts) => nowMs - ts <= WINDOW_MS);
  if (filtered.length === 0) {
    attempts.delete(key);
    return;
  }
  attempts.set(key, filtered);
};

export const isLoginLocked = (key: string) => {
  const nowMs = Date.now();
  cleanup(nowMs, key);
  const lockedUntil = locks.get(key) || 0;
  if (lockedUntil <= nowMs) return { locked: false, retryAfterSeconds: 0 };
  return { locked: true, retryAfterSeconds: Math.ceil((lockedUntil - nowMs) / 1000) };
};

export const registerLoginFailure = (key: string) => {
  const nowMs = Date.now();
  cleanup(nowMs, key);
  const history = attempts.get(key) || [];
  history.push(nowMs);
  const filtered = history.filter((ts) => nowMs - ts <= WINDOW_MS);
  attempts.set(key, filtered);
  if (filtered.length >= MAX_FAILED_ATTEMPTS) {
    locks.set(key, nowMs + LOCK_MS);
    attempts.delete(key);
  }
};

export const clearLoginFailures = (key: string) => {
  attempts.delete(key);
  locks.delete(key);
};

export const normalizeLoginGuardKey = (identifier: string, workspaceDomain?: string) => {
  const raw = `${workspaceDomain || ''}:${identifier || ''}`.trim().toLowerCase();
  return raw.length > 0 ? raw : 'unknown';
};

