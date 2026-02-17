import type { NextFunction, Request, Response } from 'express';
import { createId } from '../lib/ids.js';

export const requestContext = (req: Request, res: Response, next: NextFunction): void => {
  const requestId = createId('req');
  req.requestId = requestId;
  res.setHeader('x-request-id', requestId);
  next();
};
