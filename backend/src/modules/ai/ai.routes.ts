import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/authenticate.js';
import { requireOrgAccess } from '../../middleware/requireOrgAccess.js';
import { aiService } from './ai.service.js';
import { enforce } from '../policy/policy.service.js';
import { prisma } from '../../lib/prisma.js';

const router = Router();

const paramsSchema = z.object({ orgId: z.string().min(1) });
const aiFeatureSchema = z.enum([
  'project_tasks_from_brief',
  'task_breakdown',
  'task_tags',
  'task_description',
  'task_risk',
  'task_triage',
  'board_chat',
  'voice_assistant_actions',
  'project_tasks_from_document',
  'workload_balance',
  'task_due_date',
  'image_to_tasks',
  'health_insights'
]);
const generateSchema = z.object({
  feature: aiFeatureSchema,
  prompt: z.string().min(1)
});

router.post('/orgs/:orgId/ai/generate', authenticate, requireOrgAccess, async (req, res, next) => {
  try {
    const { orgId } = paramsSchema.parse(req.params);
    const body = generateSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { id: req.auth!.userId } });
    if (!user) throw new Error('User not found.');

    enforce('ai:run', {
      role: req.auth!.role,
      userId: req.auth!.userId,
      isProjectMember: true,
      projectOwnerId: req.auth!.role === 'admin' ? req.auth!.userId : undefined
    });

    const out = await aiService.generate({
      orgId,
      userId: req.auth!.userId,
      feature: body.feature,
      prompt: body.prompt
    });

    res.json({ success: true, data: out });
  } catch (error) {
    next(error);
  }
});

router.get('/orgs/:orgId/ai/interactions', authenticate, requireOrgAccess, async (req, res, next) => {
  try {
    const { orgId } = paramsSchema.parse(req.params);
    enforce('org:usage-read', {
      role: req.auth!.role,
      userId: req.auth!.userId,
      isProjectMember: true
    });

    const rows = await prisma.aiInteraction.findMany({
      where: { orgId },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
});

export const aiRoutes = router;
