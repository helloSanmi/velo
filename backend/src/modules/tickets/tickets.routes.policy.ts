import type { Router } from 'express';
import { requireOrgAccess } from '../../middleware/requireOrgAccess.js';
import { authenticate } from '../../middleware/authenticate.js';
import {
  getTicketNotificationPolicyHandler,
  getTicketNotificationSetupScriptHandler,
  getTicketPolicyHandler,
  patchTicketNotificationPolicyHandler,
  patchTicketPolicyHandler,
  postTicketNotificationPreflightHandler
} from './tickets.routes.policy.handlers.js';

const withRoute =
  (handler: (req: any, res: any) => Promise<void>) =>
  async (req: any, res: any, next: any) => {
    try {
      await handler(req, res);
    } catch (error) {
      next(error);
    }
  };

export const registerTicketPolicyRoutes = (router: Router) => {
  router.get('/orgs/:orgId/tickets/policy', authenticate, requireOrgAccess, withRoute(getTicketPolicyHandler));
  router.patch('/orgs/:orgId/tickets/policy', authenticate, requireOrgAccess, withRoute(patchTicketPolicyHandler));
  router.get('/orgs/:orgId/tickets/notifications/policy', authenticate, requireOrgAccess, withRoute(getTicketNotificationPolicyHandler));
  router.patch('/orgs/:orgId/tickets/notifications/policy', authenticate, requireOrgAccess, withRoute(patchTicketNotificationPolicyHandler));
  router.post('/orgs/:orgId/tickets/notifications/preflight', authenticate, requireOrgAccess, withRoute(postTicketNotificationPreflightHandler));
  router.get('/orgs/:orgId/tickets/notifications/setup-script', authenticate, requireOrgAccess, withRoute(getTicketNotificationSetupScriptHandler));
};
