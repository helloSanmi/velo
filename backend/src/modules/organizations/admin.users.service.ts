import bcrypt from 'bcryptjs';
import { UserRole } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { createId } from '../../lib/ids.js';
import { HttpError } from '../../lib/httpError.js';
import { writeAudit } from '../audit/audit.service.js';
import { isSeatLimitedPlan } from '../../lib/planLimits.js';
import { workspaceNotificationService } from '../tickets/workspace.notification.service.js';
import type { ProvisionUserInput, UpdateUserInput } from './admin.schemas.js';
import { enforceAdminAction, resolveActorName, resolveAdminRecipients } from './admin.shared.js';

export const provisionOrgUser = async (input: {
  orgId: string;
  body: ProvisionUserInput;
  actor: { userId: string; role: UserRole };
}) => {
  enforceAdminAction(input.actor);

  const [org, count] = await Promise.all([
    prisma.organization.findUnique({ where: { id: input.orgId } }),
    prisma.user.count({ where: { orgId: input.orgId, licenseActive: true } })
  ]);

  if (!org) throw new HttpError(404, 'Organization not found.');
  if (isSeatLimitedPlan(org.plan) && count >= org.totalSeats) throw new HttpError(400, 'License threshold reached.');

  const username = input.body.username.trim().toLowerCase();
  const email = input.body.email.toLowerCase();
  const existing = await prisma.user.findFirst({
    where: { orgId: input.orgId, OR: [{ username }, { email }] }
  });
  if (existing) throw new HttpError(409, 'User already exists in this organization.');

  const firstName = input.body.firstName?.trim() || '';
  const lastName = input.body.lastName?.trim() || '';
  const displayName = input.body.displayName?.trim() || `${firstName} ${lastName}`.trim() || username;
  const created = await prisma.user.create({
    data: {
      id: createId('usr'),
      orgId: input.orgId,
      username,
      displayName,
      firstName: firstName || null,
      lastName: lastName || null,
      email,
      role: input.body.role,
      licenseActive: true,
      mustChangePassword: input.body.mustChangePassword,
      passwordHash: await bcrypt.hash(input.body.password, 10),
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(username)}`
    }
  });

  await writeAudit({
    orgId: input.orgId,
    userId: input.actor.userId,
    actionType: 'role_changed',
    action: `Provisioned user ${created.username}`,
    entityType: 'user',
    entityId: created.id,
    metadata: { role: created.role, mustChangePassword: created.mustChangePassword }
  });
  return created;
};

export const updateOrgUser = async (input: {
  orgId: string;
  userId: string;
  body: UpdateUserInput;
  actor: { userId: string; role: UserRole };
}) => {
  if (input.actor.userId !== input.userId) enforceAdminAction(input.actor);

  const target = await prisma.user.findUnique({ where: { id: input.userId } });
  if (!target || target.orgId !== input.orgId) throw new HttpError(404, 'User not found.');

  const updated = await prisma.user.update({
    where: { id: input.userId },
    data: {
      firstName: input.body.firstName,
      lastName: input.body.lastName,
      email: input.body.email?.toLowerCase(),
      displayName: input.body.displayName,
      avatar: input.body.avatar
    }
  });

  await writeAudit({
    orgId: input.orgId,
    userId: input.actor.userId,
    actionType: 'role_changed',
    action: `Updated profile for ${updated.username}`,
    entityType: 'user',
    entityId: updated.id
  });
  return updated;
};

export const deleteOrgUser = async (input: {
  orgId: string;
  userId: string;
  actor: { userId: string; role: UserRole };
}) => {
  enforceAdminAction(input.actor);
  const target = await prisma.user.findUnique({ where: { id: input.userId } });
  if (!target || target.orgId !== input.orgId) throw new HttpError(404, 'User not found.');
  if (target.id === input.actor.userId) throw new HttpError(400, 'Cannot delete yourself.');

  await prisma.$transaction([
    prisma.session.deleteMany({ where: { userId: target.id } }),
    prisma.user.delete({ where: { id: target.id } })
  ]);

  await writeAudit({
    orgId: input.orgId,
    userId: input.actor.userId,
    actionType: 'role_changed',
    action: `Deleted user ${target.username}`,
    entityType: 'user',
    entityId: target.id
  });

  const actorName = await resolveActorName(input.actor.userId);
  await workspaceNotificationService.notify({
    orgId: input.orgId,
    eventType: 'user_lifecycle',
    actorUserId: input.actor.userId,
    title: `Workspace access removed: ${target.displayName || target.username}`,
    summary: `${actorName} removed your access to this workspace.`,
    recipients: [{ email: target.email, displayName: target.displayName }],
    facts: [{ title: 'Workspace user', value: target.displayName || target.username }],
    dedupeEntityKey: `user-removed-${target.id}-${Date.now()}`
  });
  await workspaceNotificationService.notify({
    orgId: input.orgId,
    eventType: 'security_admin_alerts',
    actorUserId: input.actor.userId,
    title: 'Workspace user removed',
    summary: `${actorName} removed ${target.displayName || target.username} from the workspace.`,
    recipients: await resolveAdminRecipients(input.orgId),
    facts: [{ title: 'User', value: target.displayName || target.username }],
    openPath: '/app?settings=policy',
    dedupeEntityKey: `security-user-removed-${target.id}-${Date.now()}`
  });
};
