import type { IntegrationProvider } from './integrations.oauth.types.js';
import { env } from '../../config/env.js';
import { HttpError } from '../../lib/httpError.js';

const SLACK_AUTH_URL = 'https://slack.com/oauth/v2/authorize';
const SLACK_TOKEN_URL = 'https://slack.com/api/oauth.v2.access';
const GITHUB_AUTH_URL = 'https://github.com/login/oauth/authorize';
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';
const GITHUB_USER_URL = 'https://api.github.com/user';

export const toPrismaProvider = (provider: IntegrationProvider): 'slack' | 'github' =>
  provider === 'slack' ? 'slack' : 'github';

export const getProviderConfig = (provider: IntegrationProvider) => {
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

export const buildProviderAuthorizeUrl = (input: {
  provider: IntegrationProvider;
  state: string;
  clientId: string;
  redirectUri: string;
}) => {
  if (input.provider === 'slack') {
    const params = new URLSearchParams({
      client_id: input.clientId,
      redirect_uri: input.redirectUri,
      scope: 'chat:write,channels:read,groups:read',
      state: input.state
    });
    return `${SLACK_AUTH_URL}?${params.toString()}`;
  }
  const params = new URLSearchParams({
    client_id: input.clientId,
    redirect_uri: input.redirectUri,
    scope: 'repo read:user',
    state: input.state
  });
  return `${GITHUB_AUTH_URL}?${params.toString()}`;
};

export const exchangeOauthCode = async (input: {
  provider: IntegrationProvider;
  code: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}): Promise<{
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  scope?: string;
  metadata: Record<string, unknown>;
}> => {
  if (input.provider === 'slack') {
    const params = new URLSearchParams({
      client_id: input.clientId,
      client_secret: input.clientSecret,
      code: input.code,
      redirect_uri: input.redirectUri
    });
    const response = await fetch(SLACK_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });
    const payload = (await response.json()) as any;
    if (!response.ok || payload.ok !== true || !payload.access_token) {
      throw new HttpError(400, String(payload?.error || 'Slack OAuth exchange failed.'));
    }
    return {
      accessToken: String(payload.access_token),
      scope: String(payload.scope || ''),
      metadata: {
        teamId: payload.team?.id ? String(payload.team.id) : undefined,
        teamName: payload.team?.name ? String(payload.team.name) : undefined
      }
    };
  }

  const params = new URLSearchParams({
    client_id: input.clientId,
    client_secret: input.clientSecret,
    code: input.code,
    redirect_uri: input.redirectUri
  });
  const tokenResponse = await fetch(GITHUB_TOKEN_URL, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  });
  const tokenPayload = (await tokenResponse.json()) as any;
  if (!tokenResponse.ok || !tokenPayload.access_token) {
    throw new HttpError(
      400,
      String(tokenPayload?.error_description || tokenPayload?.error || 'GitHub OAuth exchange failed.')
    );
  }

  const accessToken = String(tokenPayload.access_token);
  const userResponse = await fetch(GITHUB_USER_URL, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${accessToken}`
    }
  });
  const userPayload = (await userResponse.json()) as any;
  return {
    accessToken,
    scope: typeof tokenPayload.scope === 'string' ? tokenPayload.scope : undefined,
    metadata: {
      login: userPayload?.login ? String(userPayload.login) : undefined,
      githubUserId: userPayload?.id ? String(userPayload.id) : undefined
    }
  };
};

