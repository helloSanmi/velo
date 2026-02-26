import jwt from 'jsonwebtoken';
import { AuditActionType, UserRole } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { HttpError } from '../../lib/httpError.js';
import { env } from '../../config/env.js';
import { createId } from '../../lib/ids.js';
import { writeAudit } from '../audit/audit.service.js';
import { createTokenPair } from './auth.tokens.js';
import { buildJwtPayload, hashToken, normalizeWorkspaceDomain, sessionExpiresAt, toPublicUser } from './auth.shared.js';
import { isSeatLimitedPlan } from '../../lib/planLimits.js';

export type Provider = 'microsoft';

type OAuthState = {
  provider: Provider;
  orgId?: string;
  loginSubdomain?: string;
  mode: 'signin' | 'connect' | 'directory';
  actorUserId?: string;
  returnOrigin?: string;
  nonce: string;
};

const MICROSOFT_AUTH_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize';
const MICROSOFT_TOKEN_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
const MICROSOFT_USERINFO_URL = 'https://graph.microsoft.com/v1.0/me';

const frontendOrigin = (() => {
  try {
    return new URL(env.FRONTEND_BASE_URL).origin;
  } catch {
    return 'http://localhost:3000';
  }
})();

const normalizeReturnOrigin = (value?: string): string | undefined => {
  if (!value) return undefined;
  try {
    const origin = new URL(value).origin;
    if (origin.startsWith('http://') || origin.startsWith('https://')) return origin;
    return undefined;
  } catch {
    return undefined;
  }
};

const decodeJwtClaims = (token?: string): Record<string, any> => {
  if (!token) return {};
  const decoded = jwt.decode(token);
  return decoded && typeof decoded === 'object' ? decoded as Record<string, any> : {};
};

const MICROSOFT_GLOBAL_ADMIN_TEMPLATE_ID = '62e90394-69f5-4237-9190-012177145e10';

const hasMicrosoftGlobalAdminClaim = (claims: Record<string, any>): boolean => {
  const wids = Array.isArray(claims?.wids) ? claims.wids.map((value: unknown) => String(value).toLowerCase()) : [];
  if (wids.includes(MICROSOFT_GLOBAL_ADMIN_TEMPLATE_ID)) return true;

  const roles = Array.isArray(claims?.roles) ? claims.roles.map((value: unknown) => String(value).toLowerCase()) : [];
  return roles.includes('global administrator') || roles.includes('company administrator');
};

const normalizeEmailForUsername = (email: string) => {
  const local = email.split('@')[0]?.toLowerCase() || 'user';
  const safe = local.replace(/[^a-z0-9._-]/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '');
  return safe || 'user';
};

const getProviderConfig = (provider: Provider) => {
  if (!env.MICROSOFT_OAUTH_CLIENT_ID || !env.MICROSOFT_OAUTH_CLIENT_SECRET) {
    throw new HttpError(503, 'Microsoft sign-in is not configured on the server.');
  }
  return {
    clientId: env.MICROSOFT_OAUTH_CLIENT_ID,
    clientSecret: env.MICROSOFT_OAUTH_CLIENT_SECRET,
    redirectUri: env.MICROSOFT_OAUTH_REDIRECT_URI || `${env.APP_BASE_URL}/api/v1/auth/oauth/microsoft/callback`
  };
};

const toPrismaProvider = (_provider: Provider): 'microsoft' => 'microsoft';

const upsertOrgOauthConnection = async (input: {
  orgId: string;
  provider: Provider;
  accessToken?: string;
  refreshToken?: string;
  expiresInSeconds?: number;
  scope?: string;
}) => {
  const provider = toPrismaProvider(input.provider);
  const oauthModel = (prisma as any).organizationOAuthConnection;
  const accessTokenExpiresAt = input.expiresInSeconds
    ? new Date(Date.now() + Math.max(30, input.expiresInSeconds - 30) * 1000)
    : null;
  const existing = await oauthModel.findUnique({
    where: { orgId_provider: { orgId: input.orgId, provider } }
  });
  return oauthModel.upsert({
    where: { orgId_provider: { orgId: input.orgId, provider } },
    create: {
      id: createId('oauth'),
      orgId: input.orgId,
      provider,
      accessToken: input.accessToken || null,
      refreshToken: input.refreshToken || null,
      accessTokenExpiresAt,
      scope: input.scope || null
    },
    update: {
      accessToken: input.accessToken || existing?.accessToken || null,
      refreshToken: input.refreshToken || existing?.refreshToken || null,
      accessTokenExpiresAt,
      scope: input.scope || existing?.scope || null
    }
  });
};

