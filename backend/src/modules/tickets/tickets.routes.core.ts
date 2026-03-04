import type { Router } from 'express';
import { registerTicketReadCreateRoutes } from './tickets.routes.read-create.js';
import { registerTicketMutationRoutes } from './tickets.routes.mutations.js';

export const registerTicketCoreRoutes = (router: Router) => {
  registerTicketReadCreateRoutes(router);
  registerTicketMutationRoutes(router);
};

