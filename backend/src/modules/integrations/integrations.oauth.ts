import jwt from 'jsonwebtoken';
import { UserRole } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { env } from '../../config/env.js';
import { HttpError } from '../../lib/httpError.js';
import { createId } from '../../lib/ids.js';
import { writeAudit } from '../audit/audit.service.js';

type IntegrationProvider = 'slack' | 'github';

type IntegrationState = {
  provider: IntegrationProvider;
  orgId: string;
  actorUserId: string;
  returnOrigin?: string;
  nonce: string;
};

const SLACK_AUTH_URL = 'https://slack.com/oauth/v2/authorize';
const SLACK_TOKEN_URL = 'https://slack.com/api/oauth.v2.access';
const GITHUB_AUTH_URL = 'https://github.com/login/oauth/authorize';
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';
const GITHUB_USER_URL = 'https://api.github.com/user';

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

const signState = (state: IntegrationState) =>
  jwt.sign(state, env.JWT_ACCESS_SECRET, { expiresIn: '10m' });

const verifyState = (state: string): IntegrationState => {
  try {
    const decoded = jwt.verify(state, env.JWT_ACCESS_SECRET) as IntegrationState;
    if (!decoded?.provider || !decoded?.orgId || !decoded?.actorUserId || !decoded?.nonce) {
      throw new Error('invalid_state_shape');
    }
    return decoded;
  } catch {
    throw new HttpError(400, 'Invalid or expired integration OAuth state. Please retry.');
  }
};

const renderPopupResult = (
  payload: Record<string, unknown>,
  messageType = 'velo-integration-connect-result',
  targetOrigin = frontendOrigin
) => {
  const serialized = JSON.stringify(payload).replace(/</g, '\\u003c');
  const serializedType = JSON.stringify(messageType);
  const serializedTarget = JSON.stringify(targetOrigin);
  return `<!doctype html>
<html><head><meta charset="utf-8" /><title>Velo Integration</title></head>
<body>
<script>
(function() {
  var messageType = ${serializedType};
  var targetOrigin = ${serializedTarget};
  var payload = ${serialized};
  try {
    if (window.opener) {
      window.opener.postMessage({ type: messageType, payload: payload }, targetOrigin);
      try { window.opener.postMessage({ type: messageType, payload: payload }, '*'); } catch (_) {}
    }
  } catch (_) {}
  try {
    var hash = 'type=' + encodeURIComponent(messageType) + '&payload=' + encodeURIComponent(JSON.stringify(payload)) + '&ts=' + encodeURIComponent(String(Date.now()));
    window.location.replace(targetOrigin + '/oauth-popup-complete.html#' + hash);
    return;
  } catch (_) {}
  setTimeout(function () { window.close(); }, 400);
})();
</script>
Connecting integration...
</body></html>`;
};

const toPrismaProvider = (provider: IntegrationProvider): 'slack' | 'github' =>
  provider === 'slack' ? 'slack' : 'github';

const getProviderConfig = (provider: IntegrationProvider) => {
  if (provider === 'slack') {
    if (!env.SLACK_CLIENT_ID || !env.SLACK_CLIENT_SECRET) {
      throw new HttpError(503, 'Slack integration is not configured on server.');
    }
    return {
      clientId: env.SLACK_CLIENT_ID,
      clientSecret: env.SLACK_CLIENT_SECRET,
      redirectUri: env.SLACK_OAUTH_REDIRECT_URI || `${env.APP_BASE_URL}/api/v1/integrations/slack/callback`
    };
  }
  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
    throw new HttpError(503, 'GitHub integration is not configured on server.');
  }
  return {
    clientId: env.GITHUB_CLIENT_ID,
    clientSecret: env.GITHUB_CLIENT_SECRET,
    redirectUri: env.GITHUB_OAUTH_REDIRECT_URI || `${env.APP_BASE_URL}/api/v1/integrations/github/callback`
  };
};

export const buildIntegrationConnectUrl = async (input: {
  provider: IntegrationProvider;
  actor: { userId: string; orgId: string; role: UserRole };
  returnOrigin?: string;
}) => {
  if (input.actor.role !== 'admin') {
    throw new HttpError(403, 'Only workspace admins can connect integrations.');
  }
  const config = getProviderConfig(input.provider);
  const safeReturnOrigin = normalizeReturnOrigin(input.returnOrigin);
  const state = signState({
    provider: input.provider,
    orgId: input.actor.orgId,
    actorUserId: input.actor.userId,
    returnOrigin: safeReturnOrigin,
    nonce: createId('nonce')
  });

  if (input.provider === 'slack') {
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      scope: 'chat:write,channels:read,groups:read',
      state
    });
    return `${SLACK_AUTH_URL}?${params.toString()}`;
  }

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: 'repo read:user',
    state
  });
  return `${GITHUB_AUTH_URL}?${params.toString()}`;
};

