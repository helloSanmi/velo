import type { NextFunction, Request, Response } from 'express';
import { isHttpError } from '../lib/httpError.js';

export const errorHandler = (error: unknown, req: Request, res: Response, _next: NextFunction): void => {
  if (isHttpError(error)) {
    res.status(error.statusCode).json({
      success: false,
      message: error.message,
      details: error.details,
      requestId: req.requestId
    });
    return;
  }

  console.error('Unhandled error', { error, requestId: req.requestId });
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    requestId: req.requestId
  });
};
