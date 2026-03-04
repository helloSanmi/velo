import { UserRole } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { createId } from '../../lib/ids.js';
import { HttpError } from '../../lib/httpError.js';
import { enforce } from '../policy/policy.service.js';
import { writeAudit } from '../audit/audit.service.js';
import { notifyTeamCreated, notifyTeamDeleted, notifyTeamUpdated } from './teams.notifications.js';

export const listTeams = async (orgId: string) =>
  prisma.team.findMany({ where: { orgId }, orderBy: { name: 'asc' } });

export const createTeam = async (input: {
  orgId: string;
  actorUserId: string;
  actorRole: UserRole;
  name: string;
  description?: string;
  leadId?: string;
  memberIds: string[];
}) => {
  enforce('org:usage-read', { role: input.actorRole, userId: input.actorUserId, isProjectMember: true });

  const row = await prisma.team.create({
    data: {
      id: createId('team'),
      orgId: input.orgId,
      name: input.name,
      description: input.description,
      leadId: input.leadId,
      memberIds: Array.from(new Set([...(input.memberIds || []), ...(input.leadId ? [input.leadId] : [])])),
      createdBy: input.actorUserId
    }
  });

  await notifyTeamCreated({
    orgId: input.orgId,
    actorUserId: input.actorUserId,
    teamId: row.id,
    teamName: row.name,
    memberIds: row.memberIds
  });

  await writeAudit({
    orgId: input.orgId,
    userId: input.actorUserId,
    actionType: 'role_changed',
    action: `Created team ${row.name}`,
    entityType: 'team',
    entityId: row.id
  });

  return row;
};

export const updateTeam = async (input: {
  orgId: string;
  teamId: string;
  actorUserId: string;
  actorRole: UserRole;
  patch: Partial<{ name: string; description?: string; leadId?: string; memberIds: string[] }>;
}) => {
  enforce('org:usage-read', { role: input.actorRole, userId: input.actorUserId, isProjectMember: true });

  const team = await prisma.team.findUnique({ where: { id: input.teamId } });
  if (!team || team.orgId !== input.orgId) throw new HttpError(404, 'Team not found.');

  const leadId = input.patch.leadId ?? team.leadId ?? undefined;
  const memberIds = Array.from(
    new Set([...(input.patch.memberIds || (team.memberIds as string[])), ...(leadId ? [leadId] : [])])
  );

  const row = await prisma.team.update({
    where: { id: input.teamId },
    data: {
      name: input.patch.name,
      description: input.patch.description,
      leadId,
      memberIds
    }
  });

  await notifyTeamUpdated({
    orgId: input.orgId,
    actorUserId: input.actorUserId,
    teamId: row.id,
    teamName: row.name,
    previousMemberIds: team.memberIds,
    nextMemberIds: row.memberIds
  });

  await writeAudit({
    orgId: input.orgId,
    userId: input.actorUserId,
    actionType: 'role_changed',
    action: `Updated team ${row.name}`,
    entityType: 'team',
    entityId: row.id
  });

  return row;
};

export const deleteTeam = async (input: {
  orgId: string;
  teamId: string;
  actorUserId: string;
  actorRole: UserRole;
}) => {
  enforce('org:usage-read', { role: input.actorRole, userId: input.actorUserId, isProjectMember: true });
  const team = await prisma.team.findUnique({ where: { id: input.teamId } });
  if (!team || team.orgId !== input.orgId) throw new HttpError(404, 'Team not found.');

  await notifyTeamDeleted({
    orgId: input.orgId,
    actorUserId: input.actorUserId,
    teamId: team.id,
    teamName: team.name,
    memberIds: team.memberIds
  });
  await prisma.team.delete({ where: { id: team.id } });

  await writeAudit({
    orgId: input.orgId,
    userId: input.actorUserId,
    actionType: 'role_changed',
    action: `Deleted team ${team.name}`,
    entityType: 'team',
    entityId: team.id
  });
};
