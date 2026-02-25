import { UserRole } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/authenticate.js';
import { requireOrgAccess } from '../../middleware/requireOrgAccess.js';
import { HttpError } from '../../lib/httpError.js';
import { prisma } from '../../lib/prisma.js';
import { workflowsStore } from './workflows.store.js';

const router = Router();

const orgParamsSchema = z.object({ orgId: z.string().min(1) });
const ruleParamsSchema = z.object({ orgId: z.string().min(1), ruleId: z.string().min(1) });

const createSchema = z.object({
  projectId: z.string().optional(),
  name: z.string().min(1),
  trigger: z.enum(['TASK_CREATED', 'STATUS_CHANGED', 'PRIORITY_CHANGED']),
  triggerValue: z.string().optional(),
  action: z.enum(['SET_PRIORITY', 'ASSIGN_USER', 'ADD_TAG', 'NOTIFY_OWNER']),
  actionValue: z.string().optional(),
  isActive: z.boolean().default(true)
});

const updateSchema = z.object({
  projectId: z.string().optional(),
  name: z.string().min(1).optional(),
  trigger: z.enum(['TASK_CREATED', 'STATUS_CHANGED', 'PRIORITY_CHANGED']).optional(),
  triggerValue: z.string().optional(),
  action: z.enum(['SET_PRIORITY', 'ASSIGN_USER', 'ADD_TAG', 'NOTIFY_OWNER']).optional(),
  actionValue: z.string().optional(),
  isActive: z.boolean().optional()
});

const getProjectOwnerIds = (project: { ownerId: string; createdBy: string; metadata: unknown }): string[] => {
  const metadataOwnerIds =
    project.metadata && typeof project.metadata === 'object' && Array.isArray((project.metadata as Record<string, unknown>).ownerIds)
      ? ((project.metadata as Record<string, unknown>).ownerIds as unknown[]).filter((value): value is string => typeof value === 'string')
      : [];
  return Array.from(new Set([project.ownerId, project.createdBy, ...metadataOwnerIds].filter(Boolean)));
};

const enforceWorkflowManageAccess = async (input: {
  orgId: string;
  role: UserRole;
  userId: string;
  projectId?: string;
}) => {
  if (input.role === 'admin') return;
  if (!input.projectId) throw new HttpError(403, 'Only admins can manage org-wide workflow rules.');
  const project = await prisma.project.findUnique({
    where: { id: input.projectId },
    select: { id: true, orgId: true, ownerId: true, createdBy: true, metadata: true }
  });
  if (!project || project.orgId !== input.orgId) throw new HttpError(404, 'Project not found.');
  const ownerIds = getProjectOwnerIds(project);
  if (!ownerIds.includes(input.userId)) {
    throw new HttpError(403, 'Only project owners/admins can manage workflow rules.');
  }
};

router.get('/orgs/:orgId/workflows', authenticate, requireOrgAccess, async (req, res, next) => {
  try {
    const { orgId } = orgParamsSchema.parse(req.params);
    const rows = await workflowsStore.list(orgId);
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
});

router.post('/orgs/:orgId/workflows', authenticate, requireOrgAccess, async (req, res, next) => {
  try {
    const { orgId } = orgParamsSchema.parse(req.params);
    const body = createSchema.parse(req.body);
    await enforceWorkflowManageAccess({
      orgId,
      role: req.auth!.role,
      userId: req.auth!.userId,
      projectId: body.projectId
    });
    const created = await workflowsStore.create({ ...body, orgId });
    res.status(201).json({ success: true, data: created });
  } catch (error) {
    next(error);
  }
});

router.patch('/orgs/:orgId/workflows/:ruleId', authenticate, requireOrgAccess, async (req, res, next) => {
  try {
    const { orgId, ruleId } = ruleParamsSchema.parse(req.params);
    const patch = updateSchema.parse(req.body);
    const existing = await workflowsStore.get(orgId, ruleId);
    if (!existing) throw new HttpError(404, 'Workflow rule not found.');
    const targetProjectId = patch.projectId !== undefined ? patch.projectId : existing.projectId;
    await enforceWorkflowManageAccess({
      orgId,
      role: req.auth!.role,
      userId: req.auth!.userId,
      projectId: targetProjectId
    });
    const updated = await workflowsStore.update(orgId, ruleId, patch);
    if (!updated) throw new HttpError(404, 'Workflow rule not found.');
    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

router.delete('/orgs/:orgId/workflows/:ruleId', authenticate, requireOrgAccess, async (req, res, next) => {
  try {
    const { orgId, ruleId } = ruleParamsSchema.parse(req.params);
    const existing = await workflowsStore.get(orgId, ruleId);
    if (!existing) throw new HttpError(404, 'Workflow rule not found.');
    await enforceWorkflowManageAccess({
      orgId,
      role: req.auth!.role,
      userId: req.auth!.userId,
      projectId: existing.projectId
    });
    await workflowsStore.remove(orgId, ruleId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export const workflowsRoutes = router;

