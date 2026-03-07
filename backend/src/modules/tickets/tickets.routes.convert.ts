import type { Router } from 'express';
import { HttpError } from '../../lib/httpError.js';
import { getBackendPermissionMessage } from '../../lib/accessMessages.js';
import { createId } from '../../lib/ids.js';
import { prisma } from '../../lib/prisma.js';
import { writeAudit } from '../audit/audit.service.js';
import { realtimeGateway } from '../realtime/realtime.gateway.js';
import { authenticate } from '../../middleware/authenticate.js';
import { requireOrgAccess } from '../../middleware/requireOrgAccess.js';
import { canManageProjectTicket, requireTicketExists } from './tickets.access.js';
import { getTicketReference } from './tickets.reference.js';
import { convertTicketSchema, ticketParamsSchema } from './tickets.routes.schemas.js';
import { ticketsStore } from './tickets.store.js';

export const registerTicketConvertRoute = (router: Router) => {
  router.post('/orgs/:orgId/tickets/:ticketId/convert', authenticate, requireOrgAccess, async (req, res, next) => {
    try {
      const { orgId, ticketId } = ticketParamsSchema.parse(req.params);
      const body = convertTicketSchema.parse(req.body);
      const ticket = await requireTicketExists(orgId, ticketId);
      const targetProjectId = body.projectId || ticket.projectId;
      if (!targetProjectId) throw new HttpError(400, 'Project is required to convert ticket to task.');
      const canManage = await canManageProjectTicket({
        orgId,
        userId: req.auth!.userId,
        role: req.auth!.role,
        projectId: targetProjectId
      });
      if (!canManage) throw new HttpError(403, getBackendPermissionMessage('project_owner_or_admin', 'convert tickets'));
      const project = await prisma.project.findUnique({ where: { id: targetProjectId }, select: { id: true, orgId: true } });
      if (!project || project.orgId !== orgId) throw new HttpError(404, 'Project not found.');

      const task = await prisma.task.create({
        data: {
          id: createId('task'),
          orgId,
          projectId: project.id,
          createdBy: req.auth!.userId,
          title: ticket.title,
          description: ticket.description,
          status: body.status,
          priority: ticket.priority === 'urgent' ? 'High' : `${ticket.priority.charAt(0).toUpperCase()}${ticket.priority.slice(1)}`,
          assigneeIds: ticket.assigneeId ? [ticket.assigneeId] : [],
          tags: ticket.tags || [],
          subtasks: [],
          comments: [],
          auditLog: [
            {
              id: createId('audit'),
              userId: req.auth!.userId,
              displayName: 'System',
              action: `created from ticket ${getTicketReference(ticket)}`,
              timestamp: Date.now()
            }
          ]
        }
      });

      const updated = await ticketsStore.update(orgId, ticketId, {
        status: 'converted',
        convertedTaskId: task.id,
        convertedProjectId: project.id,
        convertedAt: Date.now(),
        convertedBy: req.auth!.userId
      });
      if (!updated) throw new HttpError(404, 'Ticket not found.');

      await writeAudit({
        orgId,
        userId: req.auth!.userId,
        actionType: 'task_created',
        action: `Converted ticket ${ticket.title} to task`,
        entityType: 'intake_ticket',
        entityId: ticket.id,
        metadata: { taskId: task.id, projectId: project.id, ticketReference: getTicketReference(ticket) }
      });
      realtimeGateway.publish(orgId, 'TICKETS_UPDATED', { ticketId: updated.id, action: 'converted', taskId: task.id });
      realtimeGateway.publish(orgId, 'TASKS_UPDATED', { taskId: task.id, action: 'created', projectId: project.id });
      res.status(201).json({ success: true, data: { ticket: updated, taskId: task.id } });
    } catch (error) {
      next(error);
    }
  });
};
