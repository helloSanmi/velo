import { createId } from '../utils/id';

export type RealtimeEventType =
  | 'TASKS_UPDATED'
  | 'PROJECTS_UPDATED'
  | 'USERS_UPDATED'
  | 'GROUPS_UPDATED'
  | 'TEAMS_UPDATED'
  | 'NOTIFICATIONS_UPDATED'
  | 'SETTINGS_UPDATED'
  | 'PROJECT_CHAT_UPDATED'
  | 'COMMENT_TYPING'
  | 'PRESENCE_PING';

export interface RealtimeEvent {
  id: string;
  type: RealtimeEventType;
  orgId?: string;
  actorId?: string;
  sentAt: number;
  clientId?: string;
  payload?: Record<string, unknown>;
}

const CHANNEL_NAME = 'velo_realtime_v1';
const STORAGE_FALLBACK_KEY = 'velo_realtime_event';
const CLIENT_KEY = 'velo_realtime_client_id';

type RealtimeListener = (event: RealtimeEvent) => void;

const ensureClientId = (): string => {
  const fromSession = sessionStorage.getItem(CLIENT_KEY);
  if (fromSession) return fromSession;
  const next = createId();
  sessionStorage.setItem(CLIENT_KEY, next);
  return next;
};

const clientId = ensureClientId();
const channel = typeof window !== 'undefined' && 'BroadcastChannel' in window
  ? new BroadcastChannel(CHANNEL_NAME)
  : null;

const listeners = new Set<RealtimeListener>();
let hasBoundGlobalListeners = false;
let ws: WebSocket | null = null;
let connectedOrgId: string | null = null;
let reconnectTimer: number | null = null;

const closeSocketQuietly = (socket: WebSocket) => {
  socket.onmessage = null;
  socket.onclose = null;
  socket.onerror = null;
  if (socket.readyState === WebSocket.CONNECTING) {
    socket.onopen = () => {
      try {
        socket.close(1000, 'client-disconnect');
      } catch {
        // ignore close errors
      }
    };
    return;
  }
  try {
    socket.close(1000, 'client-disconnect');
  } catch {
    // ignore close errors
  }
};

const resolveWsBaseUrl = (): string => {
  const envWs = (import.meta as any).env?.VITE_WS_URL as string | undefined;
  if (envWs) return envWs;
  const apiBase = (import.meta as any).env?.VITE_API_BASE_URL as string | undefined;
  if (apiBase) {
    try {
      const parsed = new URL(apiBase);
      const protocol = parsed.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${protocol}//${parsed.host}`;
    } catch {
      // fall through
    }
  }
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}`;
};

const publish = (message: Omit<RealtimeEvent, 'id' | 'clientId' | 'sentAt'>) => {
  const event: RealtimeEvent = {
    id: createId(),
    clientId,
    sentAt: Date.now(),
    ...message
  };
  notify(event);
  if (channel) {
    channel.postMessage(event);
  } else {
    localStorage.setItem(STORAGE_FALLBACK_KEY, JSON.stringify(event));
    localStorage.removeItem(STORAGE_FALLBACK_KEY);
  }
  if (ws && ws.readyState === WebSocket.OPEN && event.orgId) {
    ws.send(JSON.stringify(event));
  }
};

const notify = (event: RealtimeEvent) => {
  listeners.forEach((listener) => listener(event));
};

const normalizeServerEvent = (raw: any): RealtimeEvent => ({
  id: raw?.id || createId(),
  type: raw?.type || 'SETTINGS_UPDATED',
  orgId: raw?.orgId,
  actorId: raw?.actorId,
  sentAt: raw?.sentAt || raw?.timestamp || Date.now(),
  clientId: raw?.clientId,
  payload: raw?.payload
});

const bindGlobalListeners = () => {
  if (hasBoundGlobalListeners) return;
  hasBoundGlobalListeners = true;
  channel?.addEventListener('message', (raw: MessageEvent<RealtimeEvent>) => {
    if (!raw?.data) return;
    notify(raw.data);
  });
  window.addEventListener('storage', (event: StorageEvent) => {
    if (event.key !== STORAGE_FALLBACK_KEY || !event.newValue) return;
    try {
      const payload = JSON.parse(event.newValue) as RealtimeEvent;
      notify(payload);
    } catch {
      // Ignore malformed payloads from unknown keys.
    }
  });
};

const subscribe = (listener: RealtimeListener): (() => void) => {
  bindGlobalListeners();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const connect = (orgId?: string): void => {
  if (!orgId) return;
  if (ws && connectedOrgId === orgId && ws.readyState <= WebSocket.OPEN) return;
  if (reconnectTimer) {
    window.clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (ws) {
    closeSocketQuietly(ws);
    ws = null;
  }

  const wsBase = resolveWsBaseUrl();
  const wsUrl = `${wsBase}/ws?orgId=${encodeURIComponent(orgId)}`;
  ws = new WebSocket(wsUrl);
  connectedOrgId = orgId;

  const socket = ws;
  socket.onmessage = (event) => {
    if (ws !== socket) return;
    try {
      const parsed = JSON.parse(event.data);
      notify(normalizeServerEvent(parsed));
    } catch {
      // ignore malformed payload
    }
  };

  socket.onclose = () => {
    if (ws !== socket) return;
    const nextOrgId = connectedOrgId;
    ws = null;
    if (!nextOrgId) return;
    if (reconnectTimer) window.clearTimeout(reconnectTimer);
    reconnectTimer = window.setTimeout(() => {
      reconnectTimer = null;
      connect(nextOrgId);
    }, 1500);
  };
};

const disconnect = (): void => {
  if (reconnectTimer) {
    window.clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  const current = ws;
  connectedOrgId = null;
  if (current) closeSocketQuietly(current);
  ws = null;
};

export const realtimeService = {
  getClientId: () => clientId,
  subscribe,
  publish,
  connect,
  disconnect
};
