const PENDING_KEY = 'velo_sync_pending';

export const syncGuardService = {
  markLocalMutation: () => {
    localStorage.setItem(PENDING_KEY, JSON.stringify({ pending: true, since: Date.now() }));
  },
  markPending: () => {
    localStorage.setItem(PENDING_KEY, JSON.stringify({ pending: true, since: Date.now() }));
  },
  hasPending: () => {
    try {
      const payload = JSON.parse(localStorage.getItem(PENDING_KEY) || 'null');
      return Boolean(payload?.pending);
    } catch {
      return false;
    }
  },
  clearPending: () => localStorage.removeItem(PENDING_KEY)
};
