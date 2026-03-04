import { UserRole } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';

export const resolveUsers = async (input: { orgId: string; userIds: string[] }) => {
  if (input.userIds.length === 0) return [];
  const users = await prisma.user.findMany({
    where: { orgId: input.orgId, id: { in: input.userIds }, licenseActive: true },
    select: { id: true, email: true, displayName: true }
  });
  return users
    .filter((row) => row.email)
    .map((row) => ({ userId: row.id, email: row.email, displayName: row.displayName }));
};

export const resolveAdminRecipients = async (orgId: string) => {
  const admins = await prisma.user.findMany({
    where: { orgId, role: UserRole.admin, licenseActive: true },
    select: { id: true, email: true, displayName: true }
  });
  return admins
    .filter((row) => row.email)
    .map((row) => ({ userId: row.id, email: row.email, displayName: row.displayName }));
};

export const resolveActorName = async (userId: string) => {
  const actor = await prisma.user.findUnique({
    where: { id: userId },
    select: { displayName: true }
  });
  return actor?.displayName || 'Admin';
};
