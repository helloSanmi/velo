import { UserRole } from '@prisma/client';
import { HttpError } from '../../lib/httpError.js';
import { prisma } from '../../lib/prisma.js';
import { ticketsPolicyStore, type StoredTicketPolicy } from './tickets.policy.store.js';
import { ticketsStore } from './tickets.store.js';

export const getProjectOwnerIds = (project: { ownerId: string; createdBy: string; metadata: unknown }): string[] => {
  const metadataOwnerIds =
    project.metadata && typeof project.metadata === 'object' && Array.isArray((project.metadata as Record<string, unknown>).ownerIds)
      ? ((project.metadata as Record<string, unknown>).ownerIds as unknown[]).filter((value): value is string => typeof value === 'string')
      : [];
  return Array.from(new Set([project.ownerId, project.createdBy, ...metadataOwnerIds].filter(Boolean)));
};

export const getProjectMemberIds = (project: { memberIds: unknown }): string[] => {
  if (!Array.isArray(project.memberIds)) return [];
  return project.memberIds.filter((value): value is string => typeof value === 'string' && value.length > 0);
};

export const canManageProjectTicket = async (input: {
  orgId: string;
  userId: string;
  role: UserRole;
  projectId?: string;
}): Promise<boolean> => {
  if (input.role === 'admin') return true;
  if (!input.projectId) return false;
  const project = await prisma.project.findUnique({
    where: { id: input.projectId },
    select: { id: true, orgId: true, ownerId: true, createdBy: true, metadata: true }
  });
  if (!project || project.orgId !== input.orgId) return false;
  return getProjectOwnerIds(project).includes(input.userId);
};

export const canAccessProjectTicket = async (input: {
  orgId: string;
  userId: string;
  role: UserRole;
  projectId?: string;
  requesterUserId?: string;
  assigneeId?: string;
}): Promise<boolean> => {
  if (input.role === 'admin') return true;
  if (input.requesterUserId === input.userId) return true;
  if (input.assigneeId === input.userId) return true;
  if (!input.projectId) return false;
  const project = await prisma.project.findUnique({
    where: { id: input.projectId },
    select: { id: true, orgId: true, ownerId: true, createdBy: true, metadata: true, memberIds: true, isPublic: true }
  });
  if (!project || project.orgId !== input.orgId) return false;
  if (project.isPublic) return true;
  if (getProjectOwnerIds(project).includes(input.userId)) return true;
  return getProjectMemberIds(project).includes(input.userId);
};

export const pickAutoAssignee = async (input: {
  orgId: string;
  projectId?: string;
  policy: StoredTicketPolicy;
}): Promise<string | undefined> => {
  const pool = Array.from(new Set(input.policy.assigneePoolIds.filter(Boolean)));
  if (pool.length === 0 || input.policy.assignmentMode === 'manual') return undefined;
  if (input.policy.assignmentMode === 'round_robin') {
    const nextIndex = input.policy.roundRobinCursor % pool.length;
    const selected = pool[nextIndex];
    await ticketsPolicyStore.upsert({
      ...input.policy,
      roundRobinCursor: (nextIndex + 1) % pool.length
    });
    return selected;
  }

  const all = await ticketsStore.list(input.orgId);
  const openStatuses = new Set(['new', 'triaged', 'planned', 'in-progress']);
  const openCounts = new Map<string, number>(pool.map((id) => [id, 0]));
  all.forEach((ticket) => {
    if (!ticket.assigneeId) return;
    if (!openStatuses.has(ticket.status)) return;
    if (input.projectId && ticket.projectId !== input.projectId) return;
    if (!openCounts.has(ticket.assigneeId)) return;
    openCounts.set(ticket.assigneeId, (openCounts.get(ticket.assigneeId) || 0) + 1);
  });

  return [...openCounts.entries()].sort((a, b) => a[1] - b[1])[0]?.[0];
};

export const requireTicketExists = async (orgId: string, ticketId: string) => {
  const ticket = await ticketsStore.get(orgId, ticketId);
  if (!ticket) throw new HttpError(404, 'Ticket not found.');
  return ticket;
};

