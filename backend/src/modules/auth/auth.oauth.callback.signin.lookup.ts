import { prisma } from '../../lib/prisma.js';
import { renderPopupResult, frontendOrigin } from './auth.oauth.provider.js';
import type { MinimalAuthUser, OauthSignInInput } from './auth.oauth.callback.signin.types.js';

const providerEnabledFilter = { allowMicrosoftAuth: true, microsoftWorkspaceConnected: true };
const providerSubjectField = 'microsoftSubject' as const;

export const findUserForOauthSignIn = async (
  input: OauthSignInInput
): Promise<{ user: MinimalAuthUser | null; ambiguous: boolean }> => {
  const userMatchesBySubject = await prisma.user.findMany({
    where: {
      [providerSubjectField]: input.profile.subject,
      ...(input.stateOrg ? { orgId: input.stateOrg.id } : {}),
      organization: { is: providerEnabledFilter }
    },
    take: 2
  });
  if (userMatchesBySubject[0]) return { user: userMatchesBySubject[0] as MinimalAuthUser, ambiguous: false };

  const usersByEmail = await prisma.user.findMany({
    where: {
      email: input.profile.email,
      ...(input.stateOrg ? { orgId: input.stateOrg.id } : {}),
      organization: { is: providerEnabledFilter }
    },
    take: 2
  });

  if (usersByEmail.length > 1) {
    return { user: null, ambiguous: true };
  }
  return { user: (usersByEmail[0] as MinimalAuthUser) || null, ambiguous: false };
};

export const getAmbiguousWorkspacePopup = (input: OauthSignInInput) =>
  renderPopupResult(
    { ok: false, error: 'Multiple workspace accounts match this identity. Enter workspace domain, then retry.' },
    'velo-oauth-result',
    input.state.returnOrigin || frontendOrigin
  );
