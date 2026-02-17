import { UserRole } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/authenticate.js';
import { requireOrgAccess } from '../../middleware/requireOrgAccess.js';
import { prisma } from '../../lib/prisma.js';
import { createId } from '../../lib/ids.js';
import { enforce } from '../policy/policy.service.js';
import { HttpError } from '../../lib/httpError.js';
import { writeAudit } from '../audit/audit.service.js';

const router = Router();
const orgParams = z.object({ orgId: z.string().min(1) });

const createInviteSchema = z.object({
  role: z.nativeEnum(UserRole).default(UserRole.member),
  invitedIdentifier: z.string().optional(),
  ttlDays: z.coerce.number().int().min(1).max(90).default(14),
  maxUses: z.coerce.number().int().min(1).max(20).default(1)
});

router.get('/orgs/:orgId/invites', authenticate, requireOrgAccess, async (req, res, next) => {
  try {
    const { orgId } = orgParams.parse(req.params);
    enforce('org:usage-read', { role: req.auth!.role, userId: req.auth!.userId, isProjectMember: true });
    const invites = await prisma.invite.findMany({ where: { orgId }, orderBy: { createdAt: 'desc' } });
    res.json({ success: true, data: invites });
  } catch (error) {
    next(error);
  }
});

router.post('/orgs/:orgId/invites', authenticate, requireOrgAccess, async (req, res, next) => {
  try {
    const { orgId } = orgParams.parse(req.params);
    const body = createInviteSchema.parse(req.body);
    enforce('org:usage-read', { role: req.auth!.role, userId: req.auth!.userId, isProjectMember: true });

    const expiresAt = new Date(Date.now() + body.ttlDays * 24 * 60 * 60 * 1000);
    const invite = await prisma.invite.create({
      data: {
        id: createId('inv'),
        orgId,
        token: `velo_${createId('tkn').replace('tkn_', '').slice(0, 12)}`,
        role: body.role,
        createdBy: req.auth!.userId,
        expiresAt,
        maxUses: body.maxUses,
        invitedIdentifier: body.invitedIdentifier?.trim() || null
      }
    });

    await writeAudit({
      orgId,
      userId: req.auth!.userId,
      actionType: 'role_changed',
      action: `Created invite ${invite.id}`,
      entityType: 'invite',
      entityId: invite.id,
      metadata: { role: invite.role, maxUses: invite.maxUses }
    });

    res.status(201).json({ success: true, data: invite });
  } catch (error) {
    next(error);
  }
});

router.delete('/orgs/:orgId/invites/:inviteId', authenticate, requireOrgAccess, async (req, res, next) => {
  try {
    const { orgId } = orgParams.parse(req.params);
    const inviteId = z.string().min(1).parse(req.params.inviteId);
    enforce('org:usage-read', { role: req.auth!.role, userId: req.auth!.userId, isProjectMember: true });

    const invite = await prisma.invite.findUnique({ where: { id: inviteId } });
    if (!invite || invite.orgId !== orgId) throw new HttpError(404, 'Invite not found.');

    const updated = await prisma.invite.update({ where: { id: invite.id }, data: { revoked: true } });

    await writeAudit({
      orgId,
      userId: req.auth!.userId,
      actionType: 'role_changed',
      action: `Revoked invite ${invite.id}`,
      entityType: 'invite',
      entityId: invite.id
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

export const invitesRoutes = router;
