import type { UserRole } from '@prisma/client';

export type OauthSignInState = {
  returnOrigin?: string;
  loginSubdomain?: string;
};

export type OauthSignInProfile = {
  subject: string;
  email: string;
  name?: string;
  avatar?: string;
};

export type OauthSignInInput = {
  state: OauthSignInState;
  provider: 'microsoft';
  profile: OauthSignInProfile;
  stateOrg: { id: string } | null;
  isMicrosoftGlobalAdmin: boolean;
  microsoftTenantId?: string;
  userAgent?: string;
  ipAddress?: string;
};

export type MinimalAuthUser = {
  id: string;
  orgId: string;
  role: UserRole;
  email: string;
  username: string;
  displayName: string;
  avatar: string | null;
  licenseActive: boolean;
  microsoftSubject: string | null;
};
