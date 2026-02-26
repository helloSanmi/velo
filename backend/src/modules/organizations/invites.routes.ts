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
import { sendInviteByEmail } from './invite-delivery.service.js';

const router = Router();
const orgParams = z.object({ orgId: z.string().min(1) });

const createInviteSchema = z.object({
  role: z.nativeEnum(UserRole).default(UserRole.member),
  invitedIdentifier: z.string().email(),
  ttlDays: z.coerce.number().int().min(1).max(90).default(14),
  maxUses: z.coerce.number().int().min(1).max(20).default(1)
});

const assertOrgAdmin = (role: UserRole) => {
  if (role !== UserRole.admin) {
    throw new HttpError(403, 'Only workspace admins can manage invites.');
  }
};

router.get('/orgs/:orgId/invites', authenticate, requireOrgAccess, async (req, res, next) => {
  try {
    const { orgId } = orgParams.parse(req.params);
    enforce('org:usage-read', { role: req.auth!.role, userId: req.auth!.userId, isProjectMember: true });
    assertOrgAdmin(req.auth!.role);
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
    assertOrgAdmin(req.auth!.role);

    const expiresAt = new Date(Date.now() + body.ttlDays * 24 * 60 * 60 * 1000);
    const createdInvite = await prisma.invite.create({
      data: {
        id: createId('inv'),
        orgId,
        token: `velo_${createId('tkn').replace('tkn_', '').slice(0, 12)}`,
        role: body.role,
        createdBy: req.auth!.userId,
        expiresAt,
        maxUses: body.maxUses,
        invitedIdentifier: body.invitedIdentifier.trim().toLowerCase()
      }
    });

    const delivery = await sendInviteByEmail({ inviteId: createdInvite.id });
    const invite = await prisma.invite.findUnique({ where: { id: createdInvite.id } });
    if (!invite) throw new HttpError(500, 'Invite created but could not be loaded.');

    await writeAudit({
      orgId,
      userId: req.auth!.userId,
      actionType: 'role_changed',
      action: `Created invite ${invite.id}`,
      entityType: 'invite',
      entityId: invite.id,
      metadata: { role: invite.role, maxUses: invite.maxUses, deliveryStatus: delivery.status, deliveryProvider: delivery.provider || null, deliveryError: delivery.error || null }
    });

    res.status(201).json({ success: true, data: invite });
  } catch (error) {
    next(error);
  }
});

router.post('/orgs/:orgId/invites/:inviteId/resend', authenticate, requireOrgAccess, async (req, res, next) => {
  try {
    const { orgId } = orgParams.parse(req.params);
    const inviteId = z.string().min(1).parse(req.params.inviteId);
    enforce('org:usage-read', { role: req.auth!.role, userId: req.auth!.userId, isProjectMember: true });
    assertOrgAdmin(req.auth!.role);

    const invite = await prisma.invite.findUnique({ where: { id: inviteId } });
    if (!invite || invite.orgId !== orgId) throw new HttpError(404, 'Invite not found.');
    if (invite.revoked) throw new HttpError(400, 'Invite was revoked.');
    if (invite.expiresAt.getTime() < Date.now()) throw new HttpError(400, 'Invite expired.');
    if (invite.usedCount >= invite.maxUses) throw new HttpError(400, 'Invite usage limit reached.');

    const delivery = await sendInviteByEmail({ inviteId });
    const updated = await prisma.invite.findUnique({ where: { id: invite.id } });
    if (!updated) throw new HttpError(500, 'Invite resend succeeded but invite could not be loaded.');

    await writeAudit({
      orgId,
      userId: req.auth!.userId,
      actionType: 'role_changed',
      action: `Resent invite ${invite.id}`,
      entityType: 'invite',
      entityId: invite.id,
      metadata: { deliveryStatus: delivery.status, deliveryProvider: delivery.provider || null, deliveryError: delivery.error || null }
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

router.delete('/orgs/:orgId/invites/:inviteId', authenticate, requireOrgAccess, async (req, res, next) => {
  try {
    const { orgId } = orgParams.parse(req.params);
    const inviteId = z.string().min(1).parse(req.params.inviteId);
    enforce('org:usage-read', { role: req.auth!.role, userId: req.auth!.userId, isProjectMember: true });
    assertOrgAdmin(req.auth!.role);

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
