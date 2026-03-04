import { env } from '../../config/env.js';
import { HttpError } from '../../lib/httpError.js';
import { ensureProviderAccessToken } from '../auth/auth.oauth.js';
import type { GraphAuthContext } from './tickets.graph.types.js';
import { resolveConnection } from './tickets.graph.connection.js';

const MICROSOFT_TOKEN_BASE = 'https://login.microsoftonline.com';
const APP_ONLY_SCOPE = 'https://graph.microsoft.com/.default';
const appOnlyTokenCache = new Map<string, { accessToken: string; expiresAtMs: number }>();

const getAppOnlyGraphToken = async (input: { tenantId: string }): Promise<string> => {
  const tenantId = String(input.tenantId || '').trim();
  if (!tenantId) throw new HttpError(503, 'Microsoft tenant id is required for app-only Graph access.');
  const cached = appOnlyTokenCache.get(tenantId);
  if (cached && cached.expiresAtMs > Date.now() + 60_000) return cached.accessToken;

  if (!env.MICROSOFT_OAUTH_CLIENT_ID || !env.MICROSOFT_OAUTH_CLIENT_SECRET) {
    throw new HttpError(503, 'Microsoft OAuth app credentials are missing on server.');
  }

  const params = new URLSearchParams({
    client_id: env.MICROSOFT_OAUTH_CLIENT_ID,
    client_secret: env.MICROSOFT_OAUTH_CLIENT_SECRET,
    grant_type: 'client_credentials',
    scope: APP_ONLY_SCOPE
  });
  const response = await fetch(`${MICROSOFT_TOKEN_BASE}/${encodeURIComponent(tenantId)}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({} as Record<string, unknown>));
    throw new HttpError(503, 'Microsoft Graph app-only token request failed.', {
      code: 'GRAPH_APP_ONLY_TOKEN_FAILED',
      providerError: String(payload?.error || ''),
      providerDescription: String(payload?.error_description || ''),
      status: response.status
    });
  }
  const token = await response.json() as { access_token?: string; expires_in?: number };
  if (!token.access_token) {
    throw new HttpError(503, 'Microsoft Graph app-only token response had no access token.', {
      code: 'GRAPH_APP_ONLY_TOKEN_FAILED'
    });
  }
  const expiresIn = Math.max(60, Number(token.expires_in || 3600));
  appOnlyTokenCache.set(tenantId, {
    accessToken: token.access_token,
    expiresAtMs: Date.now() + Math.max(60, expiresIn - 60) * 1000
  });
  return token.access_token;
};

export const resolveGraphAuthContext = async (input: { orgId: string }): Promise<GraphAuthContext> => {
  const { org } = await resolveConnection(input.orgId);
  const appOnlyEnabled = Boolean(env.MICROSOFT_GRAPH_APP_ONLY_ENABLED);
  const appOnlyStrict = Boolean(env.MICROSOFT_GRAPH_APP_ONLY_STRICT);
  const tenantId = String(org.microsoftTenantId || '').trim();
  if (appOnlyEnabled && tenantId) {
    try {
      const accessToken = await getAppOnlyGraphToken({ tenantId });
      return { accessToken, mode: 'app_only', tenantId };
    } catch (error: any) {
      if (appOnlyStrict) {
        throw new HttpError(503, `Microsoft Graph app-only auth is required but failed for tenant ${tenantId}.`, {
          code: 'GRAPH_APP_ONLY_STRICT_FAILURE',
          cause: String(error?.message || 'App-only auth failed')
        });
      }
    }
  } else if (appOnlyStrict) {
    throw new HttpError(503, 'Microsoft Graph app-only strict mode is enabled but tenant id is missing on workspace.', {
      code: 'GRAPH_APP_ONLY_STRICT_FAILURE'
    });
  }
  const accessToken = await ensureProviderAccessToken({ orgId: input.orgId, provider: 'microsoft' });
  return { accessToken, mode: 'delegated', tenantId: tenantId || undefined };
};
