import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { requireOrgAccess } from '../../middleware/requireOrgAccess.js';
import {
  createProjectHandler,
  deleteProjectHandler,
  listProjectsHandler,
  updateProjectHandler
} from './projects.routes.handlers.js';

const router = Router();

router.get('/orgs/:orgId/projects', authenticate, requireOrgAccess, listProjectsHandler);
router.post('/orgs/:orgId/projects', authenticate, requireOrgAccess, createProjectHandler);
router.patch('/orgs/:orgId/projects/:projectId', authenticate, requireOrgAccess, updateProjectHandler);
router.delete('/orgs/:orgId/projects/:projectId', authenticate, requireOrgAccess, deleteProjectHandler);

export const projectsRoutes = router;
