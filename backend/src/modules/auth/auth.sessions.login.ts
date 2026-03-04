import { prisma } from '../../lib/prisma.js';
import { HttpError } from '../../lib/httpError.js';
import { createId } from '../../lib/ids.js';
import { createTokenPair } from './auth.tokens.js';
import { writeAudit } from '../audit/audit.service.js';
import {
  clearLoginFailures,
  isLoginLocked,
  normalizeLoginGuardKey,
  registerLoginFailure
} from './auth.loginLockout.js';
import {
  buildJwtPayload,
  comparePassword,
  hashToken,
  sessionExpiresAt,
  toPublicUser
} from './auth.shared.js';
import { resolveLoginUser } from './auth.user-resolver.js';

export const loginAuth = async (input: {
  identifier: string;
  password: string;
  workspaceDomain?: string;
  userAgent?: string;
  ipAddress?: string;
}) => {
  const loginGuardKey = normalizeLoginGuardKey(input.identifier, input.workspaceDomain);
  const lockState = isLoginLocked(loginGuardKey);
  if (lockState.locked) {
    throw new HttpError(429, `Too many failed sign-in attempts. Try again in ${lockState.retryAfterSeconds}s.`);
  }

  const user = await resolveLoginUser(input.identifier, input.workspaceDomain);
  if (!user) {
    registerLoginFailure(loginGuardKey);
    throw new HttpError(401, 'Invalid credentials.');
  }

  const ok = await comparePassword(input.password, user.passwordHash);
  if (!ok) {
    registerLoginFailure(loginGuardKey);
    throw new HttpError(401, 'Invalid credentials.');
  }

  clearLoginFailures(loginGuardKey);

  if (!user.licenseActive) {
    throw new HttpError(403, 'No active license assigned for this account. Contact your workspace admin.', {
      code: 'LICENSE_REQUIRED'
    });
  }
  if (user.mustChangePassword) {
    throw new HttpError(403, 'Temporary password must be changed before sign in.', {
      code: 'PASSWORD_CHANGE_REQUIRED'
    });
  }

  const sessionId = createId('sess');
  const payload = buildJwtPayload({ userId: user.id, orgId: user.orgId, role: user.role, sessionId });
  const tokens = createTokenPair(payload);

  await prisma.session.create({
    data: {
      id: sessionId,
      orgId: user.orgId,
      userId: user.id,
      refreshTokenHash: await hashToken(tokens.refreshToken),
      userAgent: input.userAgent,
      ipAddress: input.ipAddress,
      expiresAt: sessionExpiresAt()
    }
  });

  await writeAudit({
    orgId: user.orgId,
    userId: user.id,
    actionType: 'auth_login',
    action: 'User logged in',
    entityType: 'session',
    entityId: sessionId,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent
  });

  return { tokens, user: toPublicUser(user) };
};

export const logoutAuth = async (input: {
  sessionId: string;
  orgId: string;
  userId: string;
  userAgent?: string;
  ipAddress?: string;
}) => {
  const session = await prisma.session.findUnique({ where: { id: input.sessionId } });
  if (!session || session.orgId !== input.orgId || session.userId !== input.userId) {
    throw new HttpError(401, 'Session not found.');
  }

  await prisma.session.update({ where: { id: input.sessionId }, data: { isRevoked: true } });
  await writeAudit({
    orgId: input.orgId,
    userId: input.userId,
    actionType: 'auth_logout',
    action: 'User logged out',
    entityType: 'session',
    entityId: input.sessionId,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent
  });
};

