import { User } from '../types';
import { realtimeService } from './realtimeService';

const PRESENCE_KEY_PREFIX = 'velo_presence_v1';
const PRESENCE_TTL_MS = 15000;
const HEARTBEAT_INTERVAL_MS = 5000;

interface PresenceEntry {
  userId: string;
  displayName: string;
  avatar?: string;
  lastSeen: number;
}

const getKey = (orgId: string) => `${PRESENCE_KEY_PREFIX}:${orgId}`;

const readPresence = (orgId: string): Record<string, PresenceEntry> => {
  try {
    return JSON.parse(localStorage.getItem(getKey(orgId)) || '{}');
  } catch {
    return {};
  }
};

const writePresence = (orgId: string, value: Record<string, PresenceEntry>) => {
  localStorage.setItem(getKey(orgId), JSON.stringify(value));
};

const pruneExpired = (orgId: string) => {
  const now = Date.now();
  const current = readPresence(orgId);
  const next = Object.fromEntries(
    Object.entries(current).filter(([, entry]) => now - (entry.lastSeen || 0) <= PRESENCE_TTL_MS)
  );
  writePresence(orgId, next);
  return next;
};

const touch = (user: User) => {
  const current = pruneExpired(user.orgId);
  current[user.id] = {
    userId: user.id,
    displayName: user.displayName,
    avatar: user.avatar,
    lastSeen: Date.now()
  };
  writePresence(user.orgId, current);
};

const listOnline = (orgId: string): PresenceEntry[] => {
  const active = pruneExpired(orgId);
  return Object.values(active).sort((a, b) => b.lastSeen - a.lastSeen);
};

const publishPing = (user: User) => {
  realtimeService.publish({
    type: 'PRESENCE_PING',
    orgId: user.orgId,
    actorId: user.id,
    payload: { displayName: user.displayName }
  });
};

const start = (user: User, onChange: (entries: PresenceEntry[]) => void): (() => void) => {
  const update = () => {
    touch(user);
    onChange(listOnline(user.orgId));
  };

  update();
  publishPing(user);

  const timer = window.setInterval(() => {
    update();
    publishPing(user);
  }, HEARTBEAT_INTERVAL_MS);

  const onVisibility = () => {
    if (!document.hidden) {
      update();
      publishPing(user);
    }
  };

  const onStorage = (event: StorageEvent) => {
    if (event.key !== getKey(user.orgId)) return;
    onChange(listOnline(user.orgId));
  };

  const unsubscribeRealtime = realtimeService.subscribe((event) => {
    if (event.type !== 'PRESENCE_PING' || event.orgId !== user.orgId) return;
    onChange(listOnline(user.orgId));
  });

  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('storage', onStorage);

  return () => {
    window.clearInterval(timer);
    unsubscribeRealtime();
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('storage', onStorage);
  };
};

export const presenceService = {
  listOnline,
  start
};
