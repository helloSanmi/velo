import { UserRole } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { HttpError } from '../../lib/httpError.js';
import { createId } from '../../lib/ids.js';
import { createTokenPair } from './auth.tokens.js';
import { writeAudit } from '../audit/audit.service.js';
import { resolveInitialSeatCapacity } from '../../lib/planLimits.js';
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
import { buildUniqueSubdomain } from './auth.registration.helpers.js';

export const registerAuth = async (input: {
  identifier: string;
  password: string;
  orgName: string;
  plan: RegisterPlan;
  totalSeats?: number;
  userAgent?: string;
  ipAddress?: string;
}) => {
  const { username, email } = normalizeIdentifier(input.identifier);
  const orgName = input.orgName.trim();
  if (!username || !orgName) throw new HttpError(400, 'Identifier and organization name are required.');

  const existing = await prisma.user.findFirst({ where: { OR: [{ username }, { email }] } });
  if (existing) throw new HttpError(409, 'Account already exists.');

  const seatPriceByPlan: Record<RegisterPlan, number> = { free: 0, basic: 5, pro: 7 };
  const totalSeats = resolveInitialSeatCapacity(input.plan, input.totalSeats);
  const orgId = createId('org');
  const userId = createId('usr');
  const loginSubdomain = await buildUniqueSubdomain(orgName);

  await prisma.organization.create({
    data: {
      id: orgId,
      name: orgName,
      loginSubdomain,
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
      licenseActive: true,
      mustChangePassword: false,
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

