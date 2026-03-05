import { User } from '../../types';
import { apiRequest, setAuthTokens } from '../apiClient';
import {
  closePopupSafely,
  getApiOrigin,
  OAUTH_POPUP_STORAGE_KEY,
  readPopupEnvelope,
  removePopupStorage
} from './popup';

export const getOauthProviderAvailabilityRemote = async (
  workspaceDomain: string
): Promise<{ microsoftEnabled: boolean; workspaceDomain?: string; orgName?: string; error?: string }> => {
  try {
    const response = await apiRequest<{
      workspaceDomain: string;
      orgName?: string;
      microsoft: { enabled: boolean };
    }>(`/auth/oauth/providers?workspaceDomain=${encodeURIComponent(workspaceDomain)}`, {
      auth: false
    });
    return {
      microsoftEnabled: Boolean(response.microsoft?.enabled),
      workspaceDomain: response.workspaceDomain,
      orgName: response.orgName
    };
  } catch (error: any) {
    return {
      microsoftEnabled: false,
      error: error?.message || 'Could not read SSO provider availability.'
    };
  }
};

export const beginOauthPopupRemote = async (
  provider: 'microsoft',
  workspaceDomain: string | undefined,
  saveSession: (user: User) => void
): Promise<{ user?: User; error?: string; code?: string }> => {
  const apiOrigin = getApiOrigin();
  const params = new URLSearchParams({
    returnOrigin: window.location.origin
  });
  if (workspaceDomain?.trim()) params.set('workspaceDomain', workspaceDomain.trim());
  const popupUrl = `${apiOrigin}/api/v1/auth/oauth/${provider}/start?${params.toString()}`;
  const popup = window.open(
    popupUrl,
    `velo-oauth-${provider}`,
    'popup=yes,width=520,height=720,menubar=no,toolbar=no,status=no'
  );

  if (!popup) {
    return { error: 'Popup blocked. Allow popups for this site and try again.' };
  }

  return new Promise((resolve) => {
    let settled = false;
    const startedAt = Date.now();
    removePopupStorage();
    const timeout = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve({ error: 'Sign-in timed out. Please try again.' });
    }, 2 * 60 * 1000);
    const storagePoll = window.setInterval(() => {
      if (settled) return;
      const envelope = readPopupEnvelope<any>('velo-oauth-result', startedAt);
      if (!envelope) return;
      const payload = envelope.payload || {};
      settled = true;
      cleanup();
      removePopupStorage();
      if (payload.ok && payload.tokens && payload.user) {
        setAuthTokens(payload.tokens);
        saveSession(payload.user as User);
        resolve({ user: payload.user as User });
        return;
      }
      resolve({
        error: String(payload.error || 'OAuth sign-in failed.'),
        code: payload.code ? String(payload.code) : undefined
      });
    }, 250);

    const handleMessage = (event: MessageEvent) => {
      const allowedOrigins = new Set([apiOrigin, window.location.origin]);
      if (!allowedOrigins.has(event.origin)) return;
      const payloadContainer = event.data as { type?: string; payload?: any };
      if (!payloadContainer || payloadContainer.type !== 'velo-oauth-result') return;
      const payload = payloadContainer.payload || {};
      if (settled) return;
      settled = true;
      cleanup();
      if (payload.ok && payload.tokens && payload.user) {
        setAuthTokens(payload.tokens);
        saveSession(payload.user as User);
        resolve({ user: payload.user as User });
        return;
      }
      resolve({
        error: String(payload.error || 'OAuth sign-in failed.'),
        code: payload.code ? String(payload.code) : undefined
      });
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

export const getOauthConnectUrlRemote = async (
  provider: 'microsoft',
  workspaceDomain: string
): Promise<{ url?: string; error?: string }> => {
  try {
    const response = await apiRequest<{ url: string }>(
      `/auth/oauth/${provider}/connect-url?workspaceDomain=${encodeURIComponent(
        workspaceDomain
      )}&returnOrigin=${encodeURIComponent(window.location.origin)}`,
      { auth: true }
    );
    return { url: response.url };
  } catch (error: any) {
    return { error: error?.message || 'Could not start provider connection.' };
  }
};

export const getOauthDirectoryUrlRemote = async (
  provider: 'microsoft'
): Promise<{ url?: string; error?: string }> => {
  try {
    const response = await apiRequest<{ url: string }>(
      `/auth/oauth/${provider}/directory-url?returnOrigin=${encodeURIComponent(window.location.origin)}`,
      { auth: true }
    );
    return { url: response.url };
  } catch (error: any) {
    return { error: error?.message || 'Could not start directory import.' };
  }
};

export const getDirectoryUsersRemote = async (
  provider: 'microsoft'
): Promise<{
  success: boolean;
  provider?: 'microsoft';
  users?: Array<{
    externalId: string;
    email: string;
    displayName: string;
    firstName?: string;
    lastName?: string;
    avatar?: string;
  }>;
  error?: string;
  code?: string;
}> => {
  try {
    const response = await apiRequest<{
      provider: 'microsoft';
      users: Array<{
        externalId: string;
        email: string;
        displayName: string;
        firstName?: string;
        lastName?: string;
        avatar?: string;
      }>;
    }>(`/auth/oauth/${provider}/directory`, { auth: true });
    return { success: true, provider: response.provider, users: response.users };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || 'Could not load directory users.',
      code: error?.details?.code ? String(error.details.code) : undefined
    };
  }
};

export const beginOauthDirectoryPopupRemote = async (
  startUrl: string
): Promise<{
  success: boolean;
  provider?: 'microsoft';
  users?: Array<{
    externalId: string;
    email: string;
    displayName: string;
    firstName?: string;
    lastName?: string;
    avatar?: string;
  }>;
  error?: string;
}> => {
  const apiOrigin = getApiOrigin();
  const popup = window.open(
    startUrl,
    'velo-oauth-directory',
    'popup=yes,width=620,height=780,menubar=no,toolbar=no,status=no'
  );
  if (!popup) return { success: false, error: 'Popup blocked. Allow popups and retry.' };

  return new Promise((resolve) => {
    let settled = false;
    const startedAt = Date.now();
    removePopupStorage();
    const timeout = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve({ success: false, error: 'Directory import timed out. Please try again.' });
    }, 2 * 60 * 1000);
    const storagePoll = window.setInterval(() => {
      if (settled) return;
      const envelope = readPopupEnvelope<any>('velo-oauth-directory-result', startedAt);
      if (!envelope) return;
      const payload = envelope.payload || {};
      settled = true;
      cleanup();
      removePopupStorage();
      if (payload.ok) {
        resolve({
          success: true,
          provider: payload.provider,
          users: Array.isArray(payload.users) ? payload.users : []
        });
        return;
      }
      resolve({ success: false, error: String(payload.error || 'Directory import failed.') });
    }, 250);

    const handleMessage = (event: MessageEvent) => {
      const allowedOrigins = new Set([apiOrigin, window.location.origin]);
      if (!allowedOrigins.has(event.origin)) return;
      const payloadContainer = event.data as { type?: string; payload?: any };
      if (!payloadContainer || payloadContainer.type !== 'velo-oauth-directory-result') return;
      const payload = payloadContainer.payload || {};
      if (settled) return;
      settled = true;
      cleanup();
      if (payload.ok) {
        resolve({
          success: true,
          provider: payload.provider,
          users: Array.isArray(payload.users) ? payload.users : []
        });
        return;
      }
      resolve({ success: false, error: String(payload.error || 'Directory import failed.') });
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

export const beginOauthConnectPopupRemote = async (
  startUrl: string,
  provider: 'microsoft',
  workspaceDomain: string
): Promise<{
  success: boolean;
  provider?: 'microsoft';
  microsoftConnected?: boolean;
  microsoftAllowed?: boolean;
  error?: string;
}> => {
  const apiOrigin = getApiOrigin();
  const popup = window.open(
    startUrl,
    'velo-oauth-connect',
    'popup=yes,width=520,height=720,menubar=no,toolbar=no,status=no'
  );
  if (!popup) {
    return {
      success: false,
      error: 'Popup blocked. Allow popups for this site and try again.'
    };
  }

  return new Promise((resolve) => {
    let settled = false;
    const timeout = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve({ success: false, error: 'Connection timed out. Please try again.' });
    }, 2 * 60 * 1000);
    const statusPoll = window.setInterval(async () => {
      if (settled) return;
      const availability = await getOauthProviderAvailabilityRemote(workspaceDomain);
      if (!availability.microsoftEnabled) return;
      settled = true;
      cleanup();
      resolve({
        success: true,
        provider,
        microsoftConnected: true,
        microsoftAllowed: true
      });
    }, 1000);

    const handleMessage = (event: MessageEvent) => {
      const allowedOrigins = new Set([apiOrigin, window.location.origin]);
      if (!allowedOrigins.has(event.origin)) return;
      const payloadContainer = event.data as { type?: string; payload?: any };
      if (!payloadContainer) return;
      if (
        payloadContainer.type !== 'velo-oauth-connect-result' &&
        payloadContainer.type !== 'velo-oauth-result'
      ) {
        return;
      }
      const payload = payloadContainer.payload || {};
      if (settled) return;
      settled = true;
      cleanup();
      if (payload.ok) {
        resolve({
          success: true,
          provider: payload.provider,
          microsoftConnected: Boolean(payload.microsoftConnected),
          microsoftAllowed: Boolean(payload.microsoftAllowed)
        });
        return;
      }
      resolve({ success: false, error: String(payload.error || 'Provider connection failed.') });
    };

    const cleanup = () => {
      window.clearTimeout(timeout);
      window.clearInterval(statusPoll);
      window.removeEventListener('message', handleMessage);
      closePopupSafely(popup);
    };

    window.addEventListener('message', handleMessage);
  });
};
