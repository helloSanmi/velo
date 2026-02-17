
import { createId } from '../utils/id';
import { settingsService } from './settingsService';
import { toastService } from './toastService';
import { realtimeService, RealtimeEvent } from './realtimeService';

export interface Notification {
  id: string;
  orgId: string;
  userId: string;
  title: string;
  message: string;
  type: 'ASSIGNMENT' | 'DUE_DATE' | 'SYSTEM';
  timestamp: number;
  read: boolean;
  linkId?: string;
  category?: 'assigned' | 'completed' | 'comment' | 'due' | 'system';
  urgent?: boolean;
  mentionFromLead?: boolean;
}

const NOTIFICATIONS_KEY = 'velo_notifications';
const BUNDLE_KEY = 'velo_notification_bundles';
const SESSION_KEY = 'velo_session';
const BUNDLED_TITLE = 'Activity summary';
let audioPrimed = false;
let audioUnlockBound = false;
let sharedAudioContext: AudioContext | null = null;

const bindAudioUnlock = () => {
  if (audioUnlockBound || typeof window === 'undefined') return;
  audioUnlockBound = true;
  const unlock = () => {
    audioPrimed = true;
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
    window.removeEventListener('touchstart', unlock);
  };
  window.addEventListener('pointerdown', unlock, { once: true });
  window.addEventListener('keydown', unlock, { once: true });
  window.addEventListener('touchstart', unlock, { once: true });
};

const safeRead = (): Notification[] => {
  try {
    const data = localStorage.getItem(NOTIFICATIONS_KEY);
    const all: Notification[] = data ? JSON.parse(data) : [];
    return Array.isArray(all) ? all : [];
  } catch {
    return [];
  }
};

const safeWrite = (items: Notification[]) => {
  localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(items));
};

const parseTimeToMinutes = (value: string) => {
  const [h, m] = value.split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;
  return (h * 60) + m;
};

const isWithinSchedule = (start: string, end: string) => {
  const now = new Date();
  const current = (now.getHours() * 60) + now.getMinutes();
  const startMin = parseTimeToMinutes(start);
  const endMin = parseTimeToMinutes(end);
  if (startMin === endMin) return true;
  if (startMin < endMin) return current >= startMin && current <= endMin;
  return current >= startMin || current <= endMin;
};

const inferCategory = (notification: Omit<Notification, 'id' | 'read' | 'timestamp'>): Notification['category'] => {
  if (notification.category) return notification.category;
  if (notification.type === 'ASSIGNMENT') return 'assigned';
  if (notification.type === 'DUE_DATE') return 'due';
  const text = `${notification.title} ${notification.message}`.toLowerCase();
  if (text.includes('comment')) return 'comment';
  if (text.includes('completed')) return 'completed';
  return 'system';
};

const isProjectCompletionAction = (notification: Omit<Notification, 'id' | 'read' | 'timestamp'>) => {
  const text = `${notification.title} ${notification.message}`.toLowerCase();
  return text.includes('project') && (
    text.includes('complete') ||
    text.includes('approval') ||
    text.includes('approved') ||
    text.includes('request')
  );
};

const shouldDeliverForCurrentSession = (notification: Omit<Notification, 'id' | 'read' | 'timestamp'>) => {
  const settings = settingsService.getSettings();
  const sessionRaw = localStorage.getItem(SESSION_KEY);
  const session = sessionRaw ? JSON.parse(sessionRaw) : null;
  if (!session || session.id !== notification.userId) return true;

  if (!settings.enableNotifications) return false;

  const category = inferCategory(notification);

  if (category === 'assigned' && !settings.notificationTaskAssignment) return false;
  if (category === 'comment' && !settings.notificationMentionsReplies) return false;
  if (category === 'due' && !settings.notificationDueOverdue) return false;
  if (category === 'completed') {
    if (isProjectCompletionAction(notification)) {
      if (!settings.notificationProjectCompletionActions) return false;
    } else if (!settings.notificationStatusChangesMyWork) {
      return false;
    }
  }
  if (category === 'system') {
    if (isProjectCompletionAction(notification)) {
      if (!settings.notificationProjectCompletionActions) return false;
    } else if (!settings.notificationSystemSecurity) {
      return false;
    }
  }

  if (notification.mentionFromLead && !settings.notificationMentionsReplies) return false;
  return true;
};

const getCurrentSessionUserId = () => {
  try {
    const sessionRaw = localStorage.getItem(SESSION_KEY);
    const session = sessionRaw ? JSON.parse(sessionRaw) : null;
    return typeof session?.id === 'string' ? session.id : null;
  } catch {
    return null;
  }
};

