import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { requireOrgAccess } from '../../middleware/requireOrgAccess.js';
import { orgParamsSchema, teamIdSchema, teamPatchSchema, teamSchema } from './teams.schemas.js';
import { createTeam, deleteTeam, listTeams, updateTeam } from './teams.service.js';

const router = Router();

router.get('/orgs/:orgId/teams', authenticate, requireOrgAccess, async (req, res, next) => {
  try {
    const { orgId } = orgParamsSchema.parse(req.params);
    const rows = await listTeams(orgId);
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
});

router.post('/orgs/:orgId/teams', authenticate, requireOrgAccess, async (req, res, next) => {
  try {
    const { orgId } = orgParamsSchema.parse(req.params);
    const body = teamSchema.parse(req.body);
    const row = await createTeam({
      orgId,
      actorUserId: req.auth!.userId,
      actorRole: req.auth!.role,
      name: body.name,
      description: body.description,
      leadId: body.leadId,
      memberIds: body.memberIds || []
    });
    res.status(201).json({ success: true, data: row });
  } catch (error) {
    next(error);
  }
});

router.patch('/orgs/:orgId/teams/:teamId', authenticate, requireOrgAccess, async (req, res, next) => {
  try {
    const { orgId } = orgParamsSchema.parse(req.params);
    const teamId = teamIdSchema.parse(req.params.teamId);
    const patch = teamPatchSchema.parse(req.body);
    const row = await updateTeam({
      orgId,
      teamId,
      actorUserId: req.auth!.userId,
      actorRole: req.auth!.role,
      patch
    });
    res.json({ success: true, data: row });
  } catch (error) {
    next(error);
  }
});

router.delete('/orgs/:orgId/teams/:teamId', authenticate, requireOrgAccess, async (req, res, next) => {
  try {
    const { orgId } = orgParamsSchema.parse(req.params);
    const teamId = teamIdSchema.parse(req.params.teamId);
    await deleteTeam({
      orgId,
      teamId,
      actorUserId: req.auth!.userId,
      actorRole: req.auth!.role
    });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export const teamsRoutes = router;

