import { apiConfig } from '../apiClient';

export const OAUTH_POPUP_STORAGE_KEY = 'velo_oauth_popup_result';

export const getApiOrigin = () => apiConfig.baseUrl.replace(/\/api\/v1$/, '');

export const removePopupStorage = () => {
  try {
    localStorage.removeItem(OAUTH_POPUP_STORAGE_KEY);
  } catch {
    // noop
  }
};

export const readPopupEnvelope = <T = any>(
  expectedType: string,
  startedAt: number
): { payload: T } | null => {
  try {
    const raw = localStorage.getItem(OAUTH_POPUP_STORAGE_KEY);
    const envelope = raw ? (JSON.parse(raw) as { type?: string; payload?: T; ts?: number }) : null;
    if (!envelope) return null;
    if (envelope.type !== expectedType) return null;
    if ((envelope.ts || 0) < startedAt) return null;
    return { payload: envelope.payload as T };
  } catch {
    return null;
  }
};

export const closePopupSafely = (popup: Window | null) => {
  try {
    popup?.close();
  } catch {
    // noop
  }
};