const exchangeRefreshToken = async (input: {
  provider: Provider;
  refreshToken: string;
}): Promise<{ accessToken: string; refreshToken?: string; expiresInSeconds?: number; scope?: string }> => {
  const config = getProviderConfig(input.provider);
  const params = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: 'refresh_token',
    refresh_token: input.refreshToken
  });
  const response = await fetch(MICROSOFT_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  });
  if (!response.ok) throw new HttpError(401, `Could not refresh ${input.provider} token.`);
  const json = await response.json() as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
  };
  if (!json.access_token) throw new HttpError(401, `Could not refresh ${input.provider} token.`);
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresInSeconds: typeof json.expires_in === 'number' ? json.expires_in : undefined,
    scope: json.scope
  };
};

export const ensureProviderAccessToken = async (input: {
  orgId: string;
  provider: Provider;
}): Promise<string> => {
  const oauthModel = (prisma as any).organizationOAuthConnection;
  const connection = await oauthModel.findUnique({
    where: { orgId_provider: { orgId: input.orgId, provider: toPrismaProvider(input.provider) } }
  });
  if (!connection) {
    throw new HttpError(409, `${input.provider} connection requires re-consent.`, { code: 'SSO_RECONNECT_REQUIRED' });
  }

  const stillValid = connection.accessToken && connection.accessTokenExpiresAt && connection.accessTokenExpiresAt.getTime() > Date.now() + 60_000;
  if (stillValid) return connection.accessToken;

  if (!connection.refreshToken) {
    throw new HttpError(409, `${input.provider} connection requires re-consent.`, { code: 'SSO_RECONNECT_REQUIRED' });
  }

  let refreshed: { accessToken: string; refreshToken?: string; expiresInSeconds?: number; scope?: string };
  try {
    refreshed = await exchangeRefreshToken({
      provider: input.provider,
      refreshToken: connection.refreshToken
    });
  } catch {
    throw new HttpError(409, `${input.provider} connection requires re-consent.`, { code: 'SSO_RECONNECT_REQUIRED' });
  }
  await upsertOrgOauthConnection({
    orgId: input.orgId,
    provider: input.provider,
    accessToken: refreshed.accessToken,
    refreshToken: refreshed.refreshToken,
    expiresInSeconds: refreshed.expiresInSeconds,
    scope: refreshed.scope
  });
  return refreshed.accessToken;
};

const fetchDirectoryUsersByAccessToken = async (input: {
  provider: Provider;
  accessToken: string;
}): Promise<Array<{ externalId: string; email: string; displayName: string; firstName?: string; lastName?: string }>> => {
  let nextUrl: string | null =
    'https://graph.microsoft.com/v1.0/users?$select=id,displayName,givenName,surname,mail,userPrincipalName,accountEnabled,proxyAddresses&$top=200';
  const rows: Array<any> = [];
  while (nextUrl) {
    const response = await fetch(nextUrl, {
      headers: { Authorization: `Bearer ${input.accessToken}` }
    });
    if (!response.ok) {
      throw new HttpError(400, 'Could not load Microsoft directory users. Ensure admin consent includes User.ReadBasic.All.');
    }
    const data = await response.json() as { value?: Array<any>; ['@odata.nextLink']?: string };
    rows.push(...(data.value || []));
    nextUrl = data['@odata.nextLink'] || null;
  }

  return rows
    .map((row) => {
      const proxyAddresses = Array.isArray(row.proxyAddresses) ? row.proxyAddresses : [];
      const smtpFromProxy = proxyAddresses
        .map((value: unknown) => String(value))
        .find((value: string) => /^SMTP:/i.test(value))
        ?.replace(/^SMTP:/i, '');
      const email = String(row.mail || row.userPrincipalName || smtpFromProxy || '').trim().toLowerCase();
      return {
        externalId: String(row.id || ''),
        email,
        displayName: String(row.displayName || email || 'Unknown User'),
        firstName: row.givenName ? String(row.givenName) : undefined,
        lastName: row.surname ? String(row.surname) : undefined
      };
    })
    .filter((row) => row.externalId && row.email);
};

