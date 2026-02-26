import { createId } from '../../lib/ids.js';
import { prisma } from '../../lib/prisma.js';

const MAX_INBOUND_HISTORY = 5000;
const MAX_SUPPRESSION_HISTORY = 10000;

const pruneSuppressionHistory = async (orgId: string): Promise<void> => {
  const staleRows = await prisma.ticketNotificationSuppression.findMany({
    where: { orgId },
    orderBy: { lastSentAt: 'desc' },
    skip: MAX_SUPPRESSION_HISTORY,
    select: { id: true }
  });
  if (staleRows.length === 0) return;
  await prisma.ticketNotificationSuppression.deleteMany({
    where: {
      id: { in: staleRows.map((row) => row.id) }
    }
  });
};

const pruneInboundHistory = async (orgId: string): Promise<void> => {
  const staleRows = await prisma.ticketInboundMessageState.findMany({
    where: { orgId },
    orderBy: { seenAt: 'desc' },
    skip: MAX_INBOUND_HISTORY,
    select: { id: true }
  });
  if (staleRows.length === 0) return;
  await prisma.ticketInboundMessageState.deleteMany({
    where: {
      id: { in: staleRows.map((row) => row.id) }
    }
  });
};

export const ticketsNotificationStore = {
  async shouldSend(input: {
    orgId: string;
    suppressionKey: string;
    dedupWindowMs: number;
  }): Promise<boolean> {
    const row = await prisma.ticketNotificationSuppression.findUnique({
      where: {
        orgId_suppressionKey: {
          orgId: input.orgId,
          suppressionKey: input.suppressionKey
        }
      },
      select: { lastSentAt: true }
    });
    if (!row) return true;
    return Date.now() - row.lastSentAt.getTime() >= input.dedupWindowMs;
  },

  async markSent(input: { orgId: string; suppressionKey: string }): Promise<void> {
    await prisma.ticketNotificationSuppression.upsert({
      where: {
        orgId_suppressionKey: {
          orgId: input.orgId,
          suppressionKey: input.suppressionKey
        }
      },
      create: {
        id: createId('tns'),
        orgId: input.orgId,
        suppressionKey: input.suppressionKey,
        lastSentAt: new Date()
      },
      update: {
        lastSentAt: new Date()
      }
    });
    await pruneSuppressionHistory(input.orgId);
  },

  async hasSeenInboundMessage(input: { orgId: string; messageKey: string }): Promise<boolean> {
    const row = await prisma.ticketInboundMessageState.findUnique({
      where: {
        orgId_messageKey: {
          orgId: input.orgId,
          messageKey: input.messageKey
        }
      },
      select: { id: true }
    });
    return Boolean(row);
  },

  async markInboundMessageSeen(input: { orgId: string; messageKey: string }): Promise<void> {
    await prisma.ticketInboundMessageState.upsert({
      where: {
        orgId_messageKey: {
          orgId: input.orgId,
          messageKey: input.messageKey
        }
      },
      create: {
        id: createId('tim'),
        orgId: input.orgId,
        messageKey: input.messageKey,
        seenAt: new Date()
      },
      update: {
        seenAt: new Date()
      }
    });
    await pruneInboundHistory(input.orgId);
  }
};
