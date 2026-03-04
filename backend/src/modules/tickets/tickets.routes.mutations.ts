import type { Router } from 'express';
import { registerTicketCommentRoute } from './tickets.routes.comments.js';
import { registerTicketConvertRoute } from './tickets.routes.convert.js';
import { registerTicketDeleteRoute } from './tickets.routes.delete.js';
import { registerTicketUpdateRoute } from './tickets.routes.update.js';

export const registerTicketMutationRoutes = (router: Router) => {
  registerTicketUpdateRoute(router);
  registerTicketCommentRoute(router);
  registerTicketConvertRoute(router);
  registerTicketDeleteRoute(router);
};
