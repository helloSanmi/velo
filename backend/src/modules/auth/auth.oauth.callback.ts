import { HttpError } from '../../lib/httpError.js';
import type { Provider } from './auth.oauth.types.js';
import {
  MICROSOFT_TOKEN_URL,
  MICROSOFT_USERINFO_URL,
  getMicrosoftAdminClaims,
  getProviderConfig,
  parseProviderProfile,
  renderPopupResult,
  verifyState
} from './auth.oauth.provider.js';
import { assertProviderSignInEnabled, resolveOrgByWorkspaceDomain } from './auth.oauth.workspace.js';
import { completeOauthConnectCallback } from './auth.oauth.callback.connect.js';
import { completeOauthDirectoryCallback } from './auth.oauth.callback.directory.js';
import { completeOauthSignInCallback } from './auth.oauth.callback.signin.js';

const exchangeCodeForToken = async (provider: Provider, code: string) => {
  const config = getProviderConfig(provider);
  const tokenParams = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code,
    redirect_uri: config.redirectUri,
    grant_type: 'authorization_code'
  });

  const tokenResponse = await fetch(MICROSOFT_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: tokenParams.toString()
  });
  if (!tokenResponse.ok) throw new HttpError(401, 'Microsoft token exchange failed.');

  const tokenJson = await tokenResponse.json() as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
    id_token?: string;
  };
  if (!tokenJson.access_token) throw new HttpError(401, 'Microsoft token exchange returned no access token.');
  return tokenJson;
};

const fetchProfile = async (provider: Provider, accessToken: string) => {
  const profileResponse = await fetch(MICROSOFT_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!profileResponse.ok) throw new HttpError(401, 'Microsoft profile fetch failed.');
  const rawProfile = await profileResponse.json();
  return parseProviderProfile(provider, rawProfile);
};

export const completeOauthCallback = async (input: {
  provider: Provider;
  code?: string;
  state?: string;
  error?: string;
  errorDescription?: string;
  userAgent?: string;
  ipAddress?: string;
}) => {
  if (input.error) {
    return renderPopupResult({ ok: false, error: input.errorDescription || input.error });
  }
  if (!input.code || !input.state) {
    throw new HttpError(400, 'Missing OAuth code/state from provider callback.');
  }

  const state = verifyState(input.state);
  if (state.provider !== input.provider) throw new HttpError(400, 'OAuth provider/state mismatch.');
  const stateOrg =
    state.loginSubdomain && state.orgId
      ? await resolveOrgByWorkspaceDomain(state.loginSubdomain)
      : null;
  if (stateOrg && stateOrg.id !== state.orgId) throw new HttpError(400, 'OAuth workspace verification failed.');
  if (state.mode === 'signin' && stateOrg) assertProviderSignInEnabled(stateOrg, input.provider);

  const tokenJson = await exchangeCodeForToken(input.provider, input.code);
  const profile = await fetchProfile(input.provider, String(tokenJson.access_token || ''));
  const { isMicrosoftGlobalAdmin, microsoftTenantId } = getMicrosoftAdminClaims(
    (tokenJson as any).id_token,
    (tokenJson as any).access_token
  );

  if (state.mode === 'connect') {
    return completeOauthConnectCallback({
      state,
      stateOrg: stateOrg ? { id: stateOrg.id, loginSubdomain: stateOrg.loginSubdomain } : null,
      provider: 'microsoft',
      tokenJson,
      profile,
      microsoftTenantId: microsoftTenantId || undefined,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent
    });
  }

  if (state.mode === 'directory') {
    return completeOauthDirectoryCallback({
      state,
      provider: 'microsoft',
      tokenJson
    });
  }

  return completeOauthSignInCallback({
    state,
    provider: 'microsoft',
    profile: {
      subject: profile.subject,
      email: profile.email,
      name: profile.name || undefined,
      avatar: profile.avatar || undefined
    },
    stateOrg: stateOrg ? { id: stateOrg.id } : null,
    isMicrosoftGlobalAdmin,
    microsoftTenantId: microsoftTenantId || undefined,
    userAgent: input.userAgent,
    ipAddress: input.ipAddress
  });
};