const playSoundForCurrentUser = (userId: string, force = false) => {
  const settings = settingsService.getSettings();
  if (!force && !settings.notificationSound) return;
  bindAudioUnlock();
  try {
    const sessionRaw = localStorage.getItem(SESSION_KEY);
    const session = sessionRaw ? JSON.parse(sessionRaw) : null;
    if (!session || session.id !== userId) return;
    if (force) audioPrimed = true;
    if (!audioPrimed) return;
    const Ctx = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext | undefined;
    if (Ctx) {
      const ctx = sharedAudioContext || new Ctx();
      sharedAudioContext = ctx;
      if (ctx.state === 'suspended') {
        void ctx.resume().catch(() => undefined);
      }
      const now = ctx.currentTime;

      const master = ctx.createGain();
      master.gain.setValueAtTime(0.0001, now);
      master.gain.exponentialRampToValueAtTime(0.06, now + 0.04);
      master.gain.exponentialRampToValueAtTime(0.0001, now + 0.52);
      master.connect(ctx.destination);

      const toneA = ctx.createOscillator();
      toneA.type = 'sine';
      toneA.frequency.setValueAtTime(660, now);
      toneA.frequency.exponentialRampToValueAtTime(880, now + 0.2);

      const toneB = ctx.createOscillator();
      toneB.type = 'triangle';
      toneB.frequency.setValueAtTime(990, now + 0.08);

      const gainA = ctx.createGain();
      gainA.gain.value = 0.85;
      const gainB = ctx.createGain();
      gainB.gain.value = 0.35;

      toneA.connect(gainA);
      toneB.connect(gainB);
      gainA.connect(master);
      gainB.connect(master);

      toneA.start(now);
      toneA.stop(now + 0.5);
      toneB.start(now + 0.08);
      toneB.stop(now + 0.48);
      return;
    }
    const audio = new Audio('data:audio/wav;base64,UklGRlQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YTAAAAAAAP//AAD//wAA//8AAP//AAD//wAA');
    audio.volume = 0.22;
    void audio.play().catch(() => undefined);
  } catch {
    // ignore audio failures
  }
};

const writeBundled = (notification: Omit<Notification, 'id' | 'read' | 'timestamp'>, all: Notification[]) => {
  const bundleKey = `${notification.orgId}:${notification.userId}`;
  const bundleRaw = localStorage.getItem(BUNDLE_KEY);
  const bundles = bundleRaw ? JSON.parse(bundleRaw) : {};
  const state = bundles[bundleKey] || { count: 0, latestMessage: '' };
  const nextCount = Number(state.count || 0) + 1;
  bundles[bundleKey] = { count: nextCount, latestMessage: notification.message };
  localStorage.setItem(BUNDLE_KEY, JSON.stringify(bundles));

  const existingIndex = all.findIndex(
    (item) => item.orgId === notification.orgId && item.userId === notification.userId && item.category === 'system' && item.title === BUNDLED_TITLE
  );
  const bundledNotification: Notification = {
    id: existingIndex >= 0 ? all[existingIndex].id : createId(),
    orgId: notification.orgId,
    userId: notification.userId,
    title: BUNDLED_TITLE,
    message: `${nextCount} new notification${nextCount > 1 ? 's' : ''}. Latest activity: ${notification.message}`,
    type: 'SYSTEM',
    category: 'system',
    read: false,
    timestamp: Date.now(),
    linkId: notification.linkId
  };

  if (existingIndex >= 0) {
    all[existingIndex] = bundledNotification;
  } else {
    all.unshift(bundledNotification);
  }
};

const clearBundleState = (orgId: string, userId: string) => {
  const key = `${orgId}:${userId}`;
  try {
    const bundleRaw = localStorage.getItem(BUNDLE_KEY);
    if (!bundleRaw) return;
    const bundles = JSON.parse(bundleRaw);
    if (!bundles || typeof bundles !== 'object') return;
    delete bundles[key];
    localStorage.setItem(BUNDLE_KEY, JSON.stringify(bundles));
  } catch {
    // ignore malformed bundle state
  }
};

const emitNotificationUpdated = (orgId: string, userId: string) => {
  window.dispatchEvent(
    new CustomEvent('notificationsUpdated', {
      detail: { orgId, userId }
    })
  );
};

