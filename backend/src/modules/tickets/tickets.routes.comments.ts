import type { Router } from 'express';
import { HttpError } from '../../lib/httpError.js';
import { createId } from '../../lib/ids.js';
import { prisma } from '../../lib/prisma.js';
import { writeAudit } from '../audit/audit.service.js';
import { realtimeGateway } from '../realtime/realtime.gateway.js';
import { authenticate } from '../../middleware/authenticate.js';
import { requireOrgAccess } from '../../middleware/requireOrgAccess.js';
import { canAccessProjectTicket, requireTicketExists } from './tickets.access.js';
import { ticketsNotificationService } from './tickets.notification.service.js';
import { commentSchema, ticketParamsSchema } from './tickets.routes.schemas.js';
import { ticketsStore } from './tickets.store.js';

export const registerTicketCommentRoute = (router: Router) => {
  router.post('/orgs/:orgId/tickets/:ticketId/comments', authenticate, requireOrgAccess, async (req, res, next) => {
    try {
      const { orgId, ticketId } = ticketParamsSchema.parse(req.params);
      const body = commentSchema.parse(req.body);
      const ticket = await requireTicketExists(orgId, ticketId);
      const canAccess = await canAccessProjectTicket({
        orgId,
        userId: req.auth!.userId,
        role: req.auth!.role,
        projectId: ticket.projectId,
        requesterUserId: ticket.requesterUserId,
        assigneeId: ticket.assigneeId
      });
      if (!canAccess) throw new HttpError(403, 'You do not have access to this ticket.');

      const actor = await prisma.user.findUnique({
        where: { id: req.auth!.userId },
        select: { id: true, displayName: true }
      });
      const commentText = body.text.trim();
      const nextComments = [
        ...(ticket.comments || []),
        {
          id: createId('cmt'),
          userId: req.auth!.userId,
          userName: actor?.displayName || 'User',
          text: commentText,
          createdAt: Date.now()
        }
      ];
      const updated = await ticketsStore.update(orgId, ticketId, { comments: nextComments });
      if (!updated) throw new HttpError(404, 'Ticket not found.');

      await writeAudit({
        orgId,
        userId: req.auth!.userId,
        actionType: 'task_updated',
        action: `Commented on intake ticket ${ticket.title}`,
        entityType: 'intake_ticket',
        entityId: ticket.id
      });

      try {
        await ticketsNotificationService.enqueue({
          orgId,
          actorUserId: req.auth!.userId,
          actorName: actor?.displayName || 'User',
          eventType: 'ticket_commented',
          ticketBefore: ticket,
          ticketAfter: updated,
          commentText
        });
      } catch {
        // Non-blocking notification path.
      }

      realtimeGateway.publish(orgId, 'TICKETS_UPDATED', { ticketId: updated.id, action: 'commented' });
      res.status(201).json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  });
};
