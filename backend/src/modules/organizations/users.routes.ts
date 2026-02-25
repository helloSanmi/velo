import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/authenticate.js';
import { requireOrgAccess } from '../../middleware/requireOrgAccess.js';
import { prisma } from '../../lib/prisma.js';

const router = Router();
const paramsSchema = z.object({ orgId: z.string().min(1) });

router.get('/orgs/:orgId/users', authenticate, requireOrgAccess, async (req, res, next) => {
  try {
    const { orgId } = paramsSchema.parse(req.params);
    const users = await prisma.user.findMany({
      where: { orgId },
      select: {
        id: true,
        orgId: true,
        username: true,
        displayName: true,
        firstName: true,
        lastName: true,
        email: true,
        avatar: true,
        role: true,
        licenseActive: true,
        mustChangePassword: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { createdAt: 'asc' }
    });
    res.json({ success: true, data: users });
  } catch (error) {
    next(error);
  }
});

export const usersRoutes = router;