export const listIntegrationConnections = async (input: { orgId: string }) => {
  const rows = await (prisma as any).organizationOAuthConnection.findMany({
    where: {
      orgId: input.orgId,
      provider: { in: ['slack', 'github'] }
    },
    select: {
      provider: true,
      metadata: true,
      updatedAt: true
    }
  });

  const base = {
    slack: { connected: false, updatedAt: null as string | null, accountLabel: null as string | null },
    github: { connected: false, updatedAt: null as string | null, accountLabel: null as string | null }
  };

  for (const row of rows) {
    const provider = String(row.provider) as 'slack' | 'github';
    const metadata = row.metadata && typeof row.metadata === 'object' ? (row.metadata as Record<string, unknown>) : {};
    base[provider] = {
      connected: true,
      updatedAt: row.updatedAt ? row.updatedAt.toISOString() : null,
      accountLabel:
        provider === 'slack'
          ? (typeof metadata.teamName === 'string' ? metadata.teamName : null)
          : (typeof metadata.login === 'string' ? metadata.login : null)
    };
  }

  return base;
};

export const completeIntegrationOauthCallback = async (input: {
  provider: IntegrationProvider;
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
      provider: input.provider,
      error: input.errorDescription || input.error
    });
  }
  if (!input.code || !input.state) {
    throw new HttpError(400, 'Missing integration OAuth code/state.');
  }

  const state = verifyState(input.state);
  if (state.provider !== input.provider) {
    throw new HttpError(400, 'Integration provider/state mismatch.');
  }

  const actor = await prisma.user.findUnique({
    where: { id: state.actorUserId },
    select: { id: true, orgId: true, role: true }
  });
  if (!actor || actor.orgId !== state.orgId || actor.role !== 'admin') {
    return renderPopupResult({ ok: false, provider: input.provider, error: 'Admin session invalid. Retry from settings.' });
  }

  const config = getProviderConfig(input.provider);
  let accessToken: string | undefined;
  let refreshToken: string | undefined;
  let expiresIn: number | undefined;
  let scope: string | undefined;
  let metadata: Record<string, unknown> = {};

  if (input.provider === 'slack') {
    const params = new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code: input.code,
      redirect_uri: config.redirectUri
    });
    const response = await fetch(SLACK_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });
    const payload = await response.json() as any;
    if (!response.ok || payload.ok !== true || !payload.access_token) {
      return renderPopupResult({
        ok: false,
        provider: input.provider,
        error: String(payload?.error || 'Slack OAuth exchange failed.')
      });
    }
    accessToken = String(payload.access_token);
    scope = String(payload.scope || '');
    metadata = {
      teamId: payload.team?.id ? String(payload.team.id) : undefined,
      teamName: payload.team?.name ? String(payload.team.name) : undefined
    };
  } else {
    const params = new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code: input.code,
      redirect_uri: config.redirectUri
    });
    const tokenResponse = await fetch(GITHUB_TOKEN_URL, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });
    const tokenPayload = await tokenResponse.json() as any;
    if (!tokenResponse.ok || !tokenPayload.access_token) {
      return renderPopupResult({
        ok: false,
        provider: input.provider,
        error: String(tokenPayload?.error_description || tokenPayload?.error || 'GitHub OAuth exchange failed.')
      });
    }
    accessToken = String(tokenPayload.access_token);
    scope = typeof tokenPayload.scope === 'string' ? tokenPayload.scope : undefined;

    const userResponse = await fetch(GITHUB_USER_URL, {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${accessToken}`
      }
    });
    const userPayload = await userResponse.json() as any;
    metadata = {
      login: userPayload?.login ? String(userPayload.login) : undefined,
      githubUserId: userPayload?.id ? String(userPayload.id) : undefined
    };
  }

  const accessTokenExpiresAt = expiresIn ? new Date(Date.now() + Math.max(30, expiresIn - 30) * 1000) : null;
  await (prisma as any).organizationOAuthConnection.upsert({
    where: {
      orgId_provider: {
        orgId: state.orgId,
        provider: toPrismaProvider(input.provider)
      }
    },
    create: {
      id: createId('oauth'),
      orgId: state.orgId,
      provider: toPrismaProvider(input.provider),
      accessToken: accessToken || null,
      refreshToken: refreshToken || null,
      accessTokenExpiresAt,
      scope: scope || null,
      metadata
    },
    update: {
      accessToken: accessToken || null,
      refreshToken: refreshToken || null,
      accessTokenExpiresAt,
      scope: scope || null,
      metadata
    }
  });

  await writeAudit({
    orgId: state.orgId,
    userId: actor.id,
    actionType: 'project_updated',
    action: `${input.provider === 'slack' ? 'Slack' : 'GitHub'} integration connected for workspace.`,
    entityType: 'organization',
    entityId: state.orgId,
    metadata: {
      provider: input.provider,
      ...metadata
    },
    ipAddress: input.ipAddress,
    userAgent: input.userAgent
  });

  return renderPopupResult(
    {
      ok: true,
      provider: input.provider
    },
    'velo-integration-connect-result',
    state.returnOrigin || frontendOrigin
  );
};

