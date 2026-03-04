import bcrypt from 'bcryptjs';
import { UserRole } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { createId } from '../../lib/ids.js';
import { HttpError } from '../../lib/httpError.js';
import { writeAudit } from '../audit/audit.service.js';
import { isSeatLimitedPlan } from '../../lib/planLimits.js';
import type { ImportUsersInput } from './admin.schemas.js';
import { enforceAdminAction } from './admin.shared.js';

export const importOrgUsers = async (input: {
  orgId: string;
  body: ImportUsersInput;
  actor: { userId: string; role: UserRole };
}) => {
  enforceAdminAction(input.actor);
  const [org, existingUsers] = await Promise.all([
    prisma.organization.findUnique({ where: { id: input.orgId } }),
    prisma.user.findMany({
      where: { orgId: input.orgId },
      select: { id: true, username: true, email: true, licenseActive: true, microsoftSubject: true }
    })
  ]);
  if (!org) throw new HttpError(404, 'Organization not found.');

  const emailSet = new Set(existingUsers.map((user) => user.email.toLowerCase()));
  const usernameSet = new Set(existingUsers.map((user) => user.username.toLowerCase()));
  const subjectSet = new Set(
    existingUsers.map((user) => (user.microsoftSubject || '').trim()).filter((value) => Boolean(value))
  );
  let seatUsed = existingUsers.filter((user) => user.licenseActive).length;
  const seatLimit = org.totalSeats;
  const created: Array<{ id: string; email: string; displayName: string }> = [];
  const skipped: Array<{ email: string; reason: string }> = [];

  for (const candidate of input.body.users) {
    const email = candidate.email.toLowerCase().trim();
    const externalId = (candidate.externalId || '').trim();
    if (!email) continue;
    if ((externalId && subjectSet.has(externalId)) || emailSet.has(email)) {
      skipped.push({ email, reason: 'Already exists' });
      continue;
    }
    if (isSeatLimitedPlan(org.plan) && seatUsed >= seatLimit) {
      skipped.push({ email, reason: 'No license seat available' });
      continue;
    }

    const baseUsername = email.split('@')[0]?.toLowerCase().replace(/[^a-z0-9._-]/g, '-') || 'user';
    let username = baseUsername || 'user';
    let suffix = 1;
    while (usernameSet.has(username)) {
      suffix += 1;
      username = `${baseUsername}-${suffix}`;
    }
    usernameSet.add(username);

    const createdUser = await prisma.user.create({
      data: {
        id: createId('usr'),
        orgId: input.orgId,
        username,
        displayName: candidate.displayName,
        firstName: candidate.firstName?.trim() || null,
        lastName: candidate.lastName?.trim() || null,
        email,
        role: UserRole.member,
        licenseActive: true,
        mustChangePassword: false,
        passwordHash: await bcrypt.hash(createId('pwd'), 10),
        microsoftSubject: externalId || null,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(username)}`
      },
      select: { id: true, email: true, displayName: true }
    });
    emailSet.add(email);
    if (externalId) subjectSet.add(externalId);
    seatUsed += 1;
    created.push(createdUser);
  }

  await writeAudit({
    orgId: input.orgId,
    userId: input.actor.userId,
    actionType: 'role_changed',
    action: `Imported ${created.length} users from ${input.body.provider} directory`,
    entityType: 'organization',
    entityId: input.orgId,
    metadata: {
      provider: input.body.provider,
      createdCount: created.length,
      skippedCount: skipped.length
    }
  });

  return {
    created,
    skipped,
    seats: { used: seatUsed, total: seatLimit, limited: isSeatLimitedPlan(org.plan) }
  };
};

