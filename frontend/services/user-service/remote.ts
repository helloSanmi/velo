import { Organization, OrgInvite, User } from '../../types';
import { apiConfig, apiRequest, setAuthTokens } from '../apiClient';
import { backendSyncService } from '../backendSyncService';

const OAUTH_POPUP_STORAGE_KEY = 'velo_oauth_popup_result';

const mapInviteFromApi = (invite: any): OrgInvite => ({
  id: invite.id,
  orgId: invite.orgId,
  token: invite.token,
  role: invite.role,
  createdBy: invite.createdBy,
  createdAt: new Date(invite.createdAt).getTime(),
  expiresAt: new Date(invite.expiresAt).getTime(),
  maxUses: invite.maxUses,
  usedCount: invite.usedCount,
  revoked: invite.revoked,
  invitedIdentifier: invite.invitedIdentifier || undefined,
  deliveryStatus: invite.deliveryStatus || undefined,
  deliveryProvider: invite.deliveryProvider || undefined,
  deliveryAttempts: typeof invite.deliveryAttempts === 'number' ? invite.deliveryAttempts : undefined,
  deliveryLastAttemptAt: invite.deliveryLastAttemptAt ? new Date(invite.deliveryLastAttemptAt).getTime() : undefined,
  deliveryDeliveredAt: invite.deliveryDeliveredAt ? new Date(invite.deliveryDeliveredAt).getTime() : undefined,
  deliveryError: invite.deliveryError || undefined
});

const mapOrganizationFromApi = (org: any): Organization => ({
  id: org.id,
  name: org.name,
  loginSubdomain: org.loginSubdomain || undefined,
  totalSeats: org.totalSeats,
  ownerId: org.ownerId,
  createdAt: new Date(org.createdAt).getTime(),
  plan: org.plan,
  seatPrice: org.seatPrice,
  billingCurrency: org.billingCurrency,
  aiDailyRequestLimit: typeof org.aiDailyRequestLimit === 'number' ? org.aiDailyRequestLimit : undefined,
  aiDailyTokenLimit: typeof org.aiDailyTokenLimit === 'number' ? org.aiDailyTokenLimit : undefined,
  allowMicrosoftAuth: Boolean(org.allowMicrosoftAuth),
  microsoftWorkspaceConnected: Boolean(org.microsoftWorkspaceConnected),
  notificationSenderEmail: org.notificationSenderEmail || undefined
});

const mapUserFromApi = (user: any): User => ({
  id: user.id,
  orgId: user.orgId,
  username: user.username,
  displayName: user.displayName,
  firstName: user.firstName || undefined,
  lastName: user.lastName || undefined,
  email: user.email || undefined,
  avatar: user.avatar || undefined,
  role: user.role,
  licenseActive: user.licenseActive !== false,
  mustChangePassword: Boolean(user.mustChangePassword)
});

