import type { Router } from 'express';
import { HttpError } from '../../lib/httpError.js';
import { writeAudit } from '../audit/audit.service.js';
import { realtimeGateway } from '../realtime/realtime.gateway.js';
import { authenticate } from '../../middleware/authenticate.js';
import { requireOrgAccess } from '../../middleware/requireOrgAccess.js';
import { canManageProjectTicket, requireTicketExists } from './tickets.access.js';
import { ticketParamsSchema } from './tickets.routes.schemas.js';
import { ticketsStore } from './tickets.store.js';

export const registerTicketDeleteRoute = (router: Router) => {
  router.delete('/orgs/:orgId/tickets/:ticketId', authenticate, requireOrgAccess, async (req, res, next) => {
    try {
      const { orgId, ticketId } = ticketParamsSchema.parse(req.params);
      const ticket = await requireTicketExists(orgId, ticketId);
      const canManage = await canManageProjectTicket({
        orgId,
        userId: req.auth!.userId,
        role: req.auth!.role,
        projectId: ticket.projectId
      });
      if (!canManage) throw new HttpError(403, 'Only project owners/admins can delete tickets.');
      await ticketsStore.remove(orgId, ticketId);
      await writeAudit({
        orgId,
        userId: req.auth!.userId,
        actionType: 'task_deleted',
        action: `Deleted intake ticket ${ticket.title}`,
        entityType: 'intake_ticket',
        entityId: ticket.id
      });
      realtimeGateway.publish(orgId, 'TICKETS_UPDATED', { ticketId: ticket.id, action: 'deleted' });
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });
};
