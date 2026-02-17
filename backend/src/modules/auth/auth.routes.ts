import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/authenticate.js';
import { authService } from './auth.service.js';

const router = Router();

const loginSchema = z.object({
  identifier: z.string().min(1),
  password: z.string().min(1)
});

const registerSchema = z.object({
  identifier: z.string().min(1),
  password: z.string().min(1),
  orgName: z.string().min(1),
  plan: z.enum(['free', 'basic', 'pro']).default('basic'),
  totalSeats: z.coerce.number().int().min(1).optional()
});

const acceptInviteSchema = z.object({
  token: z.string().min(1),
  identifier: z.string().min(1),
  password: z.string().min(1)
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1)
});

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(6),
    confirmPassword: z.string().min(6)
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: 'New password and confirmation must match.',
    path: ['confirmPassword']
  });

router.post('/register', async (req, res, next) => {
  try {
    const body = registerSchema.parse(req.body);
    const result = await authService.register({
      ...body,
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip
    });
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

router.post('/invites/accept', async (req, res, next) => {
  try {
    const body = acceptInviteSchema.parse(req.body);
    const result = await authService.acceptInvite({
      ...body,
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip
    });
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const body = loginSchema.parse(req.body);
    const result = await authService.login({
      ...body,
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip
    });
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

router.post('/refresh', async (req, res, next) => {
  try {
    const body = refreshSchema.parse(req.body);
    const result = await authService.refresh({
      ...body,
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip
    });
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

router.post('/logout', authenticate, async (req, res, next) => {
  try {
    await authService.logout({
      sessionId: req.auth!.sessionId,
      orgId: req.auth!.orgId,
      userId: req.auth!.userId,
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip
    });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.post('/change-password', authenticate, async (req, res, next) => {
  try {
    const body = changePasswordSchema.parse(req.body);
    await authService.changePassword({
      orgId: req.auth!.orgId,
      userId: req.auth!.userId,
      sessionId: req.auth!.sessionId,
      currentPassword: body.currentPassword,
      newPassword: body.newPassword
    });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.get('/me', authenticate, async (req, res, next) => {
  try {
    const me = await authService.me(req.auth!);
    res.json({ success: true, data: me });
  } catch (error) {
    next(error);
  }
});

export const authRoutes = router;
