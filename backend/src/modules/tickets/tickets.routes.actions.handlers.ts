import type { RequestHandler } from 'express';
import { HttpError } from '../../lib/httpError.js';
import { createId } from '../../lib/ids.js';
import { prisma } from '../../lib/prisma.js';
import { writeAudit } from '../audit/audit.service.js';
import { realtimeGateway } from '../realtime/realtime.gateway.js';
import { ticketsNotificationService } from './tickets.notification.service.js';
import { ticketsStore } from './tickets.store.js';
import { getTicketReference } from './tickets.reference.js';
import { canAccessProjectTicket, canManageProjectTicket, requireTicketExists } from './tickets.access.js';
import { commentSchema, convertTicketSchema, ticketParamsSchema } from './tickets.routes.schemas.js';

const withRoute =
  (handler: RequestHandler): RequestHandler =>
  async (req, res, next) => {
    try {
      await handler(req, res, next);
    } catch (error) {
      next(error);
    }
  };

export const addTicketCommentHandler = withRoute(async (req, res) => {
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
});

export const convertTicketHandler = withRoute(async (req, res) => {
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
  if (!canManage) throw new HttpError(403, 'Only project owners/admins can convert tickets.');
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
});

export const deleteTicketHandler = withRoute(async (req, res) => {
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
});
