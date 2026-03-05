import { UserRole } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { writeAudit } from '../audit/audit.service.js';
import { renderPopupResult, frontendOrigin } from './auth.oauth.provider.js';
import type { MinimalAuthUser, OauthSignInInput } from './auth.oauth.callback.signin.types.js';

const providerSubjectField = 'microsoftSubject' as const;

export const ensureUserLicense = (input: OauthSignInInput, user: MinimalAuthUser) => {
  if (user.licenseActive) return null;
  return renderPopupResult(
    {
      ok: false,
      code: 'LICENSE_REQUIRED',
      error: 'No active license assigned for this account. Ask your workspace admin to assign a license, then retry.'
    },
    'velo-oauth-result',
    input.state.returnOrigin || frontendOrigin
  );
};

export const ensureProviderLinked = async (input: OauthSignInInput, user: MinimalAuthUser) => {
  const patch: Partial<Record<typeof providerSubjectField | 'avatar' | 'displayName', string>> = {};

  if (!user.microsoftSubject) {
    patch[providerSubjectField] = input.profile.subject;
  }
  if (input.profile.avatar && input.profile.avatar !== user.avatar) {
    patch.avatar = input.profile.avatar;
  }
  if (!user.displayName && input.profile.name) {
    patch.displayName = input.profile.name;
  }

  if (Object.keys(patch).length === 0) return user;

  return (await prisma.user.update({
    where: { id: user.id },
    data: patch
  })) as MinimalAuthUser;
};

export const applyGlobalAdminPromotion = async (input: OauthSignInInput, user: MinimalAuthUser) => {
  if (!input.isMicrosoftGlobalAdmin || user.role === UserRole.admin) return user;
  const promoted = (await prisma.user.update({ where: { id: user.id }, data: { role: UserRole.admin } })) as MinimalAuthUser;
  await writeAudit({
    orgId: promoted.orgId,
    userId: promoted.id,
    actionType: 'role_changed',
    action: `Auto-promoted ${promoted.email} to admin from Microsoft Global Admin claim`,
    entityType: 'user',
    entityId: promoted.id,
    metadata: { provider: 'microsoft', reason: 'global_admin_claim' }
  });
  return promoted;
};