const resolveOrgByWorkspaceDomain = async (workspaceDomain: string | undefined) => {
  const normalized = normalizeWorkspaceDomain(workspaceDomain);
  if (!normalized) {
    throw new HttpError(400, 'Workspace URL is required for organization SSO sign-in (for example: acme.localhost or acme.velo.ai).');
  }

  const org = await prisma.organization.findUnique({
    where: { loginSubdomain: normalized },
    select: {
      id: true,
      name: true,
      loginSubdomain: true,
      allowMicrosoftAuth: true,
      microsoftWorkspaceConnected: true
    }
  });

  if (!org) throw new HttpError(404, 'Workspace domain not found.');
  return org;
};

const assertProviderSignInEnabled = (
  org: {
    allowMicrosoftAuth: boolean;
    microsoftWorkspaceConnected: boolean;
  },
  _provider: Provider
) => {
  const isAllowed = org.allowMicrosoftAuth;
  const isConnected = org.microsoftWorkspaceConnected;

  if (!isAllowed) {
    throw new HttpError(403, 'Microsoft sign-in is disabled for this workspace.');
  }
  if (!isConnected) {
    throw new HttpError(403, 'Microsoft workspace integration is not connected for this workspace.');
  }
};

const signState = (state: OAuthState) =>
  jwt.sign(state, env.JWT_ACCESS_SECRET, { expiresIn: '10m' });

const verifyState = (state: string): OAuthState => {
  try {
    const decoded = jwt.verify(state, env.JWT_ACCESS_SECRET) as OAuthState;
    if (!decoded?.provider || !decoded?.mode || !decoded?.nonce) {
      throw new Error('invalid_state_shape');
    }
    if (decoded.mode === 'connect' && (!decoded.orgId || !decoded.loginSubdomain || !decoded.actorUserId)) {
      throw new Error('invalid_connect_state');
    }
    return decoded;
  } catch {
    throw new HttpError(400, 'Invalid or expired OAuth state. Please retry sign-in.');
  }
};

const parseProviderProfile = (provider: Provider, raw: any): { subject: string; email: string; name: string; avatar: string | null } => {
  void provider;
  const subject = String(raw?.id || '').trim();
  const email = String(raw?.mail || raw?.userPrincipalName || '').trim().toLowerCase();
  if (!email || !subject) {
    throw new HttpError(401, 'Microsoft account must provide an email and id.');
  }
  return {
    subject,
    email,
    name: String(raw?.displayName || email),
    avatar: null
  };
};

const createSessionForUser = async (input: {
  user: { id: string; orgId: string; role: UserRole };
  userAgent?: string;
  ipAddress?: string;
  actionType: AuditActionType;
}) => {
  const sessionId = createId('sess');
  const payload = buildJwtPayload({
    userId: input.user.id,
    orgId: input.user.orgId,
    role: input.user.role,
    sessionId
  });
  const tokens = createTokenPair(payload);

  await prisma.session.create({
    data: {
      id: sessionId,
      orgId: input.user.orgId,
      userId: input.user.id,
      refreshTokenHash: await hashToken(tokens.refreshToken),
      userAgent: input.userAgent,
      ipAddress: input.ipAddress,
      expiresAt: sessionExpiresAt()
    }
  });

  await writeAudit({
    orgId: input.user.orgId,
    userId: input.user.id,
    actionType: input.actionType,
    action: 'User logged in via OAuth',
    entityType: 'session',
    entityId: sessionId,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent
  });

  return tokens;
};

const renderPopupResult = (
  payload: Record<string, unknown>,
  messageType = 'velo-oauth-result',
  targetOrigin = frontendOrigin
) => {
  const serialized = JSON.stringify(payload).replace(/</g, '\\u003c');
  const serializedType = JSON.stringify(messageType);
  const serializedTarget = JSON.stringify(targetOrigin);
  return `<!doctype html>
<html><head><meta charset="utf-8" /><title>Velo Sign-in</title></head>
<body>
<script>
(function() {
  var messageType = ${serializedType};
  var targetOrigin = ${serializedTarget};
  var payload = ${serialized};
  var envelope = { type: messageType, payload: payload, ts: Date.now() };
  try {
    if (window.opener) {
      window.opener.postMessage({ type: messageType, payload: payload }, targetOrigin);
      try {
        window.opener.postMessage({ type: messageType, payload: payload }, '*');
      } catch (_) {}
    }
  } catch (_) {}
  try {
    var hash = 'type=' + encodeURIComponent(messageType) + '&payload=' + encodeURIComponent(JSON.stringify(payload)) + '&ts=' + encodeURIComponent(String(envelope.ts));
    window.location.replace(targetOrigin + '/oauth-popup-complete.html#' + hash);
    return;
  } catch (_) {}
  setTimeout(function() { window.close(); }, 500);
})();
</script>
Signing you in...
</body></html>`;
};

