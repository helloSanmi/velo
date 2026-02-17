import { prisma } from '../../lib/prisma.js';

const DAY_MS = 24 * 60 * 60 * 1000;

export interface RetentionCleanupInput {
  orgRetentionDays: number;
  projectDeletionAuditRetentionDays: number;
}

export interface RetentionCleanupResult {
  purgedOrganizations: number;
  purgedProjectDeletionAudits: number;
  orgCutoff: Date;
  projectDeletionAuditCutoff: Date;
}

export const runRetentionCleanup = async (input: RetentionCleanupInput): Promise<RetentionCleanupResult> => {
  const orgCutoff = new Date(Date.now() - Math.max(1, input.orgRetentionDays) * DAY_MS);
  const projectDeletionAuditCutoff = new Date(Date.now() - Math.max(1, input.projectDeletionAuditRetentionDays) * DAY_MS);

  const [purgedOrganizations, purgedProjectDeletionAudits] = await prisma.$transaction([
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
    })
  ]);

  return {
    purgedOrganizations: purgedOrganizations.count,
    purgedProjectDeletionAudits: purgedProjectDeletionAudits.count,
    orgCutoff,
    projectDeletionAuditCutoff
  };
};
