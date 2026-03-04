import { ProjectLifecycle } from '@prisma/client';
import { z } from 'zod';

export const paramsSchema = z.object({ orgId: z.string().min(1) });
export const projectParamsSchema = z.object({ orgId: z.string().min(1), projectId: z.string().min(1) });

const metadataSchema = z
  .object({
    startDate: z.number().optional(),
    endDate: z.number().optional(),
    budgetCost: z.number().optional(),
    hourlyRate: z.number().optional(),
    scopeSummary: z.string().optional(),
    scopeSize: z.number().optional(),
    completionComment: z.string().optional(),
    completionRequestedAt: z.number().optional(),
    completionRequestedById: z.string().optional(),
    completionRequestedByName: z.string().optional(),
    completionRequestedComment: z.string().optional(),
    ownerIds: z.array(z.string()).optional(),
    reopenedAt: z.number().optional(),
    reopenedById: z.string().optional(),
    archivedAt: z.number().optional(),
    archivedById: z.string().optional(),
    completedAt: z.number().optional(),
    completedById: z.string().optional(),
    deletedAt: z.number().optional(),
    deletedById: z.string().optional(),
    integrations: z
      .object({
        slack: z
          .object({
            enabled: z.boolean().optional(),
            channel: z.string().optional()
          })
          .optional(),
        github: z
          .object({
            enabled: z.boolean().optional(),
            repo: z.string().optional()
          })
          .optional()
      })
      .optional()
  })
  .optional();

export const createSchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().min(1),
  description: z.string().default(''),
  color: z.string().default('bg-indigo-600'),
  stageDefs: z.array(z.object({ id: z.string().min(1), name: z.string().min(1) })).optional(),
  isPublic: z.boolean().optional(),
  publicToken: z.string().optional(),
  memberIds: z.array(z.string()).default([]),
  metadata: metadataSchema
});

export const updateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  color: z.string().optional(),
  stageDefs: z.array(z.object({ id: z.string().min(1), name: z.string().min(1) })).optional(),
  ownerId: z.string().optional(),
  memberIds: z.array(z.string()).optional(),
  isPublic: z.boolean().optional(),
  publicToken: z.string().optional(),
  lifecycle: z.nativeEnum(ProjectLifecycle).optional(),
  metadata: metadataSchema
});
