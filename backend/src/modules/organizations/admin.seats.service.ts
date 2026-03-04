import { UserRole } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { HttpError } from '../../lib/httpError.js';
import { writeAudit } from '../audit/audit.service.js';
import { FREE_PLAN_MAX_SEATS, isSeatLimitedPlan } from '../../lib/planLimits.js';
import { enforceAdminAction } from './admin.shared.js';

export const addOrgSeats = async (input: {
  orgId: string;
  seatsToAdd: number;
  actor: { userId: string; role: UserRole };
}) => {
  enforceAdminAction(input.actor);

  const org = await prisma.organization.findUnique({ where: { id: input.orgId } });
  if (!org) throw new HttpError(404, 'Organization not found.');

  if (isSeatLimitedPlan(org.plan)) {
    throw new HttpError(400, `Free plan is limited to ${FREE_PLAN_MAX_SEATS} seats.`);
  }

  const updated = await prisma.organization.update({
    where: { id: input.orgId },
    data: { totalSeats: org.totalSeats + input.seatsToAdd }
  });

  await writeAudit({
    orgId: input.orgId,
    userId: input.actor.userId,
    actionType: 'role_changed',
    action: `Added ${input.seatsToAdd} seats`,
    entityType: 'organization',
    entityId: input.orgId,
    metadata: { seatsToAdd: input.seatsToAdd }
  });

  return updated;
};

