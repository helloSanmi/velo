import { UserRole } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { HttpError } from '../../lib/httpError.js';
import { JwtUser } from './auth.types.js';
import { RegisterPlan, toPublicUser } from './auth.shared.js';
import { registerAuth, acceptInviteAuth, previewInviteAuth } from './auth.registration.js';
import { changePasswordAuth, loginAuth, logoutAuth, refreshAuth, resetPasswordAuth } from './auth.sessions.js';

export const authService = {
  register(input: {
    identifier: string;
    password: string;
    orgName: string;
    plan: RegisterPlan;
    totalSeats?: number;
    userAgent?: string;
    ipAddress?: string;
  }) {
    return registerAuth(input);
  },

  acceptInvite(input: { token: string; identifier?: string; password: string; userAgent?: string; ipAddress?: string }) {
    return acceptInviteAuth(input);
  },

  previewInvite(token: string) {
    return previewInviteAuth(token);
  },

  login(input: { identifier: string; password: string; workspaceDomain?: string; userAgent?: string; ipAddress?: string }) {
    return loginAuth(input);
  },

  refresh(input: { refreshToken: string; userAgent?: string; ipAddress?: string }) {
    return refreshAuth(input);
  },

  logout(input: { sessionId: string; orgId: string; userId: string; userAgent?: string; ipAddress?: string }) {
    return logoutAuth(input);
  },

  changePassword(input: { orgId: string; userId: string; sessionId: string; currentPassword: string; newPassword: string }) {
    return changePasswordAuth(input);
  },

  resetPassword(input: { identifier: string; workspaceDomain?: string; newPassword: string }) {
    return resetPasswordAuth(input);
  },

  async me(auth: JwtUser) {
    const user = await prisma.user.findUnique({ where: { id: auth.userId } });
    if (!user || user.orgId !== auth.orgId) throw new HttpError(401, 'User not found.');
    return toPublicUser({ ...user, role: user.role as UserRole });
  }
};
