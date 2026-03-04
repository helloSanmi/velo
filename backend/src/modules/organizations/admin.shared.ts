import { UserRole } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { enforce } from '../policy/policy.service.js';

export const enforceAdminAction = (auth: { role: UserRole; userId: string }) => {
  enforce('org:usage-read', { role: auth.role, userId: auth.userId, isProjectMember: true });
};

export const resolveAdminRecipients = async (orgId: string) => {
  const admins = await prisma.user.findMany({
    where: { orgId, role: UserRole.admin, licenseActive: true },
    select: { id: true, email: true, displayName: true }
  });
  return admins
    .filter((row) => Boolean(row.email))
    .map((row) => ({ userId: row.id, email: row.email, displayName: row.displayName }));
};

export const resolveActorName = async (userId: string) => {
  const actor = await prisma.user.findUnique({
    where: { id: userId },
    select: { displayName: true }
  });
  return actor?.displayName || 'Admin';
};

