import { Router } from 'express';
import { registerTicketCoreRoutes } from './tickets.routes.core.js';
import { registerTicketPolicyRoutes } from './tickets.routes.policy.js';
import { registerTicketWebhookRoutes } from './tickets.routes.webhook.js';

const router = Router();

registerTicketPolicyRoutes(router);
registerTicketCoreRoutes(router);
registerTicketWebhookRoutes(router);

export const ticketsRoutes = router;

