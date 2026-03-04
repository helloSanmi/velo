import { AuditActionType, UserRole } from '@prisma/client';
import { createId } from '../../lib/ids.js';
import { prisma } from '../../lib/prisma.js';
import { writeAudit } from '../audit/audit.service.js';
import { createTokenPair } from './auth.tokens.js';
import { buildJwtPayload, hashToken, sessionExpiresAt } from './auth.shared.js';

export const createSessionForUser = async (input: {
  user: { id: string; orgId: string; role: UserRole };
  userAgent?: string;
  ipAddress?: string;
  actionType: AuditActionType;
}) => {
  const sessionId = createId('sess');
  const payload = buildJwtPayload({
    userId: input.user.id,
    orgId: input.user.orgId,
    role: input.user.role,
    sessionId
  });
  const tokens = createTokenPair(payload);

  await prisma.session.create({
    data: {
      id: sessionId,
      orgId: input.user.orgId,
      userId: input.user.id,
      refreshTokenHash: await hashToken(tokens.refreshToken),
      userAgent: input.userAgent,
      ipAddress: input.ipAddress,
      expiresAt: sessionExpiresAt()
    }
  });

  await writeAudit({
    orgId: input.user.orgId,
    userId: input.user.id,
    actionType: input.actionType,
    action: 'User logged in via OAuth',
    entityType: 'session',
    entityId: sessionId,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent
  });

  return tokens;
};
