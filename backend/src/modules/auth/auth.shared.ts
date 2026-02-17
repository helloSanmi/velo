import bcrypt from 'bcryptjs';
import { UserRole } from '@prisma/client';
import { env } from '../../config/env.js';
import { JwtUser } from './auth.types.js';

export type RegisterPlan = 'free' | 'basic' | 'pro';

export interface PublicUser {
  id: string;
  orgId: string;
  username: string;
  displayName: string;
  email: string;
  avatar: string | null;
  role: UserRole;
}

export const sessionExpiresAt = (): Date => {
  const date = new Date();
  date.setDate(date.getDate() + env.SESSION_MAX_DAYS);
  return date;
};

export const hashToken = async (value: string): Promise<string> => bcrypt.hash(value, 10);
export const compareToken = async (value: string, hash: string): Promise<boolean> => bcrypt.compare(value, hash);
export const hashPassword = async (value: string): Promise<string> => bcrypt.hash(value, 10);
export const comparePassword = async (value: string, hash: string): Promise<boolean> => bcrypt.compare(value, hash);

export const normalizeIdentifier = (identifier: string) => {
  const normalized = identifier.trim().toLowerCase();
  const username = normalized.includes('@') ? normalized.split('@')[0] : normalized;
  const email = normalized.includes('@') ? normalized : `${normalized}@velo.ai`;
  const domain = email.split('@')[1]?.trim().toLowerCase();
  return { normalized, username, email, domain };
};

export const buildDisplayName = (username: string) => username.charAt(0).toUpperCase() + username.slice(1);
export const buildAvatarUrl = (username: string) =>
  `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(username)}`;

export const toPublicUser = (user: {
  id: string;
  orgId: string;
  username: string;
  displayName: string;
  email: string;
  avatar: string | null;
  role: UserRole;
}): PublicUser => ({
  id: user.id,
  orgId: user.orgId,
  username: user.username,
  displayName: user.displayName,
  email: user.email,
  avatar: user.avatar,
  role: user.role
});

export const buildJwtPayload = (input: { userId: string; orgId: string; role: UserRole; sessionId: string }): JwtUser => ({
  userId: input.userId,
  orgId: input.orgId,
  role: input.role,
  sessionId: input.sessionId
});