export const getOauthProviderAvailability = async (workspaceDomain: string | undefined) => {
  const org = await resolveOrgByWorkspaceDomain(workspaceDomain);
  const input = (workspaceDomain || '').trim().toLowerCase();
  const domainSuffix = input.endsWith('.localhost') ? '.localhost' : '.velo.ai';

  return {
    workspaceDomain: `${org.loginSubdomain}${domainSuffix}`,
    orgName: org.name,
    microsoft: {
      enabled: Boolean(org.allowMicrosoftAuth && org.microsoftWorkspaceConnected)
    },
    status: {
      microsoftConnected: Boolean(org.microsoftWorkspaceConnected),
      microsoftAllowed: Boolean(org.allowMicrosoftAuth)
    }
  };
};

export const buildOauthStartUrl = async (
  provider: Provider,
  workspaceDomain: string | undefined,
  returnOrigin?: string
) => {
  const normalizedWorkspaceDomain = normalizeWorkspaceDomain(workspaceDomain);
  const org = normalizedWorkspaceDomain
    ? await resolveOrgByWorkspaceDomain(normalizedWorkspaceDomain)
    : null;
  if (org) assertProviderSignInEnabled(org, provider);
  const config = getProviderConfig(provider);

  const safeReturnOrigin = normalizeReturnOrigin(returnOrigin);
  const state = signState({
    provider,
    orgId: org?.id,
    loginSubdomain: org?.loginSubdomain,
    mode: 'signin',
    returnOrigin: safeReturnOrigin,
    nonce: createId('nonce')
  });

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: 'openid profile email User.Read',
    response_mode: 'query',
    prompt: 'select_account',
    state
  });
  return `${MICROSOFT_AUTH_URL}?${params.toString()}`;
};

export const buildOauthConnectUrl = async (input: {
  provider: Provider;
  workspaceDomain?: string;
  returnOrigin?: string;
  actor: { userId: string; orgId: string; role: UserRole };
}) => {
  if (input.actor.role !== 'admin') {
    throw new HttpError(403, 'Only workspace admins can connect SSO providers.');
  }
  const org = await resolveOrgByWorkspaceDomain(input.workspaceDomain);
  if (org.id !== input.actor.orgId) {
    throw new HttpError(403, 'Cannot manage SSO for another workspace.');
  }

  const config = getProviderConfig(input.provider);
  const safeReturnOrigin = normalizeReturnOrigin(input.returnOrigin);
  const state = signState({
    provider: input.provider,
    orgId: org.id,
    loginSubdomain: org.loginSubdomain,
    mode: 'connect',
    actorUserId: input.actor.userId,
    returnOrigin: safeReturnOrigin,
    nonce: createId('nonce')
  });

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: 'openid profile email offline_access User.Read User.ReadBasic.All Mail.Send Mail.Read ChannelMessage.Send Chat.ReadWrite',
    response_mode: 'query',
    prompt: 'consent',
    state
  });
  return `${MICROSOFT_AUTH_URL}?${params.toString()}`;
};

export const buildOauthDirectoryUrl = async (input: {
  provider: Provider;
  actor: { userId: string; orgId: string; role: UserRole };
  returnOrigin?: string;
}) => {
  if (input.actor.role !== 'admin') {
    throw new HttpError(403, 'Only workspace admins can import directory users.');
  }
  const org = await prisma.organization.findUnique({
    where: { id: input.actor.orgId },
    select: {
      id: true,
      loginSubdomain: true,
      microsoftWorkspaceConnected: true
    }
  });
  if (!org) throw new HttpError(404, 'Organization not found.');
  if (!org.microsoftWorkspaceConnected) {
    throw new HttpError(400, 'Microsoft is not connected for this workspace.');
  }

  const config = getProviderConfig(input.provider);
  const safeReturnOrigin = normalizeReturnOrigin(input.returnOrigin);
  const state = signState({
    provider: input.provider,
    orgId: org.id,
    loginSubdomain: org.loginSubdomain,
    mode: 'directory',
    actorUserId: input.actor.userId,
    returnOrigin: safeReturnOrigin,
    nonce: createId('nonce')
  });

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: 'openid profile email offline_access User.Read User.ReadBasic.All',
    response_mode: 'query',
    prompt: 'select_account',
    state
  });
  return `${MICROSOFT_AUTH_URL}?${params.toString()}`;
};

