import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/authenticate.js';
import { requireOrgAccess } from '../../middleware/requireOrgAccess.js';
import { realtimeGateway } from './realtime.gateway.js';
import { createId } from '../../lib/ids.js';

const router = Router();

const querySchema = z.object({ orgId: z.string().min(1) });

router.get('/events', authenticate, requireOrgAccess, (req, res, next) => {
  try {
    const { orgId } = querySchema.parse(req.query);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const clientId = createId('sse');
    const write = (line: string): void => {
      res.write(line);
    };
    realtimeGateway.attachSseClient(orgId, clientId, write);

    res.write(`data: ${JSON.stringify({ type: 'connected', orgId, timestamp: Date.now() })}\n\n`);

    req.on('close', () => {
      realtimeGateway.detachSseClient(orgId, clientId);
    });
  } catch (error) {
    next(error);
  }
});

export const realtimeRoutes = router;
