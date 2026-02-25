import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/authenticate.js';
import {
  buildIntegrationConnectUrl,
  completeIntegrationOauthCallback,
  listIntegrationConnections
} from './integrations.oauth.js';

const router = Router();
const providerSchema = z.enum(['slack', 'github']);

router.get('/integrations/connections', authenticate, async (req, res, next) => {
  try {
    const data = await listIntegrationConnections({ orgId: req.auth!.orgId });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.get('/integrations/:provider/connect-url', authenticate, async (req, res, next) => {
  try {
    const provider = providerSchema.parse(req.params.provider);
    const returnOrigin = z.string().optional().parse(req.query.returnOrigin);
    const url = await buildIntegrationConnectUrl({
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

router.get('/integrations/:provider/callback', async (req, res, next) => {
  try {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
    res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';");

    const provider = providerSchema.parse(req.params.provider);
    const code = z.string().optional().parse(req.query.code);
    const state = z.string().optional().parse(req.query.state);
    const oauthError = z.string().optional().parse(req.query.error);
    const errorDescription = z.string().optional().parse(req.query.error_description);
    const html = await completeIntegrationOauthCallback({
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
    next(error);
  }
});

export const integrationsRoutes = router;

