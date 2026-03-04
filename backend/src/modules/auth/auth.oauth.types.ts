import type { UserRole } from '@prisma/client';
import type { StoredIntakeTicket } from '../tickets/tickets.store.js';

export type Provider = 'microsoft';

export type OAuthState = {
  provider: Provider;
  orgId?: string;
  loginSubdomain?: string;
  mode: 'signin' | 'connect' | 'directory';
  actorUserId?: string;
  returnOrigin?: string;
  nonce: string;
};

export type OAuthConnectionMetadata = {
  refreshTokenPresent?: boolean;
  lastTokenRefreshAt?: string;
  lastTokenRefreshStatus?: 'ok' | 'temporary_failure' | 'reconsent_required';
  lastTokenRefreshError?: string;
};

export type ProviderProfile = {
  subject: string;
  email: string;
  name: string;
  avatar: string | null;
};

export type SessionUser = { id: string; orgId: string; role: UserRole };
export type SessionInput = {
  user: SessionUser;
  userAgent?: string;
  ipAddress?: string;
  actionType: 'auth_login' | 'auth_logout' | 'auth_password_reset' | 'auth_password_changed' | 'auth_signup';
};

export type DirectoryUser = {
  externalId: string;
  email: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
};

export type CallbackInput = {
  provider: Provider;
  code?: string;
  state?: string;
  error?: string;
  errorDescription?: string;
  userAgent?: string;
  ipAddress?: string;
};

export type TicketLike = Pick<StoredIntakeTicket, 'id' | 'status' | 'priority' | 'title'>;
