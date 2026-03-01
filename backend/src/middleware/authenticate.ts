import type { NextFunction, Request, Response } from 'express';
import { HttpError } from '../lib/httpError.js';
import { prisma } from '../lib/prisma.js';
import { verifyAccessToken } from '../modules/auth/auth.tokens.js';

export const authenticate = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new HttpError(401, 'Missing or invalid authorization header.');
    }

    const token = authHeader.slice('Bearer '.length);
    const payload = verifyAccessToken(token);

    const [session, user] = await Promise.all([
      prisma.session.findUnique({
        where: { id: payload.sessionId },
        select: { id: true, orgId: true, userId: true, isRevoked: true, expiresAt: true }
      }),
      prisma.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, orgId: true, role: true, licenseActive: true }
      })
    ]);

    if (!session || session.isRevoked || session.expiresAt.getTime() <= Date.now()) {
      throw new HttpError(401, 'Session expired.');
    }
    if (session.orgId !== payload.orgId || session.userId !== payload.userId) {
      throw new HttpError(401, 'Session mismatch.');
    }
    if (!user || user.orgId !== payload.orgId) {
      throw new HttpError(401, 'User not found.');
    }
    if (!user.licenseActive) {
      throw new HttpError(403, 'No active license assigned for this account. Contact your workspace admin.', {
        code: 'LICENSE_REQUIRED'
      });
    }

    req.auth = {
      userId: payload.userId,
      orgId: payload.orgId,
      sessionId: payload.sessionId,
      role: user.role
    };
    next();
  } catch (error) {
    next(error);
  }
};
