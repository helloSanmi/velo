import { HttpError } from '../../lib/httpError.js';
import { getProviderConfig, MICROSOFT_TOKEN_URL } from './auth.oauth.provider.js';
import type { Provider } from './auth.oauth.types.js';

export const exchangeRefreshToken = async (input: {
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
  if (!response.ok) {
    const payload = await response.json().catch(() => ({} as Record<string, unknown>));
    const providerError = String(payload?.error || '').toLowerCase();
    const providerDescription = String(payload?.error_description || '').trim();
    if (providerError === 'invalid_grant') {
      throw new HttpError(409, `${input.provider} connection requires re-consent.`, {
        code: 'SSO_RECONNECT_REQUIRED',
        providerError,
        providerDescription
      });
    }
    if (providerError === 'unauthorized_client' || providerError === 'invalid_client') {
      throw new HttpError(503, `${input.provider} OAuth app credentials are invalid or expired on server.`, {
        code: 'SSO_PROVIDER_CONFIG_ERROR',
        providerError,
        providerDescription
      });
    }
    throw new HttpError(503, `Could not refresh ${input.provider} token right now.`, {
      code: 'SSO_REFRESH_TEMPORARY_FAILURE',
      providerError,
      providerDescription,
      status: response.status
    });
  }
  const json = (await response.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
  };
  if (!json.access_token) {
    throw new HttpError(503, `Could not refresh ${input.provider} token right now.`, {
      code: 'SSO_REFRESH_TEMPORARY_FAILURE'
    });
  }
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresInSeconds: typeof json.expires_in === 'number' ? json.expires_in : undefined,
    scope: json.scope
  };
};