export const listDirectoryUsers = async (input: {
  provider: Provider;
  actor: { userId: string; orgId: string; role: UserRole };
}) => {
  if (input.actor.role !== 'admin') {
    throw new HttpError(403, 'Only workspace admins can list directory users.');
  }
  const org = await prisma.organization.findUnique({
    where: { id: input.actor.orgId },
    select: {
      id: true,
      microsoftWorkspaceConnected: true
    }
  });
  if (!org) throw new HttpError(404, 'Organization not found.');
  if (!org.microsoftWorkspaceConnected) {
    throw new HttpError(400, 'Microsoft is not connected for this workspace.');
  }

  const accessToken = await ensureProviderAccessToken({
    orgId: input.actor.orgId,
    provider: input.provider
  });
  const users = await fetchDirectoryUsersByAccessToken({
    provider: input.provider,
    accessToken
  });
  return {
    provider: input.provider,
    users
  };
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
    return renderPopupResult({
      ok: false,
      error: input.errorDescription || input.error
    });
  }

  if (!input.code || !input.state) {
    throw new HttpError(400, 'Missing OAuth code/state from provider callback.');
  }

  const state = verifyState(input.state);
  if (state.provider !== input.provider) {
    throw new HttpError(400, 'OAuth provider/state mismatch.');
  }
  const stateOrg =
    state.loginSubdomain && state.orgId
      ? await resolveOrgByWorkspaceDomain(state.loginSubdomain)
      : null;
  if (stateOrg && stateOrg.id !== state.orgId) {
    throw new HttpError(400, 'OAuth workspace verification failed.');
  }
  if (state.mode === 'signin' && stateOrg) {
    assertProviderSignInEnabled(stateOrg, input.provider);
  }

  const config = getProviderConfig(input.provider);

  const tokenParams = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code: input.code,
    redirect_uri: config.redirectUri,
    grant_type: 'authorization_code'
  });

  const tokenResponse = await fetch(MICROSOFT_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
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

  const profileResponse = await fetch(MICROSOFT_USERINFO_URL, {
    headers: {
      Authorization: `Bearer ${tokenJson.access_token}`
    }
  });

  if (!profileResponse.ok) throw new HttpError(401, 'Microsoft profile fetch failed.');

  const rawProfile = await profileResponse.json() as any;
  const profile = parseProviderProfile(input.provider, rawProfile);
  const idTokenClaims = decodeJwtClaims((tokenJson as any).id_token);
  const accessTokenClaims = decodeJwtClaims((tokenJson as any).access_token);
  const isMicrosoftGlobalAdmin = input.provider === 'microsoft'
    ? hasMicrosoftGlobalAdminClaim(idTokenClaims) || hasMicrosoftGlobalAdminClaim(accessTokenClaims)
    : false;
  const microsoftTenantId = input.provider === 'microsoft'
    ? String(idTokenClaims.tid || accessTokenClaims.tid || '').trim() || null
    : null;
  const providerSubjectField = 'microsoftSubject';

  if (state.mode === 'connect') {
    if (!stateOrg) {
      throw new HttpError(400, 'Workspace context missing for connect flow.');
    }
    const actor = state.actorUserId
      ? await prisma.user.findUnique({ where: { id: state.actorUserId }, select: { id: true, orgId: true, role: true } })
      : null;
    if (!actor || actor.orgId !== stateOrg.id || actor.role !== 'admin') {
      return renderPopupResult(
        { ok: false, error: 'Admin session is no longer valid. Retry from workspace settings.' },
        'velo-oauth-connect-result',
        state.returnOrigin || frontendOrigin
      );
    }

    const patch = { microsoftWorkspaceConnected: true, allowMicrosoftAuth: true, microsoftTenantId };

    const updated = await prisma.organization.update({
      where: { id: stateOrg.id },
      data: patch,
      select: {
        loginSubdomain: true,
        allowMicrosoftAuth: true,
        microsoftWorkspaceConnected: true,
        microsoftTenantId: true
      }
    });

    await upsertOrgOauthConnection({
      orgId: stateOrg.id,
      provider: input.provider,
      accessToken: tokenJson.access_token,
      refreshToken: tokenJson.refresh_token,
      expiresInSeconds: tokenJson.expires_in,
      scope: tokenJson.scope
    });

    let subscriptionEnsured = false;
    let subscriptionEnsureError: string | undefined;
    try {
      const { ticketsGraphService } = await import('../tickets/tickets.graph.service.js');
      const ensured = await ticketsGraphService.ensureMailSubscription({ orgId: stateOrg.id });
      subscriptionEnsured = Boolean(ensured.subscriptionId);
    } catch (error: any) {
      subscriptionEnsureError = error?.message || 'Could not auto-create ticket mail subscription.';
    }

    await writeAudit({
      orgId: stateOrg.id,
      userId: actor.id,
      actionType: 'project_updated',
      action: 'Microsoft SSO connected for workspace.',
      entityType: 'organization',
      entityId: stateOrg.id,
      metadata: {
        provider: input.provider,
        consentedBy: profile.email,
        tenantId: microsoftTenantId,
        ticketNotificationSubscriptionEnsured: subscriptionEnsured,
        ticketNotificationSubscriptionError: subscriptionEnsureError
      },
      ipAddress: input.ipAddress,
      userAgent: input.userAgent
    });

    return renderPopupResult(
      {
        ok: true,
        provider: input.provider,
        workspaceDomain: `${updated.loginSubdomain}.velo.ai`,
        microsoftConnected: updated.microsoftWorkspaceConnected,
        microsoftAllowed: updated.allowMicrosoftAuth,
        subscriptionEnsured,
        subscriptionEnsureError
      },
      'velo-oauth-connect-result',
      state.returnOrigin || frontendOrigin
    );
  }

  if (state.mode === 'directory') {
    const actor = state.actorUserId
      ? await prisma.user.findUnique({ where: { id: state.actorUserId }, select: { id: true, orgId: true, role: true } })
      : null;
    if (!actor || actor.role !== 'admin' || actor.orgId !== state.orgId) {
      return renderPopupResult(
        { ok: false, error: 'Admin session invalid. Retry from Settings.' },
        'velo-oauth-directory-result',
        state.returnOrigin || frontendOrigin
      );
    }

    await upsertOrgOauthConnection({
      orgId: state.orgId!,
      provider: input.provider,
      accessToken: tokenJson.access_token,
      refreshToken: tokenJson.refresh_token,
      expiresInSeconds: tokenJson.expires_in,
      scope: tokenJson.scope
    });

    let users: Array<{
      externalId: string;
      email: string;
      displayName: string;
      firstName?: string;
      lastName?: string;
    }> = [];
    try {
      users = await fetchDirectoryUsersByAccessToken({
        provider: input.provider,
        accessToken: tokenJson.access_token
      });
    } catch (error: any) {
      return renderPopupResult(
        { ok: false, error: error?.message || 'Could not load directory users.' },
        'velo-oauth-directory-result',
        state.returnOrigin || frontendOrigin
      );
    }

    return renderPopupResult(
      {
        ok: true,
        provider: input.provider,
        users
      },
      'velo-oauth-directory-result',
      state.returnOrigin || frontendOrigin
    );
  }
  const providerEnabledFilter = { allowMicrosoftAuth: true, microsoftWorkspaceConnected: true };

  const userMatchesBySubject = await prisma.user.findMany({
    where: {
      [providerSubjectField]: profile.subject,
      ...(stateOrg ? { orgId: stateOrg.id } : {}),
      organization: { is: providerEnabledFilter }
    },
    take: 2
  });

  let user = userMatchesBySubject[0] || null;
  if (!user) {
    const usersByEmail = await prisma.user.findMany({
      where: {
        email: profile.email,
        ...(stateOrg ? { orgId: stateOrg.id } : {}),
        organization: { is: providerEnabledFilter }
      },
      take: 2
    });
    if (usersByEmail.length > 1) {
      return renderPopupResult(
        {
          ok: false,
          error: 'Multiple workspace accounts match this identity. Enter workspace domain, then retry.'
        },
        'velo-oauth-result',
        state.returnOrigin || frontendOrigin
      );
    }
    user = usersByEmail[0] || null;
  }

  let resolvedOrg = stateOrg
    ? await prisma.organization.findUnique({ where: { id: stateOrg.id } })
    : null;

  if (!resolvedOrg && !user) {
    if (input.provider === 'microsoft' && microsoftTenantId) {
      resolvedOrg = await prisma.organization.findFirst({
        where: {
          microsoftTenantId,
          allowMicrosoftAuth: true,
          microsoftWorkspaceConnected: true
        }
      });
    }
  }

  // Fallback for single-workspace SSO setups where tenant/domain hints are unavailable.
  if (!resolvedOrg && !user) {
    const enabledOrgs = await prisma.organization.findMany({
      where: { allowMicrosoftAuth: true, microsoftWorkspaceConnected: true },
      take: 2
    });
    if (enabledOrgs.length === 1) {
      resolvedOrg = enabledOrgs[0];
    }
  }

  if (!user && resolvedOrg) {
    const userCount = await prisma.user.count({ where: { orgId: resolvedOrg.id, licenseActive: true } });
    if (isSeatLimitedPlan(resolvedOrg.plan) && userCount >= resolvedOrg.totalSeats) {
      return renderPopupResult(
        {
          ok: false,
          code: 'LICENSE_REQUIRED',
          error: `No available license seat in ${resolvedOrg.name}. Ask your workspace admin to assign licenses.`,
          orgName: resolvedOrg.name
        },
        'velo-oauth-result',
        state.returnOrigin || frontendOrigin
      );
    }

    const baseUsername = normalizeEmailForUsername(profile.email);
    let username = baseUsername;
    let suffix = 1;
    // Keep username unique within org.
    while (await prisma.user.findFirst({ where: { orgId: resolvedOrg.id, username } })) {
      suffix += 1;
      username = `${baseUsername}-${suffix}`;
    }

    user = await prisma.user.create({
      data: {
        id: createId('usr'),
        orgId: resolvedOrg.id,
        username,
        email: profile.email,
        displayName: profile.name || username,
        role: isMicrosoftGlobalAdmin ? UserRole.admin : UserRole.member,
        licenseActive: true,
        avatar: profile.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(username)}`,
        mustChangePassword: false,
        passwordHash: await hashToken(createId('pwd')),
        [providerSubjectField]: profile.subject
      }
    });

    await writeAudit({
      orgId: resolvedOrg.id,
      userId: user.id,
      actionType: 'auth_login',
      action: `JIT provisioned user ${user.email} via ${input.provider} SSO`,
      entityType: 'user',
      entityId: user.id,
      metadata: { provider: input.provider, roleAssigned: user.role, isMicrosoftGlobalAdmin }
    });
  }

  if (!user) {
    if (stateOrg) {
      await writeAudit({
        orgId: stateOrg.id,
        actionType: 'auth_login',
        action: `OAuth sign-in denied for ${profile.email} (${input.provider})`,
        entityType: 'organization',
        entityId: stateOrg.id,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent
      });
    }

    return renderPopupResult({
      ok: false,
      code: 'USER_NOT_PROVISIONED',
      error: 'Your account is not provisioned in this workspace. Ask an admin to invite or create your user first.'
    });
  }

  if (!user.licenseActive) {
    return renderPopupResult(
      {
        ok: false,
        code: 'LICENSE_REQUIRED',
        error: 'No active license assigned for this account. Ask your workspace admin to assign a license, then retry.'
      },
      'velo-oauth-result',
      state.returnOrigin || frontendOrigin
    );
  }

  if (!user[providerSubjectField as keyof typeof user]) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        [providerSubjectField]: profile.subject,
        avatar: user.avatar || profile.avatar || undefined,
        displayName: user.displayName || profile.name
      }
    });
  }

  if (input.provider === 'microsoft' && isMicrosoftGlobalAdmin && user.role !== UserRole.admin) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { role: UserRole.admin }
    });
    await writeAudit({
      orgId: user.orgId,
      userId: user.id,
      actionType: 'role_changed',
      action: `Auto-promoted ${user.email} to admin from Microsoft Global Admin claim`,
      entityType: 'user',
      entityId: user.id,
      metadata: { provider: 'microsoft', reason: 'global_admin_claim' }
    });
  }

  const tokens = await createSessionForUser({
    user: {
      id: user.id,
      orgId: user.orgId,
      role: user.role
    },
    userAgent: input.userAgent,
    ipAddress: input.ipAddress,
    actionType: 'auth_login'
  });

  return renderPopupResult({
    ok: true,
    tokens,
    user: toPublicUser(user)
  }, 'velo-oauth-result', state.returnOrigin || frontendOrigin);
};
