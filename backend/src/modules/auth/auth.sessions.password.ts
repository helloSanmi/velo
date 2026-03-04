import { prisma } from '../../lib/prisma.js';
import { HttpError } from '../../lib/httpError.js';
import { comparePassword, hashPassword } from './auth.shared.js';
import { resolveLoginUser } from './auth.user-resolver.js';

export const changePasswordAuth = async (input: {
  orgId: string;
  userId: string;
  sessionId: string;
  currentPassword: string;
  newPassword: string;
}) => {
  const user = await prisma.user.findUnique({ where: { id: input.userId } });
  if (!user || user.orgId !== input.orgId) throw new HttpError(401, 'User not found.');

  const isCurrentPasswordValid = await comparePassword(input.currentPassword, user.passwordHash);
  if (!isCurrentPasswordValid) throw new HttpError(401, 'Current password is incorrect.');

  const isSamePassword = await comparePassword(input.newPassword, user.passwordHash);
  if (isSamePassword) throw new HttpError(400, 'New password must be different from current password.');

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(input.newPassword), mustChangePassword: false }
    }),
    prisma.session.updateMany({
      where: {
        orgId: input.orgId,
        userId: input.userId,
        isRevoked: false,
        id: { not: input.sessionId }
      },
      data: { isRevoked: true }
    })
  ]);
};

export const resetPasswordAuth = async (input: {
  identifier: string;
  workspaceDomain?: string;
  newPassword: string;
}) => {
  const user = await resolveLoginUser(input.identifier, input.workspaceDomain);
  if (!user) throw new HttpError(404, 'Account not found.');

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(input.newPassword), mustChangePassword: false }
    }),
    prisma.session.updateMany({
      where: {
        orgId: user.orgId,
        userId: user.id,
        isRevoked: false
      },
      data: { isRevoked: true }
    })
  ]);
};

