import { prisma } from '../../lib/prisma.js';
import { HttpError } from '../../lib/httpError.js';
import { createId } from '../../lib/ids.js';
import { createTokenPair, verifyRefreshToken } from './auth.tokens.js';
import { writeAudit } from '../audit/audit.service.js';
import { buildJwtPayload, compareToken, hashToken, sessionExpiresAt } from './auth.shared.js';

export const refreshAuth = async (input: {
  refreshToken: string;
  userAgent?: string;
  ipAddress?: string;
}) => {
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

