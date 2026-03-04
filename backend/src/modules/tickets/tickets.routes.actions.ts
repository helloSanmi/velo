import type { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { requireOrgAccess } from '../../middleware/requireOrgAccess.js';
import {
  addTicketCommentHandler,
  convertTicketHandler,
  deleteTicketHandler
} from './tickets.routes.actions.handlers.js';

export const registerTicketActionRoutes = (router: Router) => {
  router.post('/orgs/:orgId/tickets/:ticketId/comments', authenticate, requireOrgAccess, addTicketCommentHandler);
  router.post('/orgs/:orgId/tickets/:ticketId/convert', authenticate, requireOrgAccess, convertTicketHandler);
  router.delete('/orgs/:orgId/tickets/:ticketId', authenticate, requireOrgAccess, deleteTicketHandler);
};
