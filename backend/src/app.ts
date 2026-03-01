import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import { requestContext } from './middleware/requestContext.js';
import { createRateLimitMiddleware } from './middleware/rateLimit.js';
import { apiV1Router } from './routes/index.js';
import { notFound } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';

export const createApp = () => {
  const app = express();
  const configuredOrigins = env.CORS_ORIGIN.split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  app.get('/oauth-popup-complete.html', (_req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Velo OAuth</title>
  </head>
  <body>
    <script>
      (function () {
        var STORAGE_KEY = 'velo_oauth_popup_result';
        var hash = window.location.hash ? window.location.hash.slice(1) : '';
        var params = new URLSearchParams(hash);
        var type = params.get('type') || 'velo-oauth-result';
        var payloadRaw = params.get('payload') || '{}';
        var tsRaw = params.get('ts') || '';
        var ts = Number(tsRaw);
        if (!Number.isFinite(ts)) ts = Date.now();

        var payload;
        try {
          payload = JSON.parse(payloadRaw);
        } catch (_) {
          payload = { ok: false, error: 'Invalid OAuth payload.' };
        }

        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ type: type, payload: payload, ts: ts }));
        } catch (_) {}

        try {
          if (window.opener) {
            window.opener.postMessage({ type: type, payload: payload }, window.location.origin);
            try { window.opener.postMessage({ type: type, payload: payload }, '*'); } catch (_) {}
          }
        } catch (_) {}

        setTimeout(function () { window.close(); }, 250);
      })();
    </script>
    Finalizing sign-in...
  </body>
</html>`);
  });

  app.use(
    helmet({
      // Required for OAuth popup flows that need window.opener postMessage.
      crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' }
    })
  );
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) {
          callback(null, true);
          return;
        }
        if (configuredOrigins.includes(origin)) {
          callback(null, true);
          return;
        }
        let allowedByPattern = false;
        try {
          const parsed = new URL(origin);
          const host = parsed.hostname.toLowerCase();
          allowedByPattern = host.endsWith('.localhost') || host.endsWith('.velo.ai');
        } catch {
          allowedByPattern = false;
        }
        if (allowedByPattern) {
          callback(null, true);
          return;
        }
        callback(new Error('Not allowed by CORS'));
      },
      credentials: true
    })
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
  app.use(requestContext);
  app.use(
    '/api/v1',
    createRateLimitMiddleware({
      windowMs: 60_000,
      maxRequests: 300,
      keyPrefix: 'api',
      message: 'Rate limit exceeded. Please retry shortly.'
    })
  );

  app.use('/api/v1', apiV1Router);

  app.use(notFound);
  app.use(errorHandler);

  return app;
};
