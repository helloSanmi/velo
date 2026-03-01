import { UserRole } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { authenticate } from '../../middleware/authenticate.js';
import { requireOrgAccess } from '../../middleware/requireOrgAccess.js';
import { HttpError } from '../../lib/httpError.js';
import { createId } from '../../lib/ids.js';
import { prisma } from '../../lib/prisma.js';
import { writeAudit } from '../audit/audit.service.js';
import { realtimeGateway } from '../realtime/realtime.gateway.js';
import { ticketsStore } from './tickets.store.js';
import { formatTicketCode, getTicketReference, toWorkspaceTicketPrefix } from './tickets.reference.js';
import { ticketsPolicyStore, type StoredTicketPolicy } from './tickets.policy.store.js';
import { ticketsNotificationService } from './tickets.notification.service.js';
import { ticketsGraphService } from './tickets.graph.service.js';
import { ticketsNotificationPolicyStore } from './tickets.notification.policy.store.js';

const router = Router();

const orgParamsSchema = z.object({ orgId: z.string().min(1) });
const ticketParamsSchema = z.object({ orgId: z.string().min(1), ticketId: z.string().min(1) });
const policyQuerySchema = z.object({ projectId: z.string().min(1).optional() });

const createSchema = z.object({
  projectId: z.string().optional(),
  title: z.string().min(1),
  description: z.string().default(''),
  requesterName: z.string().min(1),
  requesterEmail: z.string().email().optional(),
  status: z.enum(['new', 'triaged', 'planned', 'in-progress', 'resolved', 'closed', 'converted']).default('new'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  tags: z.array(z.string()).default([]),
  source: z.enum(['workspace', 'email', 'form', 'api']).default('workspace'),
  assigneeId: z.string().nullable().optional(),
  startedAt: z.number().int().positive().optional(),
  metadata: z.record(z.unknown()).optional()
});

const updateSchema = z.object({
  projectId: z.string().optional(),
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  requesterName: z.string().min(1).optional(),
  requesterEmail: z.string().email().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  status: z.enum(['new', 'triaged', 'planned', 'in-progress', 'resolved', 'closed', 'converted']).optional(),
  tags: z.array(z.string()).optional(),
  assigneeId: z.string().nullable().optional(),
  startedAt: z.number().int().positive().nullable().optional(),
  metadata: z.record(z.unknown()).optional()
});

const convertSchema = z.object({
  projectId: z.string().optional(),
  status: z.string().default('todo')
});
const commentSchema = z.object({
  text: z.string().min(1)
});
const policyUpsertSchema = z.object({
  projectId: z.string().optional(),
  assignmentMode: z.enum(['manual', 'round_robin', 'least_load']),
  assigneePoolIds: z.array(z.string()).default([]),
  slaHours: z.object({
    low: z.number().int().positive(),
    medium: z.number().int().positive(),
    high: z.number().int().positive(),
    urgent: z.number().int().positive()
  }),
  roundRobinCursor: z.number().int().min(0).optional()
});
const notificationPolicySchema = z.object({
  enabled: z.boolean().optional(),
  quietHoursEnabled: z.boolean().optional(),
  quietHoursStartHour: z.number().int().min(0).max(23).optional(),
  quietHoursEndHour: z.number().int().min(0).max(23).optional(),
  timezoneOffsetMinutes: z.number().int().min(-720).max(840).optional(),
  channels: z.object({
    email: z.boolean().optional(),
    teams: z.boolean().optional()
  }).optional(),
  digest: z
    .object({
      enabled: z.boolean().optional(),
      cadence: z.enum(['hourly', 'daily']).optional(),
      dailyHourLocal: z.number().int().min(0).max(23).optional()
    })
    .optional(),
  health: z
    .object({
      deadLetterWarningThreshold: z.number().int().min(0).max(1000).optional(),
      deadLetterErrorThreshold: z.number().int().min(1).max(1000).optional(),
      webhookQuietWarningMinutes: z.number().int().min(5).max(10080).optional()
    })
    .optional(),
  events: z
    .record(
      z.enum([
        'ticket_created',
        'ticket_assigned',
        'ticket_status_changed',
        'ticket_commented',
        'ticket_sla_breach',
        'ticket_approval_required',
        'project_completion_actions',
        'task_assignment',
        'task_due_overdue',
        'task_status_changes',
        'security_admin_alerts',
        'user_lifecycle'
      ]),
      z.object({
        immediate: z.boolean().optional(),
        digest: z.boolean().optional(),
        channels: z.object({
          email: z.boolean().optional(),
          teams: z.boolean().optional()
        }).optional()
      })
    )
    .optional()
});
const senderPreflightSchema = z.object({
  testRecipientEmail: z.string().email().optional()
});

const toPsSingleQuoted = (value: string): string => `'${String(value || '').replace(/'/g, "''")}'`;

const getProjectOwnerIds = (project: { ownerId: string; createdBy: string; metadata: unknown }): string[] => {
  const metadataOwnerIds =
    project.metadata && typeof project.metadata === 'object' && Array.isArray((project.metadata as Record<string, unknown>).ownerIds)
      ? ((project.metadata as Record<string, unknown>).ownerIds as unknown[]).filter((value): value is string => typeof value === 'string')
      : [];
  return Array.from(new Set([project.ownerId, project.createdBy, ...metadataOwnerIds].filter(Boolean)));
};

const getProjectMemberIds = (project: { memberIds: unknown }): string[] => {
  if (!Array.isArray(project.memberIds)) return [];
  return project.memberIds.filter((value): value is string => typeof value === 'string' && value.length > 0);
};

const canManageProjectTicket = async (input: {
  orgId: string;
  userId: string;
  role: UserRole;
  projectId?: string;
}): Promise<boolean> => {
  if (input.role === 'admin') return true;
  if (!input.projectId) return false;
  const project = await prisma.project.findUnique({
    where: { id: input.projectId },
    select: { id: true, orgId: true, ownerId: true, createdBy: true, metadata: true }
  });
  if (!project || project.orgId !== input.orgId) return false;
  return getProjectOwnerIds(project).includes(input.userId);
};

const canAccessProjectTicket = async (input: {
  orgId: string;
  userId: string;
  role: UserRole;
  projectId?: string;
  requesterUserId?: string;
  assigneeId?: string;
}): Promise<boolean> => {
  if (input.role === 'admin') return true;
  if (input.requesterUserId === input.userId) return true;
  if (input.assigneeId === input.userId) return true;
  if (!input.projectId) return false;
  const project = await prisma.project.findUnique({
    where: { id: input.projectId },
    select: { id: true, orgId: true, ownerId: true, createdBy: true, metadata: true, memberIds: true, isPublic: true }
  });
  if (!project || project.orgId !== input.orgId) return false;
  if (project.isPublic) return true;
  if (getProjectOwnerIds(project).includes(input.userId)) return true;
  return getProjectMemberIds(project).includes(input.userId);
};

const pickAutoAssignee = async (input: {
  orgId: string;
  projectId?: string;
  policy: StoredTicketPolicy;
}): Promise<string | undefined> => {
  const pool = Array.from(new Set(input.policy.assigneePoolIds.filter(Boolean)));
  if (pool.length === 0 || input.policy.assignmentMode === 'manual') return undefined;
  if (input.policy.assignmentMode === 'round_robin') {
    const nextIndex = input.policy.roundRobinCursor % pool.length;
    const selected = pool[nextIndex];
    await ticketsPolicyStore.upsert({
      ...input.policy,
      roundRobinCursor: (nextIndex + 1) % pool.length
    });
    return selected;
  }
  const all = await ticketsStore.list(input.orgId);
  const openStatuses = new Set(['new', 'triaged', 'planned', 'in-progress']);
  const openCounts = new Map<string, number>(pool.map((id) => [id, 0]));
  all.forEach((ticket) => {
    if (!ticket.assigneeId) return;
    if (!openStatuses.has(ticket.status)) return;
    if (input.projectId && ticket.projectId !== input.projectId) return;
    if (!openCounts.has(ticket.assigneeId)) return;
    openCounts.set(ticket.assigneeId, (openCounts.get(ticket.assigneeId) || 0) + 1);
  });
  return [...openCounts.entries()].sort((a, b) => a[1] - b[1])[0]?.[0];
};

router.get('/orgs/:orgId/tickets/policy', authenticate, requireOrgAccess, async (req, res, next) => {
  try {
    const { orgId } = orgParamsSchema.parse(req.params);
    const { projectId } = policyQuerySchema.parse(req.query);
    const policy = await ticketsPolicyStore.get(orgId, projectId);
    res.json({ success: true, data: policy });
  } catch (error) {
    next(error);
  }
});

router.patch('/orgs/:orgId/tickets/policy', authenticate, requireOrgAccess, async (req, res, next) => {
  try {
    const { orgId } = orgParamsSchema.parse(req.params);
    const patch = policyUpsertSchema.parse(req.body);
    if (patch.projectId) {
      const canManage = await canManageProjectTicket({
        orgId,
        userId: req.auth!.userId,
        role: req.auth!.role,
        projectId: patch.projectId
      });
      if (!canManage) throw new HttpError(403, 'Only project owners/admins can update ticket policy.');
    } else if (req.auth!.role !== 'admin') {
      throw new HttpError(403, 'Only admins can update org-wide ticket policy.');
    }
    const existing = await ticketsPolicyStore.get(orgId, patch.projectId);
    const updated = await ticketsPolicyStore.upsert({
      orgId,
      projectId: patch.projectId,
      assignmentMode: patch.assignmentMode,
      assigneePoolIds: patch.assigneePoolIds,
      slaHours: patch.slaHours,
      roundRobinCursor: patch.roundRobinCursor ?? existing.roundRobinCursor
    });
    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

router.get('/orgs/:orgId/tickets/notifications/policy', authenticate, requireOrgAccess, async (req, res, next) => {
  try {
    const { orgId } = orgParamsSchema.parse(req.params);
    if (req.auth!.role !== 'admin') throw new HttpError(403, 'Only admins can view ticket notification policy.');
    const policy = await ticketsNotificationPolicyStore.get(orgId);
    res.json({ success: true, data: policy });
  } catch (error) {
    next(error);
  }
});

router.patch('/orgs/:orgId/tickets/notifications/policy', authenticate, requireOrgAccess, async (req, res, next) => {
  try {
    const { orgId } = orgParamsSchema.parse(req.params);
    if (req.auth!.role !== 'admin') throw new HttpError(403, 'Only admins can update ticket notification policy.');
    const patch = notificationPolicySchema.parse(req.body);
    const policy = await ticketsNotificationPolicyStore.upsert({ orgId, patch });
    res.json({ success: true, data: policy });
  } catch (error) {
    next(error);
  }
});

router.post('/orgs/:orgId/tickets/notifications/preflight', authenticate, requireOrgAccess, async (req, res, next) => {
  try {
    const { orgId } = orgParamsSchema.parse(req.params);
    if (req.auth!.role !== 'admin') throw new HttpError(403, 'Only admins can run notification sender preflight.');
    const body = senderPreflightSchema.parse(req.body || {});
    const result = await ticketsGraphService.senderMailboxPreflight({
      orgId,
      testRecipientEmail: body.testRecipientEmail
    });
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

router.get('/orgs/:orgId/tickets/notifications/setup-script', authenticate, requireOrgAccess, async (req, res, next) => {
  try {
    const { orgId } = orgParamsSchema.parse(req.params);
    if (req.auth!.role !== 'admin') throw new HttpError(403, 'Only admins can generate notification setup script.');

    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: {
        name: true,
        loginSubdomain: true,
        notificationSenderEmail: true,
        microsoftWorkspaceConnected: true,
        microsoftTenantId: true
      }
    });
    if (!org) throw new HttpError(404, 'Organization not found.');

    const appId = String(env.MICROSOFT_OAUTH_CLIENT_ID || '').trim();
    const senderEmail = String(org.notificationSenderEmail || '').trim().toLowerCase();
    const scopeGroupName = `${org.loginSubdomain}-velo-mailbox-scope`;
    const scopeGroupAlias = `${org.loginSubdomain}-velo-mail-scope`.replace(/[^a-z0-9-]/gi, '').toLowerCase();
    const scopeGroupId = `${scopeGroupAlias}@${senderEmail.split('@')[1] || 'yourdomain.com'}`;

    const preflight = senderEmail
      ? await ticketsGraphService.senderMailboxPreflight({ orgId })
      : { ok: false, checks: [{ key: 'sender_mailbox', ok: false, message: 'Sender mailbox is not configured.' }] };

    const checklist = [
      { key: 'workspace_connection', label: 'Microsoft workspace connected', ok: Boolean(org.microsoftWorkspaceConnected) },
      { key: 'tenant_id', label: 'Tenant ID discovered', ok: Boolean(org.microsoftTenantId) },
      { key: 'sender_mailbox', label: 'Sender mailbox configured', ok: Boolean(senderEmail) },
      { key: 'app_id', label: 'App registration client ID configured on server', ok: Boolean(appId) },
      { key: 'preflight_ok', label: 'Preflight checks', ok: Boolean(preflight.ok) }
    ];

    const script = [
      '# Velo notification mailbox scope setup (Exchange Online)',
      '# Run as Exchange/M365 admin in PowerShell',
      '',
      'Connect-ExchangeOnline',
      '',
      `# 1) Create (or reuse) mailbox scope group`,
      `$scopeName = ${toPsSingleQuoted(scopeGroupName)}`,
      `$scopeAlias = ${toPsSingleQuoted(scopeGroupAlias)}`,
      `$scopeSmtp = ${toPsSingleQuoted(scopeGroupId)}`,
      `$appId = ${toPsSingleQuoted(appId || '<MICROSOFT_OAUTH_CLIENT_ID>')}`,
      `$senderMailbox = ${toPsSingleQuoted(senderEmail || 'project@yourdomain.com')}`,
      '',
      '$group = Get-DistributionGroup -Identity $scopeSmtp -ErrorAction SilentlyContinue',
      'if (-not $group) {',
      '  $group = New-DistributionGroup -Name $scopeName -Alias $scopeAlias -Type Security -PrimarySmtpAddress $scopeSmtp',
      '}',
      '',
      '# 2) Ensure sender mailbox is in scope group',
      '$existingMember = Get-DistributionGroupMember -Identity $scopeSmtp -ResultSize Unlimited | Where-Object { $_.PrimarySmtpAddress -eq $senderMailbox }',
      'if (-not $existingMember) {',
      '  Add-DistributionGroupMember -Identity $scopeSmtp -Member $senderMailbox',
      '}',
      '',
      '# 3) Create or update Application Access Policy',
      '$policy = Get-ApplicationAccessPolicy | Where-Object { $_.AppId -eq $appId -and $_.PolicyScopeGroupId -eq $scopeSmtp } | Select-Object -First 1',
      'if (-not $policy) {',
      '  New-ApplicationAccessPolicy -AppId $appId -PolicyScopeGroupId $scopeSmtp -AccessRight RestrictAccess -Description "Velo mailbox scope policy"',
      '}',
      '',
      '# 4) Validate policy (should be Granted)',
      'Test-ApplicationAccessPolicy -AppId $appId -Identity $senderMailbox',
      '',
      '# Optional: verify Graph app permissions/admin consent in Entra UI:',
      '# Mail.Send (Application), Mail.Read (Application) with admin consent.'
    ].join('\n');

    res.json({
      success: true,
      data: {
        ready: checklist.every((item) => item.ok),
        appId: appId || null,
        senderEmail: senderEmail || null,
        scopeGroupName,
        scopeGroupId,
        checklist,
        preflight,
        script,
        filename: `${org.loginSubdomain}-velo-mailbox-policy.ps1`
      }
    });
  } catch (error) {
    next(error);
  }
});

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
    const body = createSchema.parse(req.body);
    const canAccessTarget = await canAccessProjectTicket({
      orgId,
      userId: req.auth!.userId,
      role: req.auth!.role,
      projectId: body.projectId,
      requesterUserId: req.auth!.userId,
      assigneeId: undefined
    });
    if (!canAccessTarget) {
      throw new HttpError(403, 'You do not have access to create a ticket for this project.');
    }
    const canManageCreateTarget = await canManageProjectTicket({
      orgId,
      userId: req.auth!.userId,
      role: req.auth!.role,
      projectId: body.projectId
    });
    const requestedNonDefaultStatus = body.status !== 'new';
    const requestedManualAssignee = body.assigneeId !== undefined && body.assigneeId !== null;
    if (!canManageCreateTarget && (requestedNonDefaultStatus || requestedManualAssignee)) {
      throw new HttpError(403, 'Only project owners/admins can set initial status or assignee when creating tickets.');
    }
    const policy = await ticketsPolicyStore.get(orgId, body.projectId);
    const explicitUnassigned = body.assigneeId === null;
    const autoAssignee = explicitUnassigned
      ? undefined
      : body.assigneeId || (await pickAutoAssignee({ orgId, projectId: body.projectId, policy }));
    const slaHours = policy.slaHours[body.priority];
    const slaDueAt = Date.now() + slaHours * 60 * 60 * 1000;
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { name: true }
    });
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

router.patch('/orgs/:orgId/tickets/:ticketId', authenticate, requireOrgAccess, async (req, res, next) => {
  try {
    const { orgId, ticketId } = ticketParamsSchema.parse(req.params);
    const patch = updateSchema.parse(req.body);
    const existing = await ticketsStore.get(orgId, ticketId);
    if (!existing) throw new HttpError(404, 'Ticket not found.');
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

router.post('/orgs/:orgId/tickets/:ticketId/comments', authenticate, requireOrgAccess, async (req, res, next) => {
  try {
    const { orgId, ticketId } = ticketParamsSchema.parse(req.params);
    const body = commentSchema.parse(req.body);
    const ticket = await ticketsStore.get(orgId, ticketId);
    if (!ticket) throw new HttpError(404, 'Ticket not found.');
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
    const nextComments = [
      ...(ticket.comments || []),
      {
        id: createId('cmt'),
        userId: req.auth!.userId,
        userName: actor?.displayName || 'User',
        text: body.text.trim(),
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
        commentText: body.text.trim()
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

router.post('/orgs/:orgId/tickets/:ticketId/convert', authenticate, requireOrgAccess, async (req, res, next) => {
  try {
    const { orgId, ticketId } = ticketParamsSchema.parse(req.params);
    const body = convertSchema.parse(req.body);
    const ticket = await ticketsStore.get(orgId, ticketId);
    if (!ticket) throw new HttpError(404, 'Ticket not found.');
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
  } catch (error) {
    next(error);
  }
});

router.delete('/orgs/:orgId/tickets/:ticketId', authenticate, requireOrgAccess, async (req, res, next) => {
  try {
    const { orgId, ticketId } = ticketParamsSchema.parse(req.params);
    const ticket = await ticketsStore.get(orgId, ticketId);
    if (!ticket) throw new HttpError(404, 'Ticket not found.');
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

router.get('/integrations/microsoft/graph/webhook', async (req, res) => {
  const token = typeof req.query.validationToken === 'string' ? req.query.validationToken : '';
  if (token) {
    res.setHeader('Content-Type', 'text/plain');
    res.status(200).send(token);
    return;
  }
  res.status(200).send('ok');
});

router.post('/integrations/microsoft/graph/webhook', async (req, res, next) => {
  try {
    const body = req.body as { value?: Array<{ clientState?: string }> } | undefined;
    const notifications = Array.isArray(body?.value) ? body!.value : [];
    const orgIds = await ticketsGraphService.extractValidatedOrgIdsFromWebhookNotifications({ notifications });
    for (const orgId of orgIds) {
      await ticketsGraphService.recordWebhookHit({ orgId });
      await ticketsGraphService.syncMailDelta({ orgId });
    }
    res.status(202).json({ success: true });
  } catch (error) {
    next(error);
  }
});

export const ticketsRoutes = router;
