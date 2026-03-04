import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { HttpError } from '../../lib/httpError.js';
import type { IntegrationState } from './integrations.oauth.types.js';

const frontendOrigin = (() => {
  try {
    return new URL(env.FRONTEND_BASE_URL).origin;
  } catch {
    return 'http://localhost:3000';
  }
})();

export const getFrontendOrigin = () => frontendOrigin;

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

export const signState = (state: IntegrationState) =>
  jwt.sign(state, env.JWT_ACCESS_SECRET, { expiresIn: '10m' });

export const verifyState = (state: string): IntegrationState => {
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

export const renderPopupResult = (
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

