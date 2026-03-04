import type { Router } from 'express';
import { HttpError } from '../../lib/httpError.js';
import { prisma } from '../../lib/prisma.js';
import { writeAudit } from '../audit/audit.service.js';
import { realtimeGateway } from '../realtime/realtime.gateway.js';
import { ticketsNotificationService } from './tickets.notification.service.js';
import { ticketsStore } from './tickets.store.js';
import { canManageProjectTicket, requireTicketExists } from './tickets.access.js';
import { ticketParamsSchema, updateTicketSchema } from './tickets.routes.schemas.js';
import { authenticate } from '../../middleware/authenticate.js';
import { requireOrgAccess } from '../../middleware/requireOrgAccess.js';

export const registerTicketUpdateRoute = (router: Router) => {
  router.patch('/orgs/:orgId/tickets/:ticketId', authenticate, requireOrgAccess, async (req, res, next) => {
    try {
      const { orgId, ticketId } = ticketParamsSchema.parse(req.params);
      const patch = updateTicketSchema.parse(req.body);
      const existing = await requireTicketExists(orgId, ticketId);
      const canManage = await canManageProjectTicket({
        orgId,
        userId: req.auth!.userId,
        role: req.auth!.role,
        projectId: patch.projectId || existing.projectId
      });
      const isRequester = existing.requesterUserId === req.auth!.userId;
      const isSimplePatch =
        patch.title !== undefined ||
        patch.description !== undefined ||
        patch.tags !== undefined ||
        patch.requesterName !== undefined ||
        patch.requesterEmail !== undefined;
      if (!canManage && !(isRequester && isSimplePatch)) {
        throw new HttpError(403, 'Only project owners/admins can triage or reassign tickets.');
      }

      const now = Date.now();
      const needsFirstResponseAt = patch.status === 'triaged' && !existing.firstResponseAt;
      const needsResolvedAt = (patch.status === 'resolved' || patch.status === 'closed') && !existing.resolvedAt;
      const updated = await ticketsStore.update(orgId, ticketId, {
        ...patch,
        assigneeId: patch.assigneeId === null ? undefined : patch.assigneeId,
        startedAt: patch.startedAt === null ? undefined : patch.startedAt,
        firstResponseAt: needsFirstResponseAt ? now : existing.firstResponseAt,
        resolvedAt: needsResolvedAt ? now : existing.resolvedAt
      });
      if (!updated) throw new HttpError(404, 'Ticket not found.');

      await writeAudit({
        orgId,
        userId: req.auth!.userId,
        actionType: 'task_updated',
        action: `Updated intake ticket ${updated.title}`,
        entityType: 'intake_ticket',
        entityId: updated.id
      });

      try {
        const actor = await prisma.user.findUnique({
          where: { id: req.auth!.userId },
          select: { displayName: true }
        });
        const changedAssignee = existing.assigneeId !== updated.assigneeId;
        const changedStatus = existing.status !== updated.status;
        if (changedAssignee) {
          await ticketsNotificationService.enqueue({
            orgId,
            actorUserId: req.auth!.userId,
            actorName: actor?.displayName || 'User',
            eventType: 'ticket_assigned',
            ticketBefore: existing,
            ticketAfter: updated
          });
        }
        if (changedStatus) {
          await ticketsNotificationService.enqueue({
            orgId,
            actorUserId: req.auth!.userId,
            actorName: actor?.displayName || 'User',
            eventType: 'ticket_status_changed',
            ticketBefore: existing,
            ticketAfter: updated
          });
        }
      } catch {
        // Non-blocking notification path.
      }

      realtimeGateway.publish(orgId, 'TICKETS_UPDATED', { ticketId: updated.id, action: 'updated' });
      res.json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  });
};
