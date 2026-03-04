import { toPublicUser } from './auth.shared.js';
import { frontendOrigin, renderPopupResult } from './auth.oauth.provider.js';
import { createSessionForUser } from './auth.oauth.session.js';
import type { OauthSignInInput } from './auth.oauth.callback.signin.types.js';
import {
  applyGlobalAdminPromotion,
  ensureProviderLinked,
  ensureUserLicense,
  findUserForOauthSignIn,
  getAmbiguousWorkspacePopup,
  getNoSeatPopup,
  jitProvisionUserIfNeeded,
  resolveSignInOrg,
  writeDeniedSignInAudit
} from './auth.oauth.callback.signin.helpers.js';

export const completeOauthSignInCallback = async (input: OauthSignInInput) => {
  const { user: matchedUser, ambiguous } = await findUserForOauthSignIn(input);
  if (ambiguous) return getAmbiguousWorkspacePopup(input);

  const resolvedOrg = await resolveSignInOrg(input, matchedUser);
  let user = await jitProvisionUserIfNeeded(input, matchedUser, resolvedOrg);

  if (!user && resolvedOrg) return getNoSeatPopup(input, resolvedOrg.name);
  if (!user) {
    await writeDeniedSignInAudit(input);
    return renderPopupResult({
      ok: false,
      code: 'USER_NOT_PROVISIONED',
      error: 'Your account is not provisioned in this workspace. Ask an admin to invite or create your user first.'
    });
  }

  const noLicensePopup = ensureUserLicense(input, user);
  if (noLicensePopup) return noLicensePopup;

  user = await ensureProviderLinked(input, user);
  user = await applyGlobalAdminPromotion(input, user);

  const tokens = await createSessionForUser({
    user: { id: user.id, orgId: user.orgId, role: user.role },
    userAgent: input.userAgent,
    ipAddress: input.ipAddress,
    actionType: 'auth_login'
  });

  return renderPopupResult(
    { ok: true, tokens, user: toPublicUser(user) },
    'velo-oauth-result',
    input.state.returnOrigin || frontendOrigin
  );
};
