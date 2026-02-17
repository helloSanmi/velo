import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { HttpError } from '../../lib/httpError.js';
import type { JwtUser } from './auth.types.js';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export const signAccessToken = (payload: JwtUser): string =>
  jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: env.JWT_ACCESS_TTL as jwt.SignOptions['expiresIn'] });
export const signRefreshToken = (payload: JwtUser): string =>
  jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: env.JWT_REFRESH_TTL as jwt.SignOptions['expiresIn'] });

export const verifyAccessToken = (token: string): JwtUser => {
  try {
    return jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtUser;
  } catch {
    throw new HttpError(401, 'Invalid access token.');
  }
};

export const verifyRefreshToken = (token: string): JwtUser => {
  try {
    return jwt.verify(token, env.JWT_REFRESH_SECRET) as JwtUser;
  } catch {
    throw new HttpError(401, 'Invalid refresh token.');
  }
};

export const createTokenPair = (payload: JwtUser): TokenPair => ({
  accessToken: signAccessToken(payload),
  refreshToken: signRefreshToken(payload)
});
