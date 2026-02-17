import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { env } from '../../config/env.js';
import { authenticate } from '../../middleware/authenticate.js';
import { requireOrgAccess } from '../../middleware/requireOrgAccess.js';

const router = Router();

const querySchema = z.object({
  orgId: z.string().min(1),
  limit: z.coerce.number().min(1).max(200).default(100)
});

router.get('/', authenticate, requireOrgAccess, async (req, res, next) => {
  try {
    const query = querySchema.parse(req.query);
    const projectDeleteRetentionCutoff = new Date();
    projectDeleteRetentionCutoff.setDate(projectDeleteRetentionCutoff.getDate() - Math.max(1, env.RETENTION_PROJECT_DELETE_AUDIT_DAYS));

    const rows = await prisma.auditLog.findMany({
      where: {
        orgId: query.orgId,
        NOT: {
          AND: [
            { actionType: 'project_deleted' },
            { entityType: 'project' },
            { createdAt: { lte: projectDeleteRetentionCutoff } }
          ]
        }
      },
      orderBy: { createdAt: 'desc' },
      take: query.limit
    });
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
});

export const auditRoutes = router;
