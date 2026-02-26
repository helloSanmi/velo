import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/authenticate.js';
import { authService } from './auth.service.js';
import { buildOauthConnectUrl, buildOauthDirectoryUrl, buildOauthStartUrl, completeOauthCallback, getOauthProviderAvailability, listDirectoryUsers } from './auth.oauth.js';

const router = Router();

const loginSchema = z.object({
  identifier: z.string().min(1),
  password: z.string().min(1),
  workspaceDomain: z.string().optional()
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
  identifier: z.string().min(1).optional(),
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

const resetPasswordSchema = z.object({
  identifier: z.string().min(1),
  workspaceDomain: z.string().optional(),
  newPassword: z.string().min(1),
  confirmPassword: z.string().min(1)
});

const oauthProviderSchema = z.enum(['microsoft']);

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

router.get('/invites/:token', async (req, res, next) => {
  try {
    const token = z.string().min(1).parse(req.params.token);
    const result = await authService.previewInvite(token);
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

router.post('/reset-password', async (req, res, next) => {
  try {
    const body = resetPasswordSchema.parse(req.body);
    await authService.resetPassword({
      identifier: body.identifier,
      workspaceDomain: body.workspaceDomain,
      newPassword: body.newPassword
    });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.get('/oauth/providers', async (req, res, next) => {
  try {
    const workspaceDomain = z.string().optional().parse(req.query.workspaceDomain);
    const result = await getOauthProviderAvailability(workspaceDomain);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

router.get('/oauth/:provider/start', async (req, res, next) => {
  try {
    const provider = oauthProviderSchema.parse(req.params.provider);
    const workspaceDomain = z.string().optional().parse(req.query.workspaceDomain);
    const returnOrigin = z.string().optional().parse(req.query.returnOrigin);
    const url = await buildOauthStartUrl(provider, workspaceDomain, returnOrigin);
    res.redirect(url);
  } catch (error) {
    next(error);
  }
});

router.get('/oauth/:provider/connect-url', authenticate, async (req, res, next) => {
  try {
    const provider = oauthProviderSchema.parse(req.params.provider);
    const workspaceDomain = z.string().optional().parse(req.query.workspaceDomain);
    const returnOrigin = z.string().optional().parse(req.query.returnOrigin);
    const url = await buildOauthConnectUrl({
      provider,
      workspaceDomain,
      returnOrigin,
      actor: {
        userId: req.auth!.userId,
        orgId: req.auth!.orgId,
        role: req.auth!.role
      }
    });
    res.json({ success: true, data: { url } });
  } catch (error) {
    next(error);
  }
});

router.get('/oauth/:provider/directory-url', authenticate, async (req, res, next) => {
  try {
    const provider = oauthProviderSchema.parse(req.params.provider);
    const returnOrigin = z.string().optional().parse(req.query.returnOrigin);
    const url = await buildOauthDirectoryUrl({
      provider,
      returnOrigin,
      actor: {
        userId: req.auth!.userId,
        orgId: req.auth!.orgId,
        role: req.auth!.role
      }
    });
    res.json({ success: true, data: { url } });
  } catch (error) {
    next(error);
  }
});

router.get('/oauth/:provider/directory', authenticate, async (req, res, next) => {
  try {
    const provider = oauthProviderSchema.parse(req.params.provider);
    const data = await listDirectoryUsers({
      provider,
      actor: {
        userId: req.auth!.userId,
        orgId: req.auth!.orgId,
        role: req.auth!.role
      }
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.get('/oauth/:provider/callback', async (req, res, next) => {
  try {
    // OAuth popup callback uses inline script + window.opener communication.
    // Override strict defaults so the popup can postMessage then close.
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
    res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';");

    const provider = oauthProviderSchema.parse(req.params.provider);
    const code = z.string().optional().parse(req.query.code);
    const state = z.string().optional().parse(req.query.state);
    const oauthError = z.string().optional().parse(req.query.error);
    const errorDescription = z.string().optional().parse(req.query.error_description);
    const html = await completeOauthCallback({
      provider,
      code,
      state,
      error: oauthError,
      errorDescription,
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip
    });
    // Allow inline script on this small popup callback page so it can postMessage + close.
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline';");
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(html);
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
