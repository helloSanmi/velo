import type { RequestHandler } from 'express';
import { z } from 'zod';
import { authService } from './auth.service.js';
import {
  acceptInviteSchema,
  changePasswordSchema,
  loginSchema,
  refreshSchema,
  registerSchema,
  resetPasswordSchema
} from './auth.routes.schemas.js';

const withRoute =
  (handler: RequestHandler): RequestHandler =>
  async (req, res, next) => {
    try {
      await handler(req, res, next);
    } catch (error) {
      next(error);
    }
  };

export const registerHandler = withRoute(async (req, res) => {
  const body = registerSchema.parse(req.body);
  const result = await authService.register({
    ...body,
    userAgent: req.headers['user-agent'],
    ipAddress: req.ip
  });
  res.status(201).json({ success: true, data: result });
});

export const acceptInviteHandler = withRoute(async (req, res) => {
  const body = acceptInviteSchema.parse(req.body);
  const result = await authService.acceptInvite({
    ...body,
    userAgent: req.headers['user-agent'],
    ipAddress: req.ip
  });
  res.json({ success: true, data: result });
});

export const previewInviteHandler = withRoute(async (req, res) => {
  const token = z.string().min(1).parse(req.params.token);
  const result = await authService.previewInvite(token);
  res.json({ success: true, data: result });
});

export const loginHandler = withRoute(async (req, res) => {
  const body = loginSchema.parse(req.body);
  const result = await authService.login({
    ...body,
    userAgent: req.headers['user-agent'],
    ipAddress: req.ip
  });
  res.json({ success: true, data: result });
});

export const refreshHandler = withRoute(async (req, res) => {
  const body = refreshSchema.parse(req.body);
  const result = await authService.refresh({
    ...body,
    userAgent: req.headers['user-agent'],
    ipAddress: req.ip
  });
  res.json({ success: true, data: result });
});

export const logoutHandler = withRoute(async (req, res) => {
  await authService.logout({
    sessionId: req.auth!.sessionId,
    orgId: req.auth!.orgId,
    userId: req.auth!.userId,
    userAgent: req.headers['user-agent'],
    ipAddress: req.ip
  });
  res.json({ success: true });
});

export const changePasswordHandler = withRoute(async (req, res) => {
  const body = changePasswordSchema.parse(req.body);
  await authService.changePassword({
    orgId: req.auth!.orgId,
    userId: req.auth!.userId,
    sessionId: req.auth!.sessionId,
    currentPassword: body.currentPassword,
    newPassword: body.newPassword
  });
  res.json({ success: true });
});

export const resetPasswordHandler = withRoute(async (req, res) => {
  const body = resetPasswordSchema.parse(req.body);
  await authService.resetPassword({
    identifier: body.identifier,
    workspaceDomain: body.workspaceDomain,
    newPassword: body.newPassword
  });
  res.json({ success: true });
});

export const meHandler = withRoute(async (req, res) => {
  const me = await authService.me(req.auth!);
  res.json({ success: true, data: me });
});