const addNotificationInternal = (
  notification: Omit<Notification, 'id' | 'read' | 'timestamp'>,
  options?: { suppressRealtime?: boolean; suppressToast?: boolean; suppressSound?: boolean }
): void => {
  if (!shouldDeliverForCurrentSession(notification)) return;
  const all = safeRead();
  const now = Date.now();
  const duplicate = all.find(
    (item) =>
      item.orgId === notification.orgId &&
      item.userId === notification.userId &&
      item.title === notification.title &&
      item.message === notification.message &&
      item.linkId === notification.linkId &&
      now - item.timestamp < 2500
  );
  if (duplicate) return;
  const sessionRaw = localStorage.getItem(SESSION_KEY);
  const session = sessionRaw ? JSON.parse(sessionRaw) : null;
  const digestMode =
    session && session.id === notification.userId
      ? settingsService.getSettings().notificationDigestMode
      : 'instant';

  if (digestMode === 'bundled') {
    writeBundled(notification, all);
  } else {
    const newNotification: Notification = {
      ...notification,
      category: inferCategory(notification),
      id: createId(),
      read: false,
      timestamp: Date.now()
    };
    all.unshift(newNotification);
  }

  safeWrite(all);
  if (!options?.suppressSound) playSoundForCurrentUser(notification.userId);
  if (!options?.suppressToast && getCurrentSessionUserId() === notification.userId) {
    toastService.info(notification.title, notification.message);
  }
  emitNotificationUpdated(notification.orgId, notification.userId);
  if (!options?.suppressRealtime) {
    realtimeService.publish({
      type: 'NOTIFICATIONS_UPDATED',
      orgId: notification.orgId,
      actorId: getCurrentSessionUserId() || undefined,
      payload: { action: 'add', notification }
    });
  }
};

export const notificationService = {
  getNotifications: (orgId: string, userId: string): Notification[] => {
    const digestMode = settingsService.getSettings().notificationDigestMode;
    const all = safeRead();
    return all
      .filter(n => n.orgId === orgId && n.userId === userId)
      .filter((n) => digestMode === 'bundled' || n.title !== BUNDLED_TITLE)
      .sort((a, b) => b.timestamp - a.timestamp);
  },

  addNotification: (notification: Omit<Notification, 'id' | 'read' | 'timestamp'>): void => {
    try {
      addNotificationInternal(notification);
    } catch (e) {
      console.error("Failed to add notification", e);
    }
  },

  markAsRead: (orgId: string, userId: string, id: string): void => {
    try {
      const all = safeRead();
      const updated = all.map(n => (n.id === id && n.orgId === orgId && n.userId === userId) ? { ...n, read: true } : n);
      safeWrite(updated);
      
      const notification = all.find(n => n.id === id);
      if (notification && notification.orgId === orgId && notification.userId === userId) {
        if (notification.title === BUNDLED_TITLE) clearBundleState(orgId, userId);
        emitNotificationUpdated(notification.orgId, notification.userId);
      }
    } catch (e) {
      console.error("Failed to mark notification as read", e);
    }
  },

  markAllAsRead: (orgId: string, userId: string): void => {
    try {
      const all = safeRead();
      const updated = all.map(n => (n.orgId === orgId && n.userId === userId) ? { ...n, read: true } : n);
      safeWrite(updated);
      clearBundleState(orgId, userId);
      emitNotificationUpdated(orgId, userId);
    } catch (e) {
      console.error("Failed to mark all as read", e);
    }
  },

  clearOne: (orgId: string, userId: string, id: string): void => {
    try {
      const all = safeRead();
      const target = all.find((item) => item.id === id && item.orgId === orgId && item.userId === userId);
      const updated = all.filter((item) => !(item.id === id && item.orgId === orgId && item.userId === userId));
      safeWrite(updated);
      if (target?.title === BUNDLED_TITLE) clearBundleState(orgId, userId);
      emitNotificationUpdated(orgId, userId);
    } catch (e) {
      console.error("Failed to clear notification", e);
    }
  },

  clearAll: (orgId: string, userId: string): void => {
    try {
      const all = safeRead();
      const updated = all.filter((item) => !(item.orgId === orgId && item.userId === userId));
      safeWrite(updated);
      clearBundleState(orgId, userId);
      emitNotificationUpdated(orgId, userId);
    } catch (e) {
      console.error("Failed to clear all notifications", e);
    }
  },

  applyRealtimeEvent: (event: RealtimeEvent): void => {
    const payload = event.payload as { action?: string; notification?: Omit<Notification, 'id' | 'read' | 'timestamp'> } | undefined;
    if (!payload || payload.action !== 'add' || !payload.notification) return;
    addNotificationInternal(payload.notification, { suppressRealtime: true });
  },

  testSound: (userId: string): void => {
    playSoundForCurrentUser(userId, true);
  }
};
