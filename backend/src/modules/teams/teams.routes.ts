import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/authenticate.js';
import { requireOrgAccess } from '../../middleware/requireOrgAccess.js';
import { prisma } from '../../lib/prisma.js';
import { createId } from '../../lib/ids.js';
import { HttpError } from '../../lib/httpError.js';
import { enforce } from '../policy/policy.service.js';
import { writeAudit } from '../audit/audit.service.js';

const router = Router();

const orgParams = z.object({ orgId: z.string().min(1) });
const teamSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  leadId: z.string().optional(),
  memberIds: z.array(z.string()).default([])
});
const teamPatchSchema = teamSchema.partial();

router.get('/orgs/:orgId/teams', authenticate, requireOrgAccess, async (req, res, next) => {
  try {
    const { orgId } = orgParams.parse(req.params);
    const rows = await prisma.team.findMany({ where: { orgId }, orderBy: { name: 'asc' } });
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
});

router.post('/orgs/:orgId/teams', authenticate, requireOrgAccess, async (req, res, next) => {
  try {
    const { orgId } = orgParams.parse(req.params);
    const body = teamSchema.parse(req.body);
    enforce('org:usage-read', { role: req.auth!.role, userId: req.auth!.userId, isProjectMember: true });

    const row = await prisma.team.create({
      data: {
        id: createId('team'),
        orgId,
        name: body.name,
        description: body.description,
        leadId: body.leadId,
        memberIds: Array.from(new Set([...(body.memberIds || []), ...(body.leadId ? [body.leadId] : [])])),
        createdBy: req.auth!.userId
      }
    });

    await writeAudit({
      orgId,
      userId: req.auth!.userId,
      actionType: 'role_changed',
      action: `Created team ${row.name}`,
      entityType: 'team',
      entityId: row.id
    });

    res.status(201).json({ success: true, data: row });
  } catch (error) {
    next(error);
  }
});

router.patch('/orgs/:orgId/teams/:teamId', authenticate, requireOrgAccess, async (req, res, next) => {
  try {
    const { orgId } = orgParams.parse(req.params);
    const teamId = z.string().min(1).parse(req.params.teamId);
    const body = teamPatchSchema.parse(req.body);
    enforce('org:usage-read', { role: req.auth!.role, userId: req.auth!.userId, isProjectMember: true });

    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team || team.orgId !== orgId) throw new HttpError(404, 'Team not found.');

    const leadId = body.leadId ?? team.leadId ?? undefined;
    const memberIds = Array.from(new Set([...(body.memberIds || (team.memberIds as string[])), ...(leadId ? [leadId] : [])]));

    const row = await prisma.team.update({
      where: { id: teamId },
      data: {
        name: body.name,
        description: body.description,
        leadId,
        memberIds
      }
    });

    await writeAudit({
      orgId,
      userId: req.auth!.userId,
      actionType: 'role_changed',
      action: `Updated team ${row.name}`,
      entityType: 'team',
      entityId: row.id
    });

    res.json({ success: true, data: row });
  } catch (error) {
    next(error);
  }
});

router.delete('/orgs/:orgId/teams/:teamId', authenticate, requireOrgAccess, async (req, res, next) => {
  try {
    const { orgId } = orgParams.parse(req.params);
    const teamId = z.string().min(1).parse(req.params.teamId);
    enforce('org:usage-read', { role: req.auth!.role, userId: req.auth!.userId, isProjectMember: true });

    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team || team.orgId !== orgId) throw new HttpError(404, 'Team not found.');

    await prisma.team.delete({ where: { id: team.id } });

    await writeAudit({
      orgId,
      userId: req.auth!.userId,
      actionType: 'role_changed',
      action: `Deleted team ${team.name}`,
      entityType: 'team',
      entityId: team.id
    });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export const teamsRoutes = router;