export const loginWithPasswordRemote = async (
  identifier: string,
  password: string,
  workspaceDomain: string | undefined,
  saveSession: (user: User) => void
): Promise<{ user?: User; error?: string; code?: string }> => {
  try {
    const response = await apiRequest<{
      tokens: { accessToken: string; refreshToken: string };
      user: User;
    }>('/auth/login', {
      method: 'POST',
      auth: false,
      body: { identifier, password, workspaceDomain }
    });
    setAuthTokens(response.tokens);
    saveSession(response.user);
    return { user: response.user };
  } catch (error: any) {
    return { error: error?.message || 'Account not found.', code: error?.details?.code };
  }
};

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
  const apiOrigin = apiConfig.baseUrl.replace(/\/api\/v1$/, '');
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
    try { localStorage.removeItem(OAUTH_POPUP_STORAGE_KEY); } catch { /* noop */ }
    const timeout = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve({ error: 'Sign-in timed out. Please try again.' });
    }, 2 * 60 * 1000);
    const storagePoll = window.setInterval(() => {
      if (settled) return;
      let envelope: { type?: string; payload?: any; ts?: number } | null = null;
      try {
        const raw = localStorage.getItem(OAUTH_POPUP_STORAGE_KEY);
        envelope = raw ? JSON.parse(raw) : null;
      } catch {
        envelope = null;
      }
      if (!envelope || envelope.type !== 'velo-oauth-result' || (envelope.ts || 0) < startedAt) return;
      const payload = envelope.payload || {};
      settled = true;
      cleanup();
      try { localStorage.removeItem(OAUTH_POPUP_STORAGE_KEY); } catch { /* noop */ }
      if (payload.ok && payload.tokens && payload.user) {
        setAuthTokens(payload.tokens);
        saveSession(payload.user as User);
        resolve({ user: payload.user as User });
        return;
      }
      resolve({ error: String(payload.error || 'OAuth sign-in failed.'), code: payload.code ? String(payload.code) : undefined });
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
      resolve({ error: String(payload.error || 'OAuth sign-in failed.'), code: payload.code ? String(payload.code) : undefined });
    };

    const cleanup = () => {
      window.clearTimeout(timeout);
      window.clearInterval(storagePoll);
      window.removeEventListener('message', handleMessage);
      try {
        popup.close();
      } catch {
        // ignore
      }
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
      `/auth/oauth/${provider}/connect-url?workspaceDomain=${encodeURIComponent(workspaceDomain)}&returnOrigin=${encodeURIComponent(window.location.origin)}`,
      { auth: true }
    );
    return { url: response.url };
  } catch (error: any) {
    return { error: error?.message || 'Could not start provider connection.' };
  }
};

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
  users?: Array<{ externalId: string; email: string; displayName: string; firstName?: string; lastName?: string }>;
  error?: string;
  code?: string;
}> => {
  try {
    const response = await apiRequest<{
      provider: 'microsoft';
      users: Array<{ externalId: string; email: string; displayName: string; firstName?: string; lastName?: string }>;
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
  users?: Array<{ externalId: string; email: string; displayName: string; firstName?: string; lastName?: string }>;
  error?: string;
}> => {
  const apiOrigin = apiConfig.baseUrl.replace(/\/api\/v1$/, '');
  const popup = window.open(
    startUrl,
    'velo-oauth-directory',
    'popup=yes,width=620,height=780,menubar=no,toolbar=no,status=no'
  );
  if (!popup) return { success: false, error: 'Popup blocked. Allow popups and retry.' };

  return new Promise((resolve) => {
    let settled = false;
    const startedAt = Date.now();
    try { localStorage.removeItem(OAUTH_POPUP_STORAGE_KEY); } catch { /* noop */ }
    const timeout = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve({ success: false, error: 'Directory import timed out. Please try again.' });
    }, 2 * 60 * 1000);
    const storagePoll = window.setInterval(() => {
      if (settled) return;
      let envelope: { type?: string; payload?: any; ts?: number } | null = null;
      try {
        const raw = localStorage.getItem(OAUTH_POPUP_STORAGE_KEY);
        envelope = raw ? JSON.parse(raw) : null;
      } catch {
        envelope = null;
      }
      if (!envelope || envelope.type !== 'velo-oauth-directory-result' || (envelope.ts || 0) < startedAt) return;
      const payload = envelope.payload || {};
      settled = true;
      cleanup();
      try { localStorage.removeItem(OAUTH_POPUP_STORAGE_KEY); } catch { /* noop */ }
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
      try { popup.close(); } catch { /* noop */ }
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
  const apiOrigin = apiConfig.baseUrl.replace(/\/api\/v1$/, '');
  const popup = window.open(
    startUrl,
    'velo-oauth-connect',
    'popup=yes,width=520,height=720,menubar=no,toolbar=no,status=no'
  );
  if (!popup) {
    return { success: false, error: 'Popup blocked. Allow popups for this site and try again.' };
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
      const connected = availability.microsoftEnabled;
      if (!connected) return;
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
      if (payloadContainer.type !== 'velo-oauth-connect-result' && payloadContainer.type !== 'velo-oauth-result') return;
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
      try {
        popup.close();
      } catch {
        // ignore
      }
    };

    window.addEventListener('message', handleMessage);
  });
};

export const beginIntegrationConnectPopupRemote = async (
  startUrl: string,
  provider: 'slack' | 'github'
): Promise<{ success: boolean; provider?: 'slack' | 'github'; error?: string }> => {
  const apiOrigin = apiConfig.baseUrl.replace(/\/api\/v1$/, '');
  const popup = window.open(
    startUrl,
    `velo-${provider}-connect`,
    'popup=yes,width=520,height=720,menubar=no,toolbar=no,status=no'
  );
  if (!popup) return { success: false, error: 'Popup blocked. Allow popups for this site and try again.' };

  return new Promise((resolve) => {
    let settled = false;
    const startedAt = Date.now();
    try { localStorage.removeItem(OAUTH_POPUP_STORAGE_KEY); } catch { /* noop */ }
    const timeout = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve({ success: false, error: 'Connection timed out. Please try again.' });
    }, 2 * 60 * 1000);

    const storagePoll = window.setInterval(() => {
      if (settled) return;
      let envelope: { type?: string; payload?: any; ts?: number } | null = null;
      try {
        const raw = localStorage.getItem(OAUTH_POPUP_STORAGE_KEY);
        envelope = raw ? JSON.parse(raw) : null;
      } catch {
        envelope = null;
      }
      if (!envelope || envelope.type !== 'velo-integration-connect-result' || (envelope.ts || 0) < startedAt) return;
      const payload = envelope.payload || {};
      settled = true;
      cleanup();
      try { localStorage.removeItem(OAUTH_POPUP_STORAGE_KEY); } catch { /* noop */ }
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
      try { popup.close(); } catch { /* noop */ }
    };

    window.addEventListener('message', handleMessage);
  });
};

export const registerWithPasswordRemote = async (
  identifier: string,
  password: string,
  orgName: string,
  options: { plan?: 'free' | 'basic' | 'pro'; totalSeats?: number } | undefined,
  saveSession: (user: User) => void
): Promise<{ success: boolean; user?: User; error?: string }> => {
  try {
    const response = await apiRequest<{
      tokens: { accessToken: string; refreshToken: string };
      user: User;
    }>('/auth/register', {
      method: 'POST',
      auth: false,
      body: {
        identifier,
        password,
        orgName,
        plan: options?.plan || 'basic',
        totalSeats: options?.totalSeats
      }
    });
    setAuthTokens(response.tokens);
    saveSession(response.user);
    return { success: true, user: response.user };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Could not create workspace account.' };
  }
};

export const acceptInviteWithPasswordRemote = async (
  token: string,
  identifier: string | undefined,
  password: string,
  saveSession: (user: User) => void
): Promise<{ success: boolean; error?: string; user?: User }> => {
  try {
    const response = await apiRequest<{
      tokens: { accessToken: string; refreshToken: string };
      user: User;
    }>('/auth/invites/accept', {
      method: 'POST',
      auth: false,
      body: { token, identifier, password }
    });
    setAuthTokens(response.tokens);
    saveSession(response.user);
    return { success: true, user: response.user };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Unable to join workspace.' };
  }
};

export const previewInviteRemote = async (
  token: string
): Promise<{
  success: boolean;
  data?: {
    token: string;
    role: 'member' | 'admin';
    invitedIdentifier: string | null;
    expiresAt: string;
    org: { id: string; name: string; loginSubdomain: string };
  };
  error?: string;
}> => {
  try {
    const data = await apiRequest<{
      token: string;
      role: 'member' | 'admin';
      invitedIdentifier: string | null;
      expiresAt: string;
      org: { id: string; name: string; loginSubdomain: string };
    }>(`/auth/invites/${encodeURIComponent(token)}`, {
      method: 'GET',
      auth: false
    });
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Invite link is invalid or expired.' };
  }
};

export const changePasswordRemote = async (
  currentPassword: string,
  newPassword: string,
  confirmPassword: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    await apiRequest('/auth/change-password', {
      method: 'POST',
      body: { currentPassword, newPassword, confirmPassword }
    });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Could not change password.' };
  }
};

