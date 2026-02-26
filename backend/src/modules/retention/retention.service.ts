import { prisma } from '../../lib/prisma.js';

const DAY_MS = 24 * 60 * 60 * 1000;

export interface RetentionCleanupInput {
  orgRetentionDays: number;
  projectDeletionAuditRetentionDays: number;
  ticketNotificationDeliveryRetentionDays: number;
  ticketInboundMessageRetentionDays: number;
  ticketSuppressionRetentionDays: number;
}

export interface RetentionCleanupResult {
  purgedOrganizations: number;
  purgedProjectDeletionAudits: number;
  purgedTicketNotificationDeliveries: number;
  purgedTicketInboundMessages: number;
  purgedTicketSuppressions: number;
  orgCutoff: Date;
  projectDeletionAuditCutoff: Date;
  ticketNotificationDeliveryCutoff: Date;
  ticketInboundMessageCutoff: Date;
  ticketSuppressionCutoff: Date;
}

export const runRetentionCleanup = async (input: RetentionCleanupInput): Promise<RetentionCleanupResult> => {
  const orgCutoff = new Date(Date.now() - Math.max(1, input.orgRetentionDays) * DAY_MS);
  const projectDeletionAuditCutoff = new Date(Date.now() - Math.max(1, input.projectDeletionAuditRetentionDays) * DAY_MS);
  const ticketNotificationDeliveryCutoff = new Date(
    Date.now() - Math.max(1, input.ticketNotificationDeliveryRetentionDays) * DAY_MS
  );
  const ticketInboundMessageCutoff = new Date(Date.now() - Math.max(1, input.ticketInboundMessageRetentionDays) * DAY_MS);
  const ticketSuppressionCutoff = new Date(Date.now() - Math.max(1, input.ticketSuppressionRetentionDays) * DAY_MS);

  const [
    purgedOrganizations,
    purgedProjectDeletionAudits,
    purgedTicketNotificationDeliveries,
    purgedTicketInboundMessages,
    purgedTicketSuppressions
  ] = await prisma.$transaction([
    prisma.organization.deleteMany({
      where: {
        deletedAt: {
          not: null,
          lte: orgCutoff
        }
      }
    }),
    prisma.auditLog.deleteMany({
      where: {
        actionType: 'project_deleted',
        entityType: 'project',
        createdAt: { lte: projectDeletionAuditCutoff }
      }
    }),
    prisma.ticketNotificationDelivery.deleteMany({
      where: {
        createdAt: { lte: ticketNotificationDeliveryCutoff }
      }
    }),
    prisma.ticketInboundMessageState.deleteMany({
      where: {
        seenAt: { lte: ticketInboundMessageCutoff }
      }
    }),
    prisma.ticketNotificationSuppression.deleteMany({
      where: {
        lastSentAt: { lte: ticketSuppressionCutoff }
      }
    })
  ]);

  return {
    purgedOrganizations: purgedOrganizations.count,
    purgedProjectDeletionAudits: purgedProjectDeletionAudits.count,
    purgedTicketNotificationDeliveries: purgedTicketNotificationDeliveries.count,
    purgedTicketInboundMessages: purgedTicketInboundMessages.count,
    purgedTicketSuppressions: purgedTicketSuppressions.count,
    orgCutoff,
    projectDeletionAuditCutoff,
    ticketNotificationDeliveryCutoff,
    ticketInboundMessageCutoff,
    ticketSuppressionCutoff
  };
};
