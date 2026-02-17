import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/authenticate.js';
import { requireOrgAccess } from '../../middleware/requireOrgAccess.js';
import { tasksService } from './tasks.service.js';

const router = Router();

const orgParams = z.object({ orgId: z.string().min(1) });
const projectParams = z.object({ orgId: z.string().min(1), projectId: z.string().min(1) });
const taskParams = z.object({ orgId: z.string().min(1), projectId: z.string().min(1), taskId: z.string().min(1) });

const createSchema = z.object({
  title: z.string().min(1),
  description: z.string().default(''),
  status: z.string().default('todo'),
  priority: z.string().default('Medium'),
  dueDate: z.coerce.date().optional(),
  assigneeIds: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional()
});

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  dueDate: z.union([z.coerce.date(), z.null()]).optional(),
  assigneeIds: z.array(z.string()).optional(),
  securityGroupIds: z.array(z.string()).optional(),
  blockedByIds: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  comments: z.array(z.record(z.unknown())).optional(),
  subtasks: z.array(z.record(z.unknown())).optional(),
  auditLog: z.array(z.record(z.unknown())).optional(),
  timeLoggedMs: z.number().int().nonnegative().optional(),
  isTimerRunning: z.boolean().optional(),
  timerStartedAt: z.union([z.coerce.date(), z.null()]).optional(),
  metadata: z.record(z.unknown()).optional()
});

router.get('/orgs/:orgId/tasks', authenticate, requireOrgAccess, async (req, res, next) => {
  try {
    const { orgId } = orgParams.parse(req.params);
    const projectId = typeof req.query.projectId === 'string' ? req.query.projectId : undefined;
    const rows = await tasksService.list({ orgId, projectId });
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
});

router.post('/orgs/:orgId/projects/:projectId/tasks', authenticate, requireOrgAccess, async (req, res, next) => {
  try {
    const { orgId, projectId } = projectParams.parse(req.params);
    const body = createSchema.parse(req.body);
    const task = await tasksService.create({
      orgId,
      projectId,
      actor: { userId: req.auth!.userId, role: req.auth!.role },
      ...body
    });
    res.status(201).json({ success: true, data: task });
  } catch (error) {
    next(error);
  }
});

router.patch('/orgs/:orgId/projects/:projectId/tasks/:taskId', authenticate, requireOrgAccess, async (req, res, next) => {
  try {
    const { orgId, projectId, taskId } = taskParams.parse(req.params);
    const patch = updateSchema.parse(req.body);
    const task = await tasksService.update({
      orgId,
      projectId,
      taskId,
      actor: { userId: req.auth!.userId, role: req.auth!.role },
      patch
    });
    res.json({ success: true, data: task });
  } catch (error) {
    next(error);
  }
});

router.delete('/orgs/:orgId/projects/:projectId/tasks/:taskId', authenticate, requireOrgAccess, async (req, res, next) => {
  try {
    const { orgId, projectId, taskId } = taskParams.parse(req.params);
    await tasksService.remove({
      orgId,
      projectId,
      taskId,
      actor: { userId: req.auth!.userId, role: req.auth!.role }
    });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export const tasksRoutes = router;
