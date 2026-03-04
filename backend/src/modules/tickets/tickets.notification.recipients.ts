import { prisma } from '../../lib/prisma.js';
import type { NotificationRecipient, TicketEventType } from './tickets.notification.types.js';
import type { StoredIntakeTicket } from './tickets.store.js';

export const resolveRecipients = async (input: {
  orgId: string;
  actorUserId: string;
  eventType: TicketEventType;
  ticketAfter: StoredIntakeTicket;
}): Promise<NotificationRecipient[]> => {
  const users = await prisma.user.findMany({
    where: { orgId: input.orgId, licenseActive: true },
    select: { id: true, email: true, displayName: true, role: true }
  });
  const byId = new Map(users.map((user) => [user.id, user]));
  const recipientIds = new Set<string>();
  const add = (userId?: string, options?: { allowActor?: boolean }) => {
    if (!userId) return;
    if (!options?.allowActor && userId === input.actorUserId) return;
    if (byId.has(userId)) recipientIds.add(userId);
  };
  if (input.eventType === 'ticket_created') {
    add(input.ticketAfter.assigneeId, { allowActor: true });
    users.filter((user) => user.role === 'admin').forEach((user) => add(user.id));
  }
  if (input.eventType === 'ticket_assigned') add(input.ticketAfter.assigneeId, { allowActor: true });
  if (input.eventType === 'ticket_status_changed' || input.eventType === 'ticket_commented') {
    add(input.ticketAfter.requesterUserId);
    add(input.ticketAfter.assigneeId);
  }
  if (input.eventType === 'ticket_sla_breach' || input.eventType === 'ticket_approval_required') {
    users.filter((user) => user.role === 'admin').forEach((user) => add(user.id));
  }
  return Array.from(recipientIds)
    .map((id) => byId.get(id))
    .filter((user): user is NonNullable<typeof user> => Boolean(user))
    .filter((user) => Boolean(user.email))
    .map((user) => ({ userId: user.id, email: user.email, displayName: user.displayName, role: user.role }));
};
