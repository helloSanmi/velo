import { prisma } from '../../lib/prisma.js';
import { frontendOrigin, renderPopupResult } from './auth.oauth.provider.js';
import { upsertOrgOauthConnection } from './auth.oauth.connection.js';
import { fetchDirectoryUsersByAccessToken } from './auth.oauth.directory.js';

export const completeOauthDirectoryCallback = async (input: {
  state: any;
  provider: 'microsoft';
  tokenJson: { access_token?: string; refresh_token?: string; expires_in?: number; scope?: string };
}) => {
  const actor = input.state.actorUserId
    ? await prisma.user.findUnique({ where: { id: input.state.actorUserId }, select: { id: true, orgId: true, role: true } })
    : null;
  if (!actor || actor.role !== 'admin' || actor.orgId !== input.state.orgId) {
    return renderPopupResult(
      { ok: false, error: 'Admin session invalid. Retry from Settings.' },
      'velo-oauth-directory-result',
      input.state.returnOrigin || frontendOrigin
    );
  }

  await upsertOrgOauthConnection({
    orgId: input.state.orgId!,
    provider: input.provider,
    accessToken: input.tokenJson.access_token,
    refreshToken: input.tokenJson.refresh_token,
    expiresInSeconds: input.tokenJson.expires_in,
    scope: input.tokenJson.scope
  });

  let users: Array<{
    externalId: string;
    email: string;
    displayName: string;
    firstName?: string;
    lastName?: string;
    avatar?: string;
  }> = [];
  try {
    users = await fetchDirectoryUsersByAccessToken({
      provider: input.provider,
      accessToken: String(input.tokenJson.access_token || '')
    });
  } catch (error: any) {
    return renderPopupResult(
      { ok: false, error: error?.message || 'Could not load directory users.' },
      'velo-oauth-directory-result',
      input.state.returnOrigin || frontendOrigin
    );
  }

  return renderPopupResult(
    {
      ok: true,
      provider: input.provider,
      users
    },
    'velo-oauth-directory-result',
    input.state.returnOrigin || frontendOrigin
  );
};
