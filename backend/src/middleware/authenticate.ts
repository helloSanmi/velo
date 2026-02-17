import type { NextFunction, Request, Response } from 'express';
import { HttpError } from '../lib/httpError.js';
import { verifyAccessToken } from '../modules/auth/auth.tokens.js';

export const authenticate = (req: Request, _res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next(new HttpError(401, 'Missing or invalid authorization header.'));
    return;
  }

  const token = authHeader.slice('Bearer '.length);
  const payload = verifyAccessToken(token);
  req.auth = payload;
  next();
};
