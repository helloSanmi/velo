import { UserRole } from '@prisma/client';

export interface JwtUser {
  userId: string;
  orgId: string;
  role: UserRole;
  sessionId: string;
}
