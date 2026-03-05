import { apiRequest } from '../apiClient';
import {
  closePopupSafely,
  getApiOrigin,
  readPopupEnvelope,
  removePopupStorage
} from './popup';

export const listIntegrationConnectionsRemote = async (): Promise<{
  success: boolean;
  slackConnected: boolean;
  githubConnected: boolean;
  slackLabel?: string;
  githubLabel?: string;
  error?: string;
}> => {
  try {
    const response = await apiRequest<{
      slack?: { connected?: boolean; accountLabel?: string | null };
      github?: { connected?: boolean; accountLabel?: string | null };
    }>('/integrations/connections', { auth: true });
    return {
      success: true,
      slackConnected: Boolean(response.slack?.connected),
      githubConnected: Boolean(response.github?.connected),
      slackLabel: response.slack?.accountLabel || undefined,
      githubLabel: response.github?.accountLabel || undefined
    };
  } catch (error: any) {
    return {
      success: false,
      slackConnected: false,
      githubConnected: false,
      error: error?.message || 'Could not load integration connections.'
    };
  }
};

export const getIntegrationConnectUrlRemote = async (
  provider: 'slack' | 'github'
): Promise<{ url?: string; error?: string }> => {
  try {
    const response = await apiRequest<{ url: string }>(
      `/integrations/${provider}/connect-url?returnOrigin=${encodeURIComponent(window.location.origin)}`,
      { auth: true }
    );
    return { url: response.url };
  } catch (error: any) {
    return { error: error?.message || 'Could not start integration connection.' };
  }
};

export const beginIntegrationConnectPopupRemote = async (
  startUrl: string,
  provider: 'slack' | 'github'
): Promise<{ success: boolean; provider?: 'slack' | 'github'; error?: string }> => {
  const apiOrigin = getApiOrigin();
  const popup = window.open(
    startUrl,
    `velo-${provider}-connect`,
    'popup=yes,width=520,height=720,menubar=no,toolbar=no,status=no'
  );
  if (!popup) {
    return { success: false, error: 'Popup blocked. Allow popups for this site and try again.' };
  }

  return new Promise((resolve) => {
    let settled = false;
    const startedAt = Date.now();
    removePopupStorage();
    const timeout = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve({ success: false, error: 'Connection timed out. Please try again.' });
    }, 2 * 60 * 1000);

    const storagePoll = window.setInterval(() => {
      if (settled) return;
      const envelope = readPopupEnvelope<any>('velo-integration-connect-result', startedAt);
      if (!envelope) return;
      const payload = envelope.payload || {};
      settled = true;
      cleanup();
      removePopupStorage();
      if (payload.ok) {
        resolve({ success: true, provider: payload.provider || provider });
        return;
      }
      resolve({ success: false, error: String(payload.error || 'Integration connection failed.') });
    }, 250);

    const handleMessage = (event: MessageEvent) => {
      const allowedOrigins = new Set([apiOrigin, window.location.origin]);
      if (!allowedOrigins.has(event.origin)) return;
      const payloadContainer = event.data as { type?: string; payload?: any };
      if (!payloadContainer || payloadContainer.type !== 'velo-integration-connect-result') return;
      const payload = payloadContainer.payload || {};
      if (settled) return;
      settled = true;
      cleanup();
      if (payload.ok) {
        resolve({ success: true, provider: payload.provider || provider });
        return;
      }
      resolve({ success: false, error: String(payload.error || 'Integration connection failed.') });
    };

    const cleanup = () => {
      window.clearTimeout(timeout);
      window.clearInterval(storagePoll);
      window.removeEventListener('message', handleMessage);
      closePopupSafely(popup);
    };

    window.addEventListener('message', handleMessage);
  });
};
