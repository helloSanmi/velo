import bcrypt from 'bcryptjs';
import { UserRole } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/authenticate.js';
import { requireOrgAccess } from '../../middleware/requireOrgAccess.js';
import { prisma } from '../../lib/prisma.js';
import { createId } from '../../lib/ids.js';
import { HttpError } from '../../lib/httpError.js';
import { enforce } from '../policy/policy.service.js';
import { writeAudit } from '../audit/audit.service.js';
import { FREE_PLAN_MAX_SEATS, isSeatLimitedPlan } from '../../lib/planLimits.js';

const router = Router();
const orgParams = z.object({ orgId: z.string().min(1) });

const addSeatsSchema = z.object({ seatsToAdd: z.coerce.number().int().min(1).max(100000) });
const provisionSchema = z.object({
  username: z.string().min(1),
  role: z.nativeEnum(UserRole).default(UserRole.member),
  displayName: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email(),
  password: z.string().min(6),
  mustChangePassword: z.boolean().default(true)
});

const updateUserSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email().optional(),
  displayName: z.string().optional(),
  avatar: z.string().optional()
});

const updateLicenseSchema = z.object({
  licenseActive: z.boolean()
});

const importUsersSchema = z.object({
  provider: z.enum(['google', 'microsoft']),
  users: z.array(
    z.object({
      email: z.string().email(),
      displayName: z.string().min(1),
      firstName: z.string().optional(),
      lastName: z.string().optional()
    })
  ).min(1).max(500)
});

