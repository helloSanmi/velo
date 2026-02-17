import { AuditActionType } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { createId } from '../../lib/ids.js';

export interface WriteAuditInput {
  orgId: string;
  userId?: string;
  actionType: AuditActionType;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: unknown;
  ipAddress?: string;
  userAgent?: string;
}

export const writeAudit = async (input: WriteAuditInput): Promise<void> => {
  await prisma.auditLog.create({
    data: {
      id: createId('audit'),
      orgId: input.orgId,
      userId: input.userId,
      actionType: input.actionType,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      metadata: input.metadata as object | undefined,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent
    }
  });
};
