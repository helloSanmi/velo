import type { NextFunction, Request, Response } from 'express';
import { HttpError } from '../lib/httpError.js';

export const requireOrgAccess = (req: Request, _res: Response, next: NextFunction): void => {
  if (!req.auth) {
    next(new HttpError(401, 'Authentication required.'));
    return;
  }

  const requestedOrgId =
    (typeof req.params.orgId === 'string' ? req.params.orgId : undefined) ||
    (typeof req.body?.orgId === 'string' ? req.body.orgId : undefined) ||
    (typeof req.query?.orgId === 'string' ? req.query.orgId : undefined);

  if (requestedOrgId && requestedOrgId !== req.auth.orgId) {
    next(new HttpError(403, 'Cross-organization access denied.'));
    return;
  }

  next();
};
