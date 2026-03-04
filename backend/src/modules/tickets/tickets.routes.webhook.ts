import type { Router } from 'express';
import { ticketsGraphService } from './tickets.graph.service.js';

export const registerTicketWebhookRoutes = (router: Router) => {
  router.get('/integrations/microsoft/graph/webhook', async (req, res) => {
    const token = typeof req.query.validationToken === 'string' ? req.query.validationToken : '';
    if (token) {
      res.setHeader('Content-Type', 'text/plain');
      res.status(200).send(token);
      return;
    }
    res.status(200).send('ok');
  });

  router.post('/integrations/microsoft/graph/webhook', async (req, res, next) => {
    try {
      const body = req.body as { value?: Array<{ clientState?: string }> } | undefined;
      const notifications = Array.isArray(body?.value) ? body!.value : [];
      const orgIds = await ticketsGraphService.extractValidatedOrgIdsFromWebhookNotifications({ notifications });
      for (const orgId of orgIds) {
        await ticketsGraphService.recordWebhookHit({ orgId });
        await ticketsGraphService.syncMailDelta({ orgId });
      }
      res.status(202).json({ success: true });
    } catch (error) {
      next(error);
    }
  });
};

