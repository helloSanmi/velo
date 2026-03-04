import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/authenticate.js';
import { requireOrgAccess } from '../../middleware/requireOrgAccess.js';
import {
  addSeatsSchema,
  importUsersSchema,
  orgParamsSchema,
  provisionUserSchema,
  updateLicenseSchema,
  updateUserSchema
} from './admin.schemas.js';
import {
  addOrgSeats,
  deleteOrgUser,
  importOrgUsers,
  provisionOrgUser,
  updateOrgUser,
  updateOrgUserLicense
} from './admin.service.js';

const router = Router();

router.post('/orgs/:orgId/seats/add', authenticate, requireOrgAccess, async (req, res, next) => {
  try {
    const { orgId } = orgParamsSchema.parse(req.params);
    const { seatsToAdd } = addSeatsSchema.parse(req.body);
    const data = await addOrgSeats({
      orgId,
      seatsToAdd,
      actor: { userId: req.auth!.userId, role: req.auth!.role }
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.post('/orgs/:orgId/users', authenticate, requireOrgAccess, async (req, res, next) => {
  try {
    const { orgId } = orgParamsSchema.parse(req.params);
    const body = provisionUserSchema.parse(req.body);
    const data = await provisionOrgUser({
      orgId,
      body,
      actor: { userId: req.auth!.userId, role: req.auth!.role }
    });
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.patch('/orgs/:orgId/users/:userId', authenticate, requireOrgAccess, async (req, res, next) => {
  try {
    const { orgId } = orgParamsSchema.parse(req.params);
    const userId = z.string().min(1).parse(req.params.userId);
    const body = updateUserSchema.parse(req.body);
    const data = await updateOrgUser({
      orgId,
      userId,
      body,
      actor: { userId: req.auth!.userId, role: req.auth!.role }
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.patch('/orgs/:orgId/users/:userId/license', authenticate, requireOrgAccess, async (req, res, next) => {
  try {
    const { orgId } = orgParamsSchema.parse(req.params);
    const userId = z.string().min(1).parse(req.params.userId);
    const { licenseActive } = updateLicenseSchema.parse(req.body);
    const data = await updateOrgUserLicense({
      orgId,
      userId,
      licenseActive,
      actor: { userId: req.auth!.userId, role: req.auth!.role }
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.delete('/orgs/:orgId/users/:userId', authenticate, requireOrgAccess, async (req, res, next) => {
  try {
    const { orgId } = orgParamsSchema.parse(req.params);
    const userId = z.string().min(1).parse(req.params.userId);
    await deleteOrgUser({
      orgId,
      userId,
      actor: { userId: req.auth!.userId, role: req.auth!.role }
    });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.post('/orgs/:orgId/users/import', authenticate, requireOrgAccess, async (req, res, next) => {
  try {
    const { orgId } = orgParamsSchema.parse(req.params);
    const body = importUsersSchema.parse(req.body);
    const data = await importOrgUsers({
      orgId,
      body,
      actor: { userId: req.auth!.userId, role: req.auth!.role }
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

export const organizationsAdminRoutes = router;

