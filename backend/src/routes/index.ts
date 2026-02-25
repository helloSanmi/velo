import { Router } from 'express';
import { authRoutes } from '../modules/auth/auth.routes.js';
import { organizationsRoutes } from '../modules/organizations/organizations.routes.js';
import { usersRoutes } from '../modules/organizations/users.routes.js';
import { organizationsAdminRoutes } from '../modules/organizations/admin.routes.js';
import { invitesRoutes } from '../modules/organizations/invites.routes.js';
import { projectsRoutes } from '../modules/projects/projects.routes.js';
import { tasksRoutes } from '../modules/tasks/tasks.routes.js';
import { aiRoutes } from '../modules/ai/ai.routes.js';
import { usageRoutes } from '../modules/usage/usage.routes.js';
import { auditRoutes } from '../modules/audit/audit.routes.js';
import { realtimeRoutes } from '../modules/realtime/realtime.routes.js';
import { workflowsRoutes } from '../modules/workflows/workflows.routes.js';
import { teamsRoutes } from '../modules/teams/teams.routes.js';
import { githubIntegrationsRoutes } from '../modules/integrations/github.routes.js';
import { integrationsRoutes } from '../modules/integrations/integrations.routes.js';
import { ticketsRoutes } from '../modules/tickets/tickets.routes.js';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok', timestamp: Date.now() } });
});

router.use('/auth', authRoutes);
router.use(organizationsRoutes);
router.use(usersRoutes);
router.use(organizationsAdminRoutes);
router.use(invitesRoutes);
router.use(projectsRoutes);
router.use(tasksRoutes);
router.use(teamsRoutes);
router.use(aiRoutes);
router.use(usageRoutes);
router.use('/audit', auditRoutes);
router.use('/realtime', realtimeRoutes);
router.use(workflowsRoutes);
router.use(githubIntegrationsRoutes);
router.use(integrationsRoutes);
router.use(ticketsRoutes);

export const apiV1Router = router;
