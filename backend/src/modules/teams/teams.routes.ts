import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/authenticate.js';
import { requireOrgAccess } from '../../middleware/requireOrgAccess.js';
import { prisma } from '../../lib/prisma.js';
import { createId } from '../../lib/ids.js';
import { HttpError } from '../../lib/httpError.js';
import { enforce } from '../policy/policy.service.js';
import { writeAudit } from '../audit/audit.service.js';
import { UserRole } from '@prisma/client';
import { workspaceNotificationService } from '../tickets/workspace.notification.service.js';

const router = Router();

const orgParams = z.object({ orgId: z.string().min(1) });
const teamSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  leadId: z.string().optional(),
  memberIds: z.array(z.string()).default([])
});
const teamPatchSchema = teamSchema.partial();

const parseIds = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((row): row is string => typeof row === 'string' && row.length > 0) : [];

const resolveUsers = async (input: { orgId: string; userIds: string[] }) => {
  if (input.userIds.length === 0) return [];
  const users = await prisma.user.findMany({
    where: { orgId: input.orgId, id: { in: input.userIds }, licenseActive: true },
    select: { id: true, email: true, displayName: true }
  });
  return users.filter((row) => row.email).map((row) => ({ userId: row.id, email: row.email, displayName: row.displayName }));
};

const resolveAdminRecipients = async (orgId: string) => {
  const admins = await prisma.user.findMany({
    where: { orgId, role: UserRole.admin, licenseActive: true },
    select: { id: true, email: true, displayName: true }
  });
  return admins.filter((row) => row.email).map((row) => ({ userId: row.id, email: row.email, displayName: row.displayName }));
};

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

    const actor = await prisma.user.findUnique({
      where: { id: req.auth!.userId },
      select: { displayName: true }
    });
    const actorName = actor?.displayName || 'Admin';
    const memberIds = parseIds(row.memberIds);
    if (memberIds.length > 0) {
      await workspaceNotificationService.notify({
        orgId,
        eventType: 'user_lifecycle',
        actorUserId: req.auth!.userId,
        title: `Added to team: ${row.name}`,
        summary: `${actorName} added you to team "${row.name}".`,
        recipients: await resolveUsers({ orgId, userIds: memberIds }),
        facts: [{ title: 'Team', value: row.name }],
        openPath: '/app?settings=teams',
        dedupeEntityKey: `team-created-${row.id}`
      });
    }
    await workspaceNotificationService.notify({
      orgId,
      eventType: 'security_admin_alerts',
      actorUserId: req.auth!.userId,
      title: `Team created`,
      summary: `${actorName} created team "${row.name}".`,
      recipients: await resolveAdminRecipients(orgId),
      facts: [{ title: 'Team', value: row.name }],
      openPath: '/app?settings=teams',
      dedupeEntityKey: `security-team-created-${row.id}`
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

    const actor = await prisma.user.findUnique({
      where: { id: req.auth!.userId },
      select: { displayName: true }
    });
    const actorName = actor?.displayName || 'Admin';
    const previousMemberIds = parseIds(team.memberIds);
    const nextMemberIds = parseIds(row.memberIds);
    const addedUserIds = nextMemberIds.filter((userId) => !previousMemberIds.includes(userId));
    const removedUserIds = previousMemberIds.filter((userId) => !nextMemberIds.includes(userId));
    if (addedUserIds.length > 0) {
      await workspaceNotificationService.notify({
        orgId,
        eventType: 'user_lifecycle',
        actorUserId: req.auth!.userId,
        title: `Added to team: ${row.name}`,
        summary: `${actorName} added you to team "${row.name}".`,
        recipients: await resolveUsers({ orgId, userIds: addedUserIds }),
        facts: [{ title: 'Team', value: row.name }],
        openPath: '/app?settings=teams',
        dedupeEntityKey: `team-added-${row.id}-${Date.now()}`
      });
    }
    if (removedUserIds.length > 0) {
      await workspaceNotificationService.notify({
        orgId,
        eventType: 'user_lifecycle',
        actorUserId: req.auth!.userId,
        title: `Removed from team: ${row.name}`,
        summary: `${actorName} removed you from team "${row.name}".`,
        recipients: await resolveUsers({ orgId, userIds: removedUserIds }),
        facts: [{ title: 'Team', value: row.name }],
        openPath: '/app?settings=teams',
        dedupeEntityKey: `team-removed-${row.id}-${Date.now()}`
      });
    }
    if (addedUserIds.length > 0 || removedUserIds.length > 0) {
      await workspaceNotificationService.notify({
        orgId,
        eventType: 'security_admin_alerts',
        actorUserId: req.auth!.userId,
        title: `Team membership updated`,
        summary: `${actorName} updated members for team "${row.name}".`,
        recipients: await resolveAdminRecipients(orgId),
        facts: [
          { title: 'Team', value: row.name },
          { title: 'Added', value: String(addedUserIds.length) },
          { title: 'Removed', value: String(removedUserIds.length) }
        ],
        openPath: '/app?settings=teams',
        dedupeEntityKey: `security-team-${row.id}-${Date.now()}`
      });
    }

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

    const actor = await prisma.user.findUnique({
      where: { id: req.auth!.userId },
      select: { displayName: true }
    });
    const actorName = actor?.displayName || 'Admin';
    const memberIds = parseIds(team.memberIds);
    if (memberIds.length > 0) {
      await workspaceNotificationService.notify({
        orgId,
        eventType: 'user_lifecycle',
        actorUserId: req.auth!.userId,
        title: `Removed from team: ${team.name}`,
        summary: `${actorName} removed team "${team.name}".`,
        recipients: await resolveUsers({ orgId, userIds: memberIds }),
        facts: [{ title: 'Team', value: team.name }],
        openPath: '/app?settings=teams',
        dedupeEntityKey: `team-deleted-${team.id}`
      });
    }

    await prisma.team.delete({ where: { id: team.id } });
    await workspaceNotificationService.notify({
      orgId,
      eventType: 'security_admin_alerts',
      actorUserId: req.auth!.userId,
      title: `Team deleted`,
      summary: `${actorName} deleted team "${team.name}".`,
      recipients: await resolveAdminRecipients(orgId),
      facts: [{ title: 'Team', value: team.name }],
      openPath: '/app?settings=teams',
      dedupeEntityKey: `security-team-deleted-${team.id}`
    });

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
