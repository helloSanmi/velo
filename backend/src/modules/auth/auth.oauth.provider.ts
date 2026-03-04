import jwt from 'jsonwebtoken';
import { HttpError } from '../../lib/httpError.js';
import { env } from '../../config/env.js';
import type { OAuthState, Provider, ProviderProfile } from './auth.oauth.types.js';

export const MICROSOFT_AUTH_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize';
export const MICROSOFT_TOKEN_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
export const MICROSOFT_USERINFO_URL = 'https://graph.microsoft.com/v1.0/me';

export const frontendOrigin = (() => {
  try {
    return new URL(env.FRONTEND_BASE_URL).origin;
  } catch {
    return 'http://localhost:3000';
  }
})();

export const normalizeReturnOrigin = (value?: string): string | undefined => {
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
  return decoded && typeof decoded === 'object' ? (decoded as Record<string, any>) : {};
};

const MICROSOFT_GLOBAL_ADMIN_TEMPLATE_ID = '62e90394-69f5-4237-9190-012177145e10';
const hasMicrosoftGlobalAdminClaim = (claims: Record<string, any>): boolean => {
  const wids = Array.isArray(claims?.wids) ? claims.wids.map((value: unknown) => String(value).toLowerCase()) : [];
  if (wids.includes(MICROSOFT_GLOBAL_ADMIN_TEMPLATE_ID)) return true;
  const roles = Array.isArray(claims?.roles) ? claims.roles.map((value: unknown) => String(value).toLowerCase()) : [];
  return roles.includes('global administrator') || roles.includes('company administrator');
};

export const getMicrosoftAdminClaims = (idToken?: string, accessToken?: string) => {
  const idTokenClaims = decodeJwtClaims(idToken);
  const accessTokenClaims = decodeJwtClaims(accessToken);
  return {
    idTokenClaims,
    accessTokenClaims,
    isMicrosoftGlobalAdmin:
      hasMicrosoftGlobalAdminClaim(idTokenClaims) || hasMicrosoftGlobalAdminClaim(accessTokenClaims),
    microsoftTenantId:
      String(idTokenClaims.tid || accessTokenClaims.tid || '').trim() || null
  };
};

export const normalizeEmailForUsername = (email: string) => {
  const local = email.split('@')[0]?.toLowerCase() || 'user';
  const safe = local.replace(/[^a-z0-9._-]/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '');
  return safe || 'user';
};

export const getProviderConfig = (provider: Provider) => {
  if (!env.MICROSOFT_OAUTH_CLIENT_ID || !env.MICROSOFT_OAUTH_CLIENT_SECRET) {
    throw new HttpError(503, 'Microsoft sign-in is not configured on the server.');
  }
  void provider;
  return {
    clientId: env.MICROSOFT_OAUTH_CLIENT_ID,
    clientSecret: env.MICROSOFT_OAUTH_CLIENT_SECRET,
    redirectUri: env.MICROSOFT_OAUTH_REDIRECT_URI || `${env.APP_BASE_URL}/api/v1/auth/oauth/microsoft/callback`
  };
};

export const signState = (state: OAuthState) =>
  jwt.sign(state, env.JWT_ACCESS_SECRET, { expiresIn: '10m' });

export const verifyState = (state: string): OAuthState => {
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

export const parseProviderProfile = (provider: Provider, raw: any): ProviderProfile => {
  void provider;
  const subject = String(raw?.id || '').trim();
  const email = String(raw?.mail || raw?.userPrincipalName || '').trim().toLowerCase();
  if (!email || !subject) throw new HttpError(401, 'Microsoft account must provide an email and id.');
  return { subject, email, name: String(raw?.displayName || email), avatar: null };
};

export const renderPopupResult = (
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
      try { window.opener.postMessage({ type: messageType, payload: payload }, '*'); } catch (_) {}
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
