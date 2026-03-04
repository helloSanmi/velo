import { prisma } from '../../lib/prisma.js';
import { HttpError } from '../../lib/httpError.js';
import { createId } from '../../lib/ids.js';
import { createTokenPair } from './auth.tokens.js';
import { writeAudit } from '../audit/audit.service.js';
import { isSeatLimitedPlan } from '../../lib/planLimits.js';
import {
  buildAvatarUrl,
  buildDisplayName,
  hashPassword,
  hashToken,
  normalizeIdentifier,
  sessionExpiresAt,
  toPublicUser
} from './auth.shared.js';

export const acceptInviteAuth = async (input: {
  token: string;
  identifier?: string;
  password: string;
  userAgent?: string;
  ipAddress?: string;
}) => {
  const token = input.token.trim();
  if (!token) throw new HttpError(400, 'Token is required.');

  const invite = await prisma.invite.findFirst({ where: { token } });
  if (!invite) throw new HttpError(404, 'Invite token not found.');
  if (invite.revoked) throw new HttpError(400, 'Invite was revoked.');
  if (invite.expiresAt.getTime() < Date.now()) throw new HttpError(400, 'Invite expired.');
  if (invite.usedCount >= invite.maxUses) throw new HttpError(400, 'Invite usage limit reached.');

  const inviteIdentifier = (invite.invitedIdentifier || '').trim().toLowerCase();
  if (!inviteIdentifier || !inviteIdentifier.includes('@')) {
    throw new HttpError(400, 'Invite is missing a valid work email.');
  }

  const identifierSource = (input.identifier || inviteIdentifier).trim();
  if (!identifierSource) throw new HttpError(400, 'Identifier is required for this invite.');
  const { normalized, username, email } = normalizeIdentifier(identifierSource);
  if (!normalized) throw new HttpError(400, 'Identifier is required for this invite.');
  if (normalized !== inviteIdentifier) {
    throw new HttpError(400, 'Invite is restricted to another identifier.');
  }

  const org = await prisma.organization.findUnique({ where: { id: invite.orgId } });
  if (!org) throw new HttpError(404, 'Organization not found.');
  const userCount = await prisma.user.count({ where: { orgId: org.id, licenseActive: true } });
  if (isSeatLimitedPlan(org.plan) && userCount >= org.totalSeats) {
    throw new HttpError(400, 'No available licenses in this workspace.');
  }

  const exists = await prisma.user.findFirst({ where: { OR: [{ username }, { email }] } });
  if (exists) throw new HttpError(409, 'Identifier already in use.');

  const user = await prisma.user.create({
    data: {
      id: createId('usr'),
      orgId: org.id,
      username,
      displayName: buildDisplayName(username),
      email,
      role: invite.role,
      licenseActive: true,
      mustChangePassword: false,
      passwordHash: await hashPassword(input.password),
      avatar: buildAvatarUrl(username)
    }
  });

  await prisma.invite.update({ where: { id: invite.id }, data: { usedCount: invite.usedCount + 1 } });

  const sessionId = createId('sess');
  const tokens = createTokenPair({ userId: user.id, orgId: user.orgId, role: user.role, sessionId });
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
    action: 'User joined via invite',
    entityType: 'invite',
    entityId: invite.id,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent
  });

  return { tokens, user: toPublicUser(user) };
};

export const previewInviteAuth = async (token: string) => {
  const cleanToken = token.trim();
  if (!cleanToken) throw new HttpError(400, 'Invite token is required.');
  const invite = await prisma.invite.findFirst({ where: { token: cleanToken } });
  if (!invite) throw new HttpError(404, 'Invite token not found.');
  if (invite.revoked) throw new HttpError(400, 'Invite was revoked.');
  if (invite.expiresAt.getTime() < Date.now()) throw new HttpError(400, 'Invite expired.');
  if (invite.usedCount >= invite.maxUses) throw new HttpError(400, 'Invite usage limit reached.');

  const org = await prisma.organization.findUnique({
    where: { id: invite.orgId },
    select: { id: true, name: true, loginSubdomain: true }
  });
  if (!org) throw new HttpError(404, 'Organization not found.');

  return {
    token: invite.token,
    role: invite.role,
    invitedIdentifier: invite.invitedIdentifier || null,
    expiresAt: invite.expiresAt.toISOString(),
    org: {
      id: org.id,
      name: org.name,
      loginSubdomain: org.loginSubdomain
    }
  };
};

