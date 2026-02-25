import { prisma } from '../../lib/prisma.js';
import { HttpError } from '../../lib/httpError.js';
import { createId } from '../../lib/ids.js';
import { createTokenPair, verifyRefreshToken } from './auth.tokens.js';
import { writeAudit } from '../audit/audit.service.js';
import {
  buildJwtPayload,
  comparePassword,
  compareToken,
  hashPassword,
  hashToken,
  normalizeIdentifier,
  normalizeWorkspaceDomain,
  sessionExpiresAt,
  toPublicUser
} from './auth.shared.js';

const resolveLoginUser = async (identifier: string, workspaceDomain?: string) => {
  const { normalized } = normalizeIdentifier(identifier);
  const domainHint = normalizeWorkspaceDomain(workspaceDomain);

  const emailLike = normalized.includes('@');
  const [localPartRaw, identifierDomainRaw] = emailLike ? normalized.split('@') : [normalized, ''];
  const localPart = (localPartRaw || '').trim();
  const identifierDomain = (identifierDomainRaw || '').trim();

  const subdomainFromIdentifier = normalizeWorkspaceDomain(identifierDomain);

  const effectiveSubdomain = domainHint || subdomainFromIdentifier;
  if (effectiveSubdomain) {
    const org = await prisma.organization.findUnique({
      where: { loginSubdomain: effectiveSubdomain },
      select: { id: true }
    });
    if (!org) throw new HttpError(404, 'Workspace domain not found.');
    if (emailLike && !identifierDomain.endsWith('.velo.ai')) {
      return prisma.user.findFirst({ where: { orgId: org.id, email: normalized } });
    }
    return prisma.user.findFirst({ where: { orgId: org.id, username: localPart || normalized } });
  }

  if (emailLike && !identifierDomain.endsWith('.velo.ai')) {
    return prisma.user.findFirst({ where: { email: normalized } });
  }

  const byUsername = await prisma.user.findMany({
    where: { username: localPart || normalized },
    take: 2,
    select: {
      id: true,
      orgId: true,
      username: true,
      displayName: true,
      firstName: true,
      lastName: true,
      email: true,
      avatar: true,
      role: true,
      licenseActive: true,
      mustChangePassword: true,
      passwordHash: true
    }
  });
  if (byUsername.length > 1) {
    throw new HttpError(400, 'Multiple workspaces found for this username. Open your workspace URL (e.g. acme.localhost or acme.velo.ai) and sign in there.');
  }
  return byUsername[0] || null;
};

export const loginAuth = async (input: { identifier: string; password: string; workspaceDomain?: string; userAgent?: string; ipAddress?: string }) => {
  const user = await resolveLoginUser(input.identifier, input.workspaceDomain);
  if (!user) throw new HttpError(401, 'Invalid credentials.');

  const ok = await comparePassword(input.password, user.passwordHash);
  if (!ok) throw new HttpError(401, 'Invalid credentials.');
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

export const refreshAuth = async (input: { refreshToken: string; userAgent?: string; ipAddress?: string }) => {
  const payload = verifyRefreshToken(input.refreshToken);
  const session = await prisma.session.findUnique({ where: { id: payload.sessionId } });
  if (!session || session.isRevoked || session.expiresAt.getTime() < Date.now()) {
    throw new HttpError(401, 'Session expired.');
  }
  if (session.orgId !== payload.orgId || session.userId !== payload.userId) {
    throw new HttpError(401, 'Session mismatch.');
  }

  const tokenMatch = await compareToken(input.refreshToken, session.refreshTokenHash);
  if (!tokenMatch) {
    await prisma.session.update({ where: { id: session.id }, data: { isRevoked: true } });
    throw new HttpError(401, 'Invalid refresh token.');
  }

  const newSessionId = createId('sess');
  const newPayload = buildJwtPayload({
    userId: payload.userId,
    orgId: payload.orgId,
    role: payload.role,
    sessionId: newSessionId
  });
  const tokens = createTokenPair(newPayload);

  await prisma.$transaction([
    prisma.session.update({ where: { id: session.id }, data: { isRevoked: true } }),
    prisma.session.create({
      data: {
        id: newSessionId,
        orgId: payload.orgId,
        userId: payload.userId,
        refreshTokenHash: await hashToken(tokens.refreshToken),
        userAgent: input.userAgent,
        ipAddress: input.ipAddress,
        expiresAt: sessionExpiresAt()
      }
    })
  ]);

  await writeAudit({
    orgId: payload.orgId,
    userId: payload.userId,
    actionType: 'auth_refresh',
    action: 'Session rotated',
    entityType: 'session',
    entityId: newSessionId,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent
  });

  return { tokens };
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