export const resetPasswordRemote = async (
  identifier: string,
  workspaceDomain: string | undefined,
  newPassword: string,
  confirmPassword: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    await apiRequest('/auth/reset-password', {
      method: 'POST',
      auth: false,
      body: { identifier, workspaceDomain, newPassword, confirmPassword }
    });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Could not reset password.' };
  }
};

export const fetchInvitesFromBackendRemote = async (
  orgId: string,
  getLocalInvites: (orgId?: string) => OrgInvite[]
): Promise<OrgInvite[]> => {
  try {
    const rows = await apiRequest<any[]>(`/orgs/${orgId}/invites`);
    return rows.map(mapInviteFromApi);
  } catch {
    return getLocalInvites(orgId);
  }
};

export const createInviteRemote = async (
  orgId: string,
  options?: { role?: 'member' | 'admin'; invitedIdentifier?: string; ttlDays?: number; maxUses?: number }
): Promise<{ success: boolean; invite?: OrgInvite; error?: string }> => {
  try {
    const invite = await apiRequest<any>(`/orgs/${orgId}/invites`, {
      method: 'POST',
      body: {
        role: options?.role || 'member',
        invitedIdentifier: options?.invitedIdentifier,
        ttlDays: options?.ttlDays || 14,
        maxUses: options?.maxUses || 1
      }
    });
    return { success: true, invite: mapInviteFromApi(invite) };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Could not create invite.' };
  }
};

