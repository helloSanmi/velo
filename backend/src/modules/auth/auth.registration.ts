import { UserRole } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { HttpError } from '../../lib/httpError.js';
import { createId } from '../../lib/ids.js';
import { createTokenPair } from './auth.tokens.js';
import { writeAudit } from '../audit/audit.service.js';
import { isSeatLimitedPlan, resolveInitialSeatCapacity } from '../../lib/planLimits.js';
import {
  RegisterPlan,
  buildAvatarUrl,
  buildDisplayName,
  hashPassword,
  hashToken,
  normalizeIdentifier,
  sessionExpiresAt,
  toPublicUser
} from './auth.shared.js';

export const registerAuth = async (input: {
  identifier: string;
  password: string;
  orgName: string;
  plan: RegisterPlan;
  totalSeats?: number;
  userAgent?: string;
  ipAddress?: string;
}) => {
  const { username, email, domain } = normalizeIdentifier(input.identifier);
  const orgName = input.orgName.trim();
  if (!username || !orgName) throw new HttpError(400, 'Identifier and organization name are required.');
  if (!domain) throw new HttpError(400, 'Use a valid email or username format.');

  const existingDomain = await prisma.user.findFirst({
    where: { email: { endsWith: `@${domain}`, mode: 'insensitive' } },
    select: { orgId: true, email: true }
  });
  if (existingDomain) {
    throw new HttpError(409, `A workspace already exists for @${domain}. Ask your admin for an invite to join that workspace.`);
  }

  const existing = await prisma.user.findFirst({ where: { OR: [{ username }, { email }] } });
  if (existing) throw new HttpError(409, 'Account already exists.');

  const seatPriceByPlan: Record<RegisterPlan, number> = { free: 0, basic: 5, pro: 7 };
  const totalSeats = resolveInitialSeatCapacity(input.plan, input.totalSeats);
  const orgId = createId('org');
  const userId = createId('usr');

  await prisma.organization.create({
    data: {
      id: orgId,
      name: orgName,
      plan: input.plan,
      totalSeats,
      seatPrice: seatPriceByPlan[input.plan],
      billingCurrency: 'USD',
      ownerId: userId
    }
  });

  const user = await prisma.user.create({
    data: {
      id: userId,
      orgId,
      username,
      displayName: buildDisplayName(username),
      email,
      role: UserRole.admin,
      passwordHash: await hashPassword(input.password),
      avatar: buildAvatarUrl(username)
    }
  });

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
    action: 'User registered and logged in',
    entityType: 'user',
    entityId: user.id,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent
  });

  return { tokens, user: toPublicUser(user) };
};

export const acceptInviteAuth = async (input: {
  token: string;
  identifier: string;
  password: string;
  userAgent?: string;
  ipAddress?: string;
}) => {
  const token = input.token.trim();
  const { normalized, username, email } = normalizeIdentifier(input.identifier);
  if (!token || !normalized) throw new HttpError(400, 'Token and identifier are required.');

  const invite = await prisma.invite.findFirst({ where: { token } });
  if (!invite) throw new HttpError(404, 'Invite token not found.');
  if (invite.revoked) throw new HttpError(400, 'Invite was revoked.');
  if (invite.expiresAt.getTime() < Date.now()) throw new HttpError(400, 'Invite expired.');
  if (invite.usedCount >= invite.maxUses) throw new HttpError(400, 'Invite usage limit reached.');
  if (invite.invitedIdentifier && invite.invitedIdentifier.toLowerCase() !== normalized) {
    throw new HttpError(400, 'Invite is restricted to another identifier.');
  }

  const org = await prisma.organization.findUnique({ where: { id: invite.orgId } });
  if (!org) throw new HttpError(404, 'Organization not found.');
  const userCount = await prisma.user.count({ where: { orgId: org.id } });
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

