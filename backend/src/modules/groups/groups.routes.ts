import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/authenticate.js';
import { requireOrgAccess } from '../../middleware/requireOrgAccess.js';
import { prisma } from '../../lib/prisma.js';
import { createId } from '../../lib/ids.js';
import { HttpError } from '../../lib/httpError.js';
import { writeAudit } from '../audit/audit.service.js';

const router = Router();

const orgParams = z.object({ orgId: z.string().min(1) });
const groupSchema = z.object({
  name: z.string().min(1),
  scope: z.enum(['global', 'project']),
  projectId: z.string().optional(),
  memberIds: z.array(z.string()).default([])
});
const groupPatchSchema = groupSchema.partial();

const getProjectOwnerIds = (project: { ownerId: string; createdBy: string; metadata: unknown }): string[] => {
  const ownerIds =
    project.metadata && typeof project.metadata === 'object' && Array.isArray((project.metadata as Record<string, unknown>).ownerIds)
      ? ((project.metadata as Record<string, unknown>).ownerIds as unknown[]).filter((value): value is string => typeof value === 'string')
      : [];
  return Array.from(new Set([project.ownerId || project.createdBy, ...ownerIds]));
};

router.get('/orgs/:orgId/groups', authenticate, requireOrgAccess, async (req, res, next) => {
  try {
    const { orgId } = orgParams.parse(req.params);
    const rows = await prisma.securityGroup.findMany({ where: { orgId }, orderBy: { name: 'asc' } });
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
});

router.post('/orgs/:orgId/groups', authenticate, requireOrgAccess, async (req, res, next) => {
  try {
    const { orgId } = orgParams.parse(req.params);
    const body = groupSchema.parse(req.body);

    if (body.scope === 'global' && req.auth!.role !== 'admin') {
      throw new HttpError(403, 'Only admins can create global groups.');
    }

    if (body.scope === 'project') {
      if (!body.projectId) throw new HttpError(400, 'projectId is required for project scope groups.');
      const project = await prisma.project.findUnique({ where: { id: body.projectId } });
      if (!project || project.orgId !== orgId) throw new HttpError(404, 'Project not found.');
      const ownerIds = getProjectOwnerIds(project);
      if (req.auth!.role !== 'admin' && !ownerIds.includes(req.auth!.userId)) {
        throw new HttpError(403, 'Only the project owner or admin can create project groups.');
      }
    }

    const row = await prisma.securityGroup.create({
      data: {
        id: createId('grp'),
        orgId,
        name: body.name,
        scope: body.scope,
        projectId: body.scope === 'project' ? body.projectId : null,
        memberIds: Array.from(new Set(body.memberIds || [])),
        createdBy: req.auth!.userId
      }
    });

    await writeAudit({
      orgId,
      userId: req.auth!.userId,
      actionType: 'role_changed',
      action: `Created security group ${row.name}`,
      entityType: 'group',
      entityId: row.id
    });

    res.status(201).json({ success: true, data: row });
  } catch (error) {
    next(error);
  }
});

router.patch('/orgs/:orgId/groups/:groupId', authenticate, requireOrgAccess, async (req, res, next) => {
  try {
    const { orgId } = orgParams.parse(req.params);
    const groupId = z.string().min(1).parse(req.params.groupId);
    const body = groupPatchSchema.parse(req.body);

    const existing = await prisma.securityGroup.findUnique({ where: { id: groupId } });
    if (!existing || existing.orgId !== orgId) throw new HttpError(404, 'Group not found.');

    if (existing.scope === 'global' && req.auth!.role !== 'admin') {
      throw new HttpError(403, 'Only admins can edit global groups.');
    }

    if (existing.scope === 'project' && existing.projectId) {
      const project = await prisma.project.findUnique({ where: { id: existing.projectId } });
      const ownerIds = project ? getProjectOwnerIds(project) : [];
      if (req.auth!.role !== 'admin' && !ownerIds.includes(req.auth!.userId)) {
        throw new HttpError(403, 'Only project owner or admin can edit this group.');
      }
    }

    const row = await prisma.securityGroup.update({
      where: { id: groupId },
      data: {
        name: body.name,
        memberIds: body.memberIds ? Array.from(new Set(body.memberIds)) : undefined
      }
    });

    await writeAudit({
      orgId,
      userId: req.auth!.userId,
      actionType: 'role_changed',
      action: `Updated security group ${row.name}`,
      entityType: 'group',
      entityId: row.id
    });

    res.json({ success: true, data: row });
  } catch (error) {
    next(error);
  }
});

router.delete('/orgs/:orgId/groups/:groupId', authenticate, requireOrgAccess, async (req, res, next) => {
  try {
    const { orgId } = orgParams.parse(req.params);
    const groupId = z.string().min(1).parse(req.params.groupId);

    const existing = await prisma.securityGroup.findUnique({ where: { id: groupId } });
    if (!existing || existing.orgId !== orgId) throw new HttpError(404, 'Group not found.');

    if (existing.scope === 'global' && req.auth!.role !== 'admin') {
      throw new HttpError(403, 'Only admins can delete global groups.');
    }

    if (existing.scope === 'project' && existing.projectId) {
      const project = await prisma.project.findUnique({ where: { id: existing.projectId } });
      const ownerIds = project ? getProjectOwnerIds(project) : [];
      if (req.auth!.role !== 'admin' && !ownerIds.includes(req.auth!.userId)) {
        throw new HttpError(403, 'Only project owner or admin can delete this group.');
      }
    }

    await prisma.securityGroup.delete({ where: { id: groupId } });

    await writeAudit({
      orgId,
      userId: req.auth!.userId,
      actionType: 'role_changed',
      action: `Deleted security group ${existing.name}`,
      entityType: 'group',
      entityId: existing.id
    });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export const groupsRoutes = router;
