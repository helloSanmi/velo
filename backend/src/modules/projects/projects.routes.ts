import { ProjectLifecycle } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/authenticate.js';
import { requireOrgAccess } from '../../middleware/requireOrgAccess.js';
import { projectsService } from './projects.service.js';

const router = Router();

const paramsSchema = z.object({ orgId: z.string().min(1) });
const projectParamsSchema = z.object({ orgId: z.string().min(1), projectId: z.string().min(1) });

const createSchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().min(1),
  description: z.string().default(''),
  color: z.string().default('bg-indigo-600'),
  isPublic: z.boolean().optional(),
  publicToken: z.string().optional(),
  memberIds: z.array(z.string()).default([]),
  metadata: z
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
    .optional()
});

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  color: z.string().optional(),
  ownerId: z.string().optional(),
  memberIds: z.array(z.string()).optional(),
  isPublic: z.boolean().optional(),
  publicToken: z.string().optional(),
  lifecycle: z.nativeEnum(ProjectLifecycle).optional(),
  metadata: z
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
    .optional()
});

router.get('/orgs/:orgId/projects', authenticate, requireOrgAccess, async (req, res, next) => {
  try {
    const { orgId } = paramsSchema.parse(req.params);
    const rows = await projectsService.list(orgId);
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
});

router.post('/orgs/:orgId/projects', authenticate, requireOrgAccess, async (req, res, next) => {
  try {
    const { orgId } = paramsSchema.parse(req.params);
    const body = createSchema.parse(req.body);
    const row = await projectsService.create({
      orgId,
      actor: { userId: req.auth!.userId, role: req.auth!.role },
      ...body
    });
    res.status(201).json({ success: true, data: row });
  } catch (error) {
    next(error);
  }
});

router.patch('/orgs/:orgId/projects/:projectId', authenticate, requireOrgAccess, async (req, res, next) => {
  try {
    const { orgId, projectId } = projectParamsSchema.parse(req.params);
    const patch = updateSchema.parse(req.body);
    const row = await projectsService.update({
      orgId,
      projectId,
      actor: { userId: req.auth!.userId, role: req.auth!.role },
      patch
    });
    res.json({ success: true, data: row });
  } catch (error) {
    next(error);
  }
});

router.delete('/orgs/:orgId/projects/:projectId', authenticate, requireOrgAccess, async (req, res, next) => {
  try {
    const { orgId, projectId } = projectParamsSchema.parse(req.params);
    await projectsService.remove({
      orgId,
      projectId,
      actor: { userId: req.auth!.userId, role: req.auth!.role }
    });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export const projectsRoutes = router;
