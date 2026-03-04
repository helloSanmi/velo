import type { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/authenticate.js';
import {
  buildOauthConnectUrl,
  buildOauthDirectoryUrl,
  buildOauthStartUrl,
  completeOauthCallback,
  getOauthProviderAvailability,
  listDirectoryUsers
} from './auth.oauth.js';

const oauthProviderSchema = z.enum(['microsoft']);

const setOauthPopupHeaders = (res: { setHeader: (name: string, value: string) => void }) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"
  );
};

const buildOauthErrorHtml = (error: unknown) => {
  const errorMessage =
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof (error as { message?: unknown }).message === 'string'
      ? (error as { message: string }).message
      : 'Sign-in failed. Please try again.';
  const payload = JSON.stringify({ ok: false, error: errorMessage }).replace(/</g, '\\u003c');
  return `<!doctype html>
<html><head><meta charset="utf-8" /><title>Velo Sign-in</title></head>
<body>
<script>
(function() {
  var messageType = 'velo-oauth-result';
  var payload = ${payload};
  try {
    if (window.opener) {
      window.opener.postMessage({ type: messageType, payload: payload }, window.location.origin);
      try { window.opener.postMessage({ type: messageType, payload: payload }, '*'); } catch (_) {}
    }
  } catch (_) {}
  setTimeout(function() { window.close(); }, 250);
})();
</script>
</body></html>`;
};

export const registerAuthOauthRoutes = (router: Router) => {
  router.get('/oauth/providers', async (req, res, next) => {
    try {
      const workspaceDomain = z.string().optional().parse(req.query.workspaceDomain);
      const result = await getOauthProviderAvailability(workspaceDomain);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  });

  router.get('/oauth/:provider/start', async (req, res, next) => {
    try {
      const provider = oauthProviderSchema.parse(req.params.provider);
      const workspaceDomain = z.string().optional().parse(req.query.workspaceDomain);
      const returnOrigin = z.string().optional().parse(req.query.returnOrigin);
      const url = await buildOauthStartUrl(provider, workspaceDomain, returnOrigin);
      res.redirect(url);
    } catch (error) {
      next(error);
    }
  });

  router.get('/oauth/:provider/connect-url', authenticate, async (req, res, next) => {
    try {
      const provider = oauthProviderSchema.parse(req.params.provider);
      const workspaceDomain = z.string().optional().parse(req.query.workspaceDomain);
      const returnOrigin = z.string().optional().parse(req.query.returnOrigin);
      const url = await buildOauthConnectUrl({
        provider,
        workspaceDomain,
        returnOrigin,
        actor: {
          userId: req.auth!.userId,
          orgId: req.auth!.orgId,
          role: req.auth!.role
        }
      });
      res.json({ success: true, data: { url } });
    } catch (error) {
      next(error);
    }
  });

  router.get('/oauth/:provider/directory-url', authenticate, async (req, res, next) => {
    try {
      const provider = oauthProviderSchema.parse(req.params.provider);
      const returnOrigin = z.string().optional().parse(req.query.returnOrigin);
      const url = await buildOauthDirectoryUrl({
        provider,
        returnOrigin,
        actor: {
          userId: req.auth!.userId,
          orgId: req.auth!.orgId,
          role: req.auth!.role
        }
      });
      res.json({ success: true, data: { url } });
    } catch (error) {
      next(error);
    }
  });

  router.get('/oauth/:provider/directory', authenticate, async (req, res, next) => {
    try {
      const provider = oauthProviderSchema.parse(req.params.provider);
      const data = await listDirectoryUsers({
        provider,
        actor: {
          userId: req.auth!.userId,
          orgId: req.auth!.orgId,
          role: req.auth!.role
        }
      });
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  });

  router.get('/oauth/:provider/callback', async (req, res) => {
    try {
      setOauthPopupHeaders(res);
      const provider = oauthProviderSchema.parse(req.params.provider);
      const code = z.string().optional().parse(req.query.code);
      const state = z.string().optional().parse(req.query.state);
      const oauthError = z.string().optional().parse(req.query.error);
      const errorDescription = z.string().optional().parse(req.query.error_description);
      const html = await completeOauthCallback({
        provider,
        code,
        state,
        error: oauthError,
        errorDescription,
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip
      });
      res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline';");
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.status(200).send(html);
    } catch (error) {
      const html = buildOauthErrorHtml(error);
      setOauthPopupHeaders(res);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.status(200).send(html);
    }
  });
};

