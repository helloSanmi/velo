import { UserRole } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { HttpError } from '../../lib/httpError.js';
import { writeAudit } from '../audit/audit.service.js';
import { isSeatLimitedPlan } from '../../lib/planLimits.js';
import { workspaceNotificationService } from '../tickets/workspace.notification.service.js';
import { enforceAdminAction, resolveActorName, resolveAdminRecipients } from './admin.shared.js';

export const updateOrgUserLicense = async (input: {
  orgId: string;
  userId: string;
  licenseActive: boolean;
  actor: { userId: string; role: UserRole };
}) => {
  enforceAdminAction(input.actor);

  const [org, target] = await Promise.all([
    prisma.organization.findUnique({ where: { id: input.orgId } }),
    prisma.user.findUnique({ where: { id: input.userId } })
  ]);
  if (!org) throw new HttpError(404, 'Organization not found.');
  if (!target || target.orgId !== input.orgId) throw new HttpError(404, 'User not found.');
  if (target.id === input.actor.userId && !input.licenseActive) {
    throw new HttpError(400, 'Cannot unlicense your own account.');
  }

  if (input.licenseActive && !target.licenseActive) {
    const activeCount = await prisma.user.count({ where: { orgId: input.orgId, licenseActive: true } });
    if (isSeatLimitedPlan(org.plan) && activeCount >= org.totalSeats) {
      throw new HttpError(400, 'No license seat available.');
    }
  }

  const updated = await prisma.user.update({
    where: { id: target.id },
    data: { licenseActive: input.licenseActive }
  });

  if (!input.licenseActive) {
    await prisma.session.updateMany({
      where: { orgId: input.orgId, userId: target.id, isRevoked: false },
      data: { isRevoked: true }
    });
  }

  await writeAudit({
    orgId: input.orgId,
    userId: input.actor.userId,
    actionType: 'role_changed',
    action: `${input.licenseActive ? 'Licensed' : 'Unlicensed'} user ${target.username}`,
    entityType: 'user',
    entityId: target.id,
    metadata: { licenseActive: input.licenseActive }
  });

  const actorName = await resolveActorName(input.actor.userId);
  await workspaceNotificationService.notify({
    orgId: input.orgId,
    eventType: 'user_lifecycle',
    actorUserId: input.actor.userId,
    title: input.licenseActive ? 'Your workspace license is active' : 'Your workspace license was removed',
    summary: `${actorName} ${input.licenseActive ? 'activated' : 'removed'} your access license for this workspace.`,
    recipients: [{ userId: target.id, email: target.email, displayName: target.displayName }],
    facts: [
      { title: 'User', value: target.displayName || target.username },
      { title: 'License status', value: input.licenseActive ? 'Active' : 'Inactive' },
      { title: 'Updated by', value: actorName }
    ],
    openPath: '/app?settings=users',
    dedupeEntityKey: `license-${target.id}-${input.licenseActive ? 'on' : 'off'}-${updated.updatedAt.getTime()}`
  });

  await workspaceNotificationService.notify({
    orgId: input.orgId,
    eventType: 'security_admin_alerts',
    actorUserId: input.actor.userId,
    title: 'User license updated',
    summary: `${actorName} ${input.licenseActive ? 'licensed' : 'unlicensed'} ${target.displayName || target.username}.`,
    recipients: await resolveAdminRecipients(input.orgId),
    facts: [
      { title: 'User', value: target.displayName || target.username },
      { title: 'License', value: input.licenseActive ? 'Active' : 'Inactive' }
    ],
    openPath: '/app?settings=policy',
    dedupeEntityKey: `security-license-${target.id}-${updated.updatedAt.getTime()}`
  });

  return updated;
};

