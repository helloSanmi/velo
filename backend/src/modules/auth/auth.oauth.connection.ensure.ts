import { HttpError } from '../../lib/httpError.js';
import { prisma } from '../../lib/prisma.js';
import type { Provider } from './auth.oauth.types.js';
import { exchangeRefreshToken } from './auth.oauth.connection.refresh.js';
import {
  patchOauthConnectionMetadata,
  toPrismaProvider,
  upsertOrgOauthConnection
} from './auth.oauth.connection.store.js';

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

  const stillValid =
    connection.accessToken &&
    connection.accessTokenExpiresAt &&
    connection.accessTokenExpiresAt.getTime() > Date.now() + 60_000;
  if (stillValid) return connection.accessToken;

  if (!connection.refreshToken) {
    await patchOauthConnectionMetadata({
      orgId: input.orgId,
      provider: input.provider,
      patch: {
        refreshTokenPresent: false,
        lastTokenRefreshAt: new Date().toISOString(),
        lastTokenRefreshStatus: 'reconsent_required',
        lastTokenRefreshError: 'Missing refresh token'
      }
    }).catch(() => {});
    throw new HttpError(409, `${input.provider} connection requires re-consent.`, { code: 'SSO_RECONNECT_REQUIRED' });
  }

  let refreshed: { accessToken: string; refreshToken?: string; expiresInSeconds?: number; scope?: string };
  try {
    refreshed = await exchangeRefreshToken({
      provider: input.provider,
      refreshToken: connection.refreshToken
    });
  } catch (error: any) {
    const details = error instanceof HttpError ? (error as any).details || {} : {};
    await patchOauthConnectionMetadata({
      orgId: input.orgId,
      provider: input.provider,
      patch: {
        refreshTokenPresent: true,
        lastTokenRefreshAt: new Date().toISOString(),
        lastTokenRefreshStatus: details.code === 'SSO_RECONNECT_REQUIRED' ? 'reconsent_required' : 'temporary_failure',
        lastTokenRefreshError: String(details.providerError || error?.message || 'Temporary token refresh failure')
      }
    }).catch(() => {});
    if (details.code === 'SSO_RECONNECT_REQUIRED') throw error;
    const expiredAtMs = connection.accessTokenExpiresAt ? connection.accessTokenExpiresAt.getTime() : 0;
    const staleFallbackWindowMs = 10 * 60 * 1000;
    if (connection.accessToken && expiredAtMs && expiredAtMs > Date.now() - staleFallbackWindowMs) {
      return connection.accessToken;
    }
    throw new HttpError(503, `${input.provider} token refresh is temporarily unavailable. Retry shortly.`, {
      code: 'SSO_REFRESH_TEMPORARY_FAILURE'
    });
  }

  await upsertOrgOauthConnection({
    orgId: input.orgId,
    provider: input.provider,
    accessToken: refreshed.accessToken,
    refreshToken: refreshed.refreshToken,
    expiresInSeconds: refreshed.expiresInSeconds,
    scope: refreshed.scope
  });
  await patchOauthConnectionMetadata({
    orgId: input.orgId,
    provider: input.provider,
    patch: {
      refreshTokenPresent: true,
      lastTokenRefreshAt: new Date().toISOString(),
      lastTokenRefreshStatus: 'ok',
      lastTokenRefreshError: ''
    }
  }).catch(() => {});
  return refreshed.accessToken;
};
