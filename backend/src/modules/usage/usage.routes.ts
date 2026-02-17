import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/authenticate.js';
import { requireOrgAccess } from '../../middleware/requireOrgAccess.js';
import { usageService } from './usage.service.js';
import { enforce } from '../policy/policy.service.js';

const router = Router();

const paramsSchema = z.object({ orgId: z.string().min(1) });

router.get('/orgs/:orgId/usage/ai', authenticate, requireOrgAccess, async (req, res, next) => {
  try {
    const { orgId } = paramsSchema.parse(req.params);
    enforce('org:usage-read', {
      role: req.auth!.role,
      userId: req.auth!.userId,
      isProjectMember: true
    });
    const data = await usageService.getUsage(orgId, 60);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

export const usageRoutes = router;
