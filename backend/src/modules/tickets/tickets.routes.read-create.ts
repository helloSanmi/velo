import type { Router } from 'express';
import { HttpError } from '../../lib/httpError.js';
import { getBackendPermissionMessage } from '../../lib/accessMessages.js';
import { prisma } from '../../lib/prisma.js';
import { writeAudit } from '../audit/audit.service.js';
import { realtimeGateway } from '../realtime/realtime.gateway.js';
import { ticketsNotificationService } from './tickets.notification.service.js';
import { ticketsStore } from './tickets.store.js';
import { formatTicketCode, toWorkspaceTicketPrefix } from './tickets.reference.js';
import { ticketsPolicyStore } from './tickets.policy.store.js';
import { canAccessProjectTicket, canManageProjectTicket, getProjectMemberIds, getProjectOwnerIds, pickAutoAssignee } from './tickets.access.js';
import { createTicketSchema, orgParamsSchema } from './tickets.routes.schemas.js';
import { authenticate } from '../../middleware/authenticate.js';
import { requireOrgAccess } from '../../middleware/requireOrgAccess.js';

export const registerTicketReadCreateRoutes = (router: Router) => {
  router.get('/orgs/:orgId/tickets', authenticate, requireOrgAccess, async (req, res, next) => {
    try {
      const { orgId } = orgParamsSchema.parse(req.params);
      const rows = await ticketsStore.list(orgId);
      if (req.auth!.role === 'admin') {
        res.json({ success: true, data: rows });
        return;
      }

      const projects = await prisma.project.findMany({
        where: { orgId },
        select: { id: true, ownerId: true, createdBy: true, metadata: true, memberIds: true, isPublic: true }
      });
      const projectById = new Map(projects.map((project) => [project.id, project]));
      const visible = rows.filter((ticket) => {
        if (ticket.requesterUserId === req.auth!.userId) return true;
        if (ticket.assigneeId === req.auth!.userId) return true;
        if (!ticket.projectId) return false;
        const project = projectById.get(ticket.projectId);
        if (!project) return false;
        if (project.isPublic) return true;
        if (getProjectOwnerIds(project).includes(req.auth!.userId)) return true;
        return getProjectMemberIds(project).includes(req.auth!.userId);
      });
      res.json({ success: true, data: visible });
    } catch (error) {
      next(error);
    }
  });

  router.post('/orgs/:orgId/tickets', authenticate, requireOrgAccess, async (req, res, next) => {
    try {
      const { orgId } = orgParamsSchema.parse(req.params);
      const body = createTicketSchema.parse(req.body);
      const canAccessTarget = await canAccessProjectTicket({
        orgId,
        userId: req.auth!.userId,
        role: req.auth!.role,
        projectId: body.projectId,
        requesterUserId: req.auth!.userId
      });
      if (!canAccessTarget) throw new HttpError(403, 'You do not have access to create a ticket for this project.');

      const canManageCreateTarget = await canManageProjectTicket({
        orgId,
        userId: req.auth!.userId,
        role: req.auth!.role,
        projectId: body.projectId
      });
      const requestedNonDefaultStatus = body.status !== 'new';
      const requestedManualAssignee = body.assigneeId !== undefined && body.assigneeId !== null;
      if (!canManageCreateTarget && (requestedNonDefaultStatus || requestedManualAssignee)) {
        throw new HttpError(403, getBackendPermissionMessage('project_owner_or_admin', 'set initial status or assignee when creating tickets'));
      }

      const policy = await ticketsPolicyStore.get(orgId, body.projectId);
      const explicitUnassigned = body.assigneeId === null;
      const autoAssignee = explicitUnassigned
        ? undefined
        : body.assigneeId || (await pickAutoAssignee({ orgId, projectId: body.projectId, policy }));
      const slaHours = policy.slaHours[body.priority];
      const slaDueAt = Date.now() + slaHours * 60 * 60 * 1000;
      const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { name: true } });
      if (!org) throw new HttpError(404, 'Organization not found.');
      const ticketNumber = await ticketsStore.nextTicketNumber(orgId);
      const ticketCode = formatTicketCode(toWorkspaceTicketPrefix(org.name), ticketNumber);
      const created = await ticketsStore.create({
        ...body,
        orgId,
        requesterUserId: req.auth!.userId,
        assigneeId: autoAssignee,
        ticketCode,
        ticketNumber,
        slaDueAt
      });

      await writeAudit({
        orgId,
        userId: req.auth!.userId,
        actionType: 'task_created',
        action: `Created intake ticket ${created.title}`,
        entityType: 'intake_ticket',
        entityId: created.id
      });

      try {
        const actor = await prisma.user.findUnique({
          where: { id: req.auth!.userId },
          select: { displayName: true }
        });
        await ticketsNotificationService.enqueue({
          orgId,
          actorUserId: req.auth!.userId,
          actorName: actor?.displayName || 'User',
          eventType: 'ticket_created',
          ticketAfter: created
        });
        if (created.assigneeId) {
          await ticketsNotificationService.enqueue({
            orgId,
            actorUserId: req.auth!.userId,
            actorName: actor?.displayName || 'User',
            eventType: 'ticket_assigned',
            ticketAfter: created
          });
        }
      } catch {
        // Non-blocking notification path.
      }

      realtimeGateway.publish(orgId, 'TICKETS_UPDATED', { ticketId: created.id, action: 'created' });
      res.status(201).json({ success: true, data: created });
    } catch (error) {
      next(error);
    }
  });
};
