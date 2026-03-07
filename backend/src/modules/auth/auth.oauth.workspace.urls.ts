import { UserRole } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { HttpError } from '../../lib/httpError.js';
import { createId } from '../../lib/ids.js';
import { getBackendPermissionMessage } from '../../lib/accessMessages.js';
import {
  MICROSOFT_AUTH_URL,
  getProviderConfig,
  normalizeReturnOrigin,
  signState
} from './auth.oauth.provider.js';
import type { Provider } from './auth.oauth.types.js';
import { assertProviderSignInEnabled, resolveOrgByWorkspaceDomain } from './auth.oauth.workspace.resolve.js';

const buildMicrosoftAuthUrl = (input: { clientId: string; redirectUri: string; scope: string; prompt: string; state: string }) => {
  const params = new URLSearchParams({
    client_id: input.clientId,
    redirect_uri: input.redirectUri,
    response_type: 'code',
    scope: input.scope,
    response_mode: 'query',
    prompt: input.prompt,
    state: input.state
  });
  return `${MICROSOFT_AUTH_URL}?${params.toString()}`;
};

export const buildOauthStartUrl = async (
  provider: Provider,
  workspaceDomain: string | undefined,
  returnOrigin?: string
) => {
  const normalizedWorkspaceDomain = String(workspaceDomain || '').trim().toLowerCase();
  const org = normalizedWorkspaceDomain
    ? await resolveOrgByWorkspaceDomain(normalizedWorkspaceDomain)
    : null;
  if (org) assertProviderSignInEnabled(org, provider);
  const config = getProviderConfig(provider);

  const safeReturnOrigin = normalizeReturnOrigin(returnOrigin);
  const state = signState({
    provider,
    orgId: org?.id,
    loginSubdomain: org?.loginSubdomain,
    mode: 'signin',
    returnOrigin: safeReturnOrigin,
    nonce: createId('nonce')
  });

  return buildMicrosoftAuthUrl({
    clientId: config.clientId,
    redirectUri: config.redirectUri,
    scope: 'openid profile email User.Read',
    prompt: 'select_account',
    state
  });
};

export const buildOauthConnectUrl = async (input: {
  provider: Provider;
  workspaceDomain?: string;
  returnOrigin?: string;
  actor: { userId: string; orgId: string; role: UserRole };
}) => {
  if (input.actor.role !== 'admin') {
    throw new HttpError(403, getBackendPermissionMessage('admin_only', 'connect SSO providers'));
  }
  const org = await resolveOrgByWorkspaceDomain(input.workspaceDomain);
  if (org.id !== input.actor.orgId) {
    throw new HttpError(403, 'Cannot manage SSO for another workspace.');
  }

  const config = getProviderConfig(input.provider);
  const safeReturnOrigin = normalizeReturnOrigin(input.returnOrigin);
  const state = signState({
    provider: input.provider,
    orgId: org.id,
    loginSubdomain: org.loginSubdomain,
    mode: 'connect',
    actorUserId: input.actor.userId,
    returnOrigin: safeReturnOrigin,
    nonce: createId('nonce')
  });

  return buildMicrosoftAuthUrl({
    clientId: config.clientId,
    redirectUri: config.redirectUri,
    scope: 'openid profile email offline_access User.Read User.ReadBasic.All Mail.Send Mail.Read ChannelMessage.Send Chat.ReadWrite',
    prompt: 'consent',
    state
  });
};

export const buildOauthDirectoryUrl = async (input: {
  provider: Provider;
  actor: { userId: string; orgId: string; role: UserRole };
  returnOrigin?: string;
}) => {
  if (input.actor.role !== 'admin') {
    throw new HttpError(403, getBackendPermissionMessage('admin_only', 'import directory users'));
  }
  const org = await prisma.organization.findUnique({
    where: { id: input.actor.orgId },
    select: {
      id: true,
      loginSubdomain: true,
      microsoftWorkspaceConnected: true
    }
  });
  if (!org) throw new HttpError(404, 'Organization not found.');
  if (!org.microsoftWorkspaceConnected) {
    throw new HttpError(400, 'Microsoft is not connected for this workspace.');
  }

  const config = getProviderConfig(input.provider);
  const safeReturnOrigin = normalizeReturnOrigin(input.returnOrigin);
  const state = signState({
    provider: input.provider,
    orgId: org.id,
    loginSubdomain: org.loginSubdomain,
    mode: 'directory',
    actorUserId: input.actor.userId,
    returnOrigin: safeReturnOrigin,
    nonce: createId('nonce')
  });

  return buildMicrosoftAuthUrl({
    clientId: config.clientId,
    redirectUri: config.redirectUri,
    scope: 'openid profile email offline_access User.Read User.ReadBasic.All',
    prompt: 'select_account',
    state
  });
};
