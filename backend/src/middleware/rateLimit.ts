import type { NextFunction, Request, Response } from 'express';

type Bucket = {
  count: number;
  resetAtMs: number;
};

type Options = {
  windowMs: number;
  maxRequests: number;
  message?: string;
  keyPrefix?: string;
};

const buckets = new Map<string, Bucket>();

const getClientIp = (req: Request): string => {
  const header = req.headers['x-forwarded-for'];
  if (typeof header === 'string' && header.trim().length > 0) {
    return header.split(',')[0]!.trim();
  }
  if (Array.isArray(header) && header.length > 0) {
    return header[0]!.trim();
  }
  return req.ip || 'unknown';
};

const sweepExpiredBuckets = (nowMs: number) => {
  for (const [key, value] of buckets.entries()) {
    if (value.resetAtMs <= nowMs) buckets.delete(key);
  }
};

let lastSweepMs = 0;

export const createRateLimitMiddleware = (options: Options) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const nowMs = Date.now();

    // Opportunistic in-memory cleanup to prevent unbounded map growth.
    if (nowMs - lastSweepMs > 60_000) {
      sweepExpiredBuckets(nowMs);
      lastSweepMs = nowMs;
    }

    const ip = getClientIp(req);
    const key = `${options.keyPrefix || 'default'}:${req.method}:${req.path}:${ip}`;
    const current = buckets.get(key);

    if (!current || current.resetAtMs <= nowMs) {
      buckets.set(key, { count: 1, resetAtMs: nowMs + options.windowMs });
      next();
      return;
    }

    if (current.count >= options.maxRequests) {
      const retryAfterSeconds = Math.max(1, Math.ceil((current.resetAtMs - nowMs) / 1000));
      res.setHeader('Retry-After', String(retryAfterSeconds));
      res.status(429).json({
        success: false,
        error: {
          message: options.message || 'Too many requests. Please try again shortly.'
        }
      });
      return;
    }

    current.count += 1;
    buckets.set(key, current);
    next();
  };
};

