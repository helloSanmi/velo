import { UserRole } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/authenticate.js';
import { requireOrgAccess } from '../../middleware/requireOrgAccess.js';
import { organizationsService } from './organizations.service.js';

const router = Router();

const paramsSchema = z.object({ orgId: z.string().min(1) });
const roleSchema = z.object({ userId: z.string().min(1), role: z.nativeEnum(UserRole) });
const deleteSchema = z.object({ confirmation: z.string().min(1) });
const settingsSchema = z.object({
  loginSubdomain: z.string().min(2).max(40).optional(),
  allowMicrosoftAuth: z.boolean().optional(),
  microsoftWorkspaceConnected: z.boolean().optional()
});

router.get('/orgs/:orgId', authenticate, requireOrgAccess, async (req, res, next) => {
  try {
    const { orgId } = paramsSchema.parse(req.params);
    const org = await organizationsService.get(orgId);
    res.json({ success: true, data: org });
  } catch (error) {
    next(error);
  }
});

router.patch('/orgs/:orgId/users/role', authenticate, requireOrgAccess, async (req, res, next) => {
  try {
    const { orgId } = paramsSchema.parse(req.params);
    const body = roleSchema.parse(req.body);
    const row = await organizationsService.updateUserRole({
      orgId,
      actor: { userId: req.auth!.userId, role: req.auth!.role },
      userId: body.userId,
      role: body.role
    });
    res.json({ success: true, data: row });
  } catch (error) {
    next(error);
  }
});

router.patch('/orgs/:orgId/settings', authenticate, requireOrgAccess, async (req, res, next) => {
  try {
    const { orgId } = paramsSchema.parse(req.params);
    const body = settingsSchema.parse(req.body);
    const row = await organizationsService.updateSettings({
      orgId,
      actor: { userId: req.auth!.userId, role: req.auth!.role },
      patch: body
    });
    res.json({ success: true, data: row });
  } catch (error) {
    next(error);
  }
});

router.delete('/orgs/:orgId', authenticate, requireOrgAccess, async (req, res, next) => {
  try {
    const { orgId } = paramsSchema.parse(req.params);
    const body = deleteSchema.parse(req.body);
    const result = await organizationsService.markDeleted({
      orgId,
      actor: { userId: req.auth!.userId, role: req.auth!.role },
      confirmation: body.confirmation
    });
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

export const organizationsRoutes = router;