router.post('/orgs/:orgId/seats/add', authenticate, requireOrgAccess, async (req, res, next) => {
  try {
    const { orgId } = orgParams.parse(req.params);
    const { seatsToAdd } = addSeatsSchema.parse(req.body);
    enforce('org:usage-read', { role: req.auth!.role, userId: req.auth!.userId, isProjectMember: true });

    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) throw new HttpError(404, 'Organization not found.');

    if (isSeatLimitedPlan(org.plan)) {
      throw new HttpError(400, `Free plan is limited to ${FREE_PLAN_MAX_SEATS} seats.`);
    }

    const updated = await prisma.organization.update({
      where: { id: orgId },
      data: { totalSeats: org.totalSeats + seatsToAdd }
    });

    await writeAudit({
      orgId,
      userId: req.auth!.userId,
      actionType: 'role_changed',
      action: `Added ${seatsToAdd} seats`,
      entityType: 'organization',
      entityId: orgId,
      metadata: { seatsToAdd }
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

router.post('/orgs/:orgId/users', authenticate, requireOrgAccess, async (req, res, next) => {
  try {
    const { orgId } = orgParams.parse(req.params);
    const body = provisionSchema.parse(req.body);
    enforce('org:usage-read', { role: req.auth!.role, userId: req.auth!.userId, isProjectMember: true });

    const [org, count] = await Promise.all([
      prisma.organization.findUnique({ where: { id: orgId } }),
      prisma.user.count({ where: { orgId, licenseActive: true } })
    ]);

    if (!org) throw new HttpError(404, 'Organization not found.');
    if (isSeatLimitedPlan(org.plan) && count >= org.totalSeats) {
      throw new HttpError(400, 'License threshold reached.');
    }

    const username = body.username.trim().toLowerCase();
    const existing = await prisma.user.findFirst({
      where: {
        orgId,
        OR: [{ username }, { email: body.email.toLowerCase() }]
      }
    });
    if (existing) throw new HttpError(409, 'User already exists in this organization.');

    const firstName = body.firstName?.trim() || '';
    const lastName = body.lastName?.trim() || '';
    const displayName = body.displayName?.trim() || `${firstName} ${lastName}`.trim() || username;

    const created = await prisma.user.create({
      data: {
        id: createId('usr'),
        orgId,
        username,
        displayName,
        firstName: firstName || null,
        lastName: lastName || null,
        email: body.email.toLowerCase(),
        role: body.role,
        licenseActive: true,
        mustChangePassword: body.mustChangePassword,
        passwordHash: await bcrypt.hash(body.password, 10),
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(username)}`
      }
    });

    await writeAudit({
      orgId,
      userId: req.auth!.userId,
      actionType: 'role_changed',
      action: `Provisioned user ${created.username}`,
      entityType: 'user',
      entityId: created.id,
      metadata: { role: created.role, mustChangePassword: created.mustChangePassword }
    });

    res.status(201).json({ success: true, data: created });
  } catch (error) {
    next(error);
  }
});

router.patch('/orgs/:orgId/users/:userId', authenticate, requireOrgAccess, async (req, res, next) => {
  try {
    const { orgId } = orgParams.parse(req.params);
    const userId = z.string().min(1).parse(req.params.userId);
    const body = updateUserSchema.parse(req.body);

    if (req.auth!.userId !== userId) {
      enforce('org:usage-read', { role: req.auth!.role, userId: req.auth!.userId, isProjectMember: true });
    }

    const target = await prisma.user.findUnique({ where: { id: userId } });
    if (!target || target.orgId !== orgId) throw new HttpError(404, 'User not found.');

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email?.toLowerCase(),
        displayName: body.displayName,
        avatar: body.avatar
      }
    });

    await writeAudit({
      orgId,
      userId: req.auth!.userId,
      actionType: 'role_changed',
      action: `Updated profile for ${updated.username}`,
      entityType: 'user',
      entityId: updated.id
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

router.patch('/orgs/:orgId/users/:userId/license', authenticate, requireOrgAccess, async (req, res, next) => {
  try {
    const { orgId } = orgParams.parse(req.params);
    const userId = z.string().min(1).parse(req.params.userId);
    const { licenseActive } = updateLicenseSchema.parse(req.body);
    enforce('org:usage-read', { role: req.auth!.role, userId: req.auth!.userId, isProjectMember: true });

    const [org, target] = await Promise.all([
      prisma.organization.findUnique({ where: { id: orgId } }),
      prisma.user.findUnique({ where: { id: userId } })
    ]);
    if (!org) throw new HttpError(404, 'Organization not found.');
    if (!target || target.orgId !== orgId) throw new HttpError(404, 'User not found.');
    if (target.id === req.auth!.userId && !licenseActive) throw new HttpError(400, 'Cannot unlicense your own account.');

    if (licenseActive && !target.licenseActive) {
      const activeCount = await prisma.user.count({ where: { orgId, licenseActive: true } });
      if (isSeatLimitedPlan(org.plan) && activeCount >= org.totalSeats) {
        throw new HttpError(400, 'No license seat available.');
      }
    }

    const updated = await prisma.user.update({
      where: { id: target.id },
      data: { licenseActive }
    });

    if (!licenseActive) {
      await prisma.session.updateMany({
        where: { orgId, userId: target.id, isRevoked: false },
        data: { isRevoked: true }
      });
    }

    await writeAudit({
      orgId,
      userId: req.auth!.userId,
      actionType: 'role_changed',
      action: `${licenseActive ? 'Licensed' : 'Unlicensed'} user ${target.username}`,
      entityType: 'user',
      entityId: target.id,
      metadata: { licenseActive }
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

router.delete('/orgs/:orgId/users/:userId', authenticate, requireOrgAccess, async (req, res, next) => {
  try {
    const { orgId } = orgParams.parse(req.params);
    const userId = z.string().min(1).parse(req.params.userId);
    enforce('org:usage-read', { role: req.auth!.role, userId: req.auth!.userId, isProjectMember: true });

    const target = await prisma.user.findUnique({ where: { id: userId } });
    if (!target || target.orgId !== orgId) throw new HttpError(404, 'User not found.');
    if (target.id === req.auth!.userId) throw new HttpError(400, 'Cannot delete yourself.');

    await prisma.$transaction([
      prisma.session.deleteMany({ where: { userId: target.id } }),
      prisma.user.delete({ where: { id: target.id } })
    ]);

    await writeAudit({
      orgId,
      userId: req.auth!.userId,
      actionType: 'role_changed',
      action: `Deleted user ${target.username}`,
      entityType: 'user',
      entityId: target.id
    });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.post('/orgs/:orgId/users/import', authenticate, requireOrgAccess, async (req, res, next) => {
  try {
    const { orgId } = orgParams.parse(req.params);
    const body = importUsersSchema.parse(req.body);
    enforce('org:usage-read', { role: req.auth!.role, userId: req.auth!.userId, isProjectMember: true });

    const [org, existingUsers] = await Promise.all([
      prisma.organization.findUnique({ where: { id: orgId } }),
      prisma.user.findMany({ where: { orgId }, select: { id: true, username: true, email: true, licenseActive: true } })
    ]);
    if (!org) throw new HttpError(404, 'Organization not found.');

    const emailSet = new Set(existingUsers.map((u) => u.email.toLowerCase()));
    const usernameSet = new Set(existingUsers.map((u) => u.username.toLowerCase()));
    let seatUsed = existingUsers.filter((user) => user.licenseActive).length;
    const seatLimit = org.totalSeats;

    const created: Array<{ id: string; email: string; displayName: string }> = [];
    const skipped: Array<{ email: string; reason: string }> = [];

    for (const candidate of body.users) {
      const email = candidate.email.toLowerCase().trim();
      if (!email) continue;
      if (emailSet.has(email)) {
        skipped.push({ email, reason: 'Already exists' });
        continue;
      }
      if (isSeatLimitedPlan(org.plan) && seatUsed >= seatLimit) {
        skipped.push({ email, reason: 'No license seat available' });
        continue;
      }

      const baseUsername = email.split('@')[0]?.toLowerCase().replace(/[^a-z0-9._-]/g, '-') || 'user';
      let username = baseUsername || 'user';
      let suffix = 1;
      while (usernameSet.has(username)) {
        suffix += 1;
        username = `${baseUsername}-${suffix}`;
      }
      usernameSet.add(username);

      const createdUser = await prisma.user.create({
        data: {
          id: createId('usr'),
          orgId,
          username,
          displayName: candidate.displayName,
          firstName: candidate.firstName?.trim() || null,
          lastName: candidate.lastName?.trim() || null,
          email,
          role: UserRole.member,
          licenseActive: true,
          mustChangePassword: false,
          passwordHash: await bcrypt.hash(createId('pwd'), 10),
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(username)}`
        },
        select: { id: true, email: true, displayName: true }
      });
      emailSet.add(email);
      seatUsed += 1;
      created.push(createdUser);
    }

    await writeAudit({
      orgId,
      userId: req.auth!.userId,
      actionType: 'role_changed',
      action: `Imported ${created.length} users from ${body.provider} directory`,
      entityType: 'organization',
      entityId: orgId,
      metadata: {
        provider: body.provider,
        createdCount: created.length,
        skippedCount: skipped.length
      }
    });

    res.json({
      success: true,
      data: {
        created,
        skipped,
        seats: {
          used: seatUsed,
          total: seatLimit,
          limited: isSeatLimitedPlan(org.plan)
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

export const organizationsAdminRoutes = router;