export const revokeInviteRemote = async (orgId: string, inviteId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    await apiRequest(`/orgs/${orgId}/invites/${inviteId}`, { method: 'DELETE' });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Could not revoke invite.' };
  }
};

export const resendInviteRemote = async (
  orgId: string,
  inviteId: string
): Promise<{ success: boolean; invite?: OrgInvite; error?: string }> => {
  try {
    const invite = await apiRequest<any>(`/orgs/${orgId}/invites/${inviteId}/resend`, {
      method: 'POST'
    });
    return { success: true, invite: mapInviteFromApi(invite) };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Could not resend invite.' };
  }
};

export const addSeatsRemote = async (orgId: string, seatsToAdd: number): Promise<Organization | null> => {
  try {
    const org = await apiRequest<any>(`/orgs/${orgId}/seats/add`, {
      method: 'POST',
      body: { seatsToAdd }
    });
    return mapOrganizationFromApi(org);
  } catch {
    return null;
  }
};

export const provisionUserRemote = async (
  orgId: string,
  username: string,
  role: 'admin' | 'member' = 'member',
  profile?: { firstName?: string; lastName?: string; email?: string },
  password = 'Password',
  mustChangePassword = true
): Promise<{ success: boolean; error?: string; user?: User }> => {
  try {
    const user = await apiRequest<any>(`/orgs/${orgId}/users`, {
      method: 'POST',
      body: {
        username,
        role,
        firstName: profile?.firstName,
        lastName: profile?.lastName,
        email: profile?.email,
        password,
        mustChangePassword
      }
    });
    return { success: true, user: mapUserFromApi(user) };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Could not provision user.' };
  }
};

export const updateOrganizationSettingsRemote = async (
  orgId: string,
  patch: Partial<Pick<Organization, 'loginSubdomain' | 'allowMicrosoftAuth' | 'microsoftWorkspaceConnected' | 'notificationSenderEmail'>>
): Promise<Organization | null> => {
  try {
    const org = await apiRequest<any>(`/orgs/${orgId}/settings`, {
      method: 'PATCH',
      body: patch
    });
    return mapOrganizationFromApi(org);
  } catch {
    return null;
  }
};

export const importDirectoryUsersRemote = async (
  orgId: string,
  provider: 'microsoft',
  users: Array<{ email: string; displayName: string; firstName?: string; lastName?: string }>
): Promise<{
  success: boolean;
  created?: Array<{ id: string; email: string; displayName: string }>;
  skipped?: Array<{ email: string; reason: string }>;
  seats?: { used: number; total: number; limited: boolean };
  error?: string;
}> => {
  try {
    const response = await apiRequest<{
      created: Array<{ id: string; email: string; displayName: string }>;
      skipped: Array<{ email: string; reason: string }>;
      seats: { used: number; total: number; limited: boolean };
    }>(`/orgs/${orgId}/users/import`, {
      method: 'POST',
      body: { provider, users }
    });
    return { success: true, ...response };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Could not import users.' };
  }
};

export const updateUserRemote = async (
  orgId: string,
  userId: string,
  updates: Partial<User>,
  hydrateWorkspace: (orgId: string) => Promise<{ users: User[]; projects: any[] } | null>,
  getUsers: (orgId?: string) => User[]
): Promise<User[] | null> => {
  try {
    await apiRequest(`/orgs/${orgId}/users/${userId}`, {
      method: 'PATCH',
      body: {
        firstName: updates.firstName,
        lastName: updates.lastName,
        email: updates.email,
        displayName: updates.displayName,
        avatar: updates.avatar
      }
    });
    const hydrated = await hydrateWorkspace(orgId);
    if (hydrated) return hydrated.users;
    return getUsers(orgId);
  } catch {
    return null;
  }
};

export const deleteUserRemote = async (
  orgId: string,
  userId: string,
  hydrateWorkspace: (orgId: string) => Promise<{ users: User[]; projects: any[] } | null>,
  getUsers: (orgId?: string) => User[]
): Promise<User[] | null> => {
  try {
    await apiRequest(`/orgs/${orgId}/users/${userId}`, { method: 'DELETE' });
    const hydrated = await hydrateWorkspace(orgId);
    if (hydrated) return hydrated.users;
    return getUsers(orgId);
  } catch {
    return null;
  }
};

export const deleteOrganizationRemote = async (orgId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    await apiRequest(`/orgs/${orgId}`, {
      method: 'DELETE',
      body: { confirmation: 'DELETE' }
    });
    backendSyncService.clearAuthSession();
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Could not delete organization.' };
  }
};
