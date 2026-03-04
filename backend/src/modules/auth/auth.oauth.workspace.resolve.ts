import { prisma } from '../../lib/prisma.js';
import { HttpError } from '../../lib/httpError.js';
import type { Provider } from './auth.oauth.types.js';
import { normalizeWorkspaceDomain } from './auth.shared.js';

export const resolveOrgByWorkspaceDomain = async (workspaceDomain: string | undefined) => {
  const normalized = normalizeWorkspaceDomain(workspaceDomain);
  if (!normalized) {
    throw new HttpError(400, 'Workspace URL is required for organization SSO sign-in (for example: acme.localhost or acme.velo.ai).');
  }

  const org = await prisma.organization.findUnique({
    where: { loginSubdomain: normalized },
    select: {
      id: true,
      name: true,
      loginSubdomain: true,
      allowMicrosoftAuth: true,
      microsoftWorkspaceConnected: true
    }
  });

  if (!org) throw new HttpError(404, 'Workspace domain not found.');
  return org;
};

export const assertProviderSignInEnabled = (
  org: {
    allowMicrosoftAuth: boolean;
    microsoftWorkspaceConnected: boolean;
  },
  _provider: Provider
) => {
  if (!org.allowMicrosoftAuth) {
    throw new HttpError(403, 'Microsoft sign-in is disabled for this workspace.');
  }
  if (!org.microsoftWorkspaceConnected) {
    throw new HttpError(403, 'Microsoft workspace integration is not connected for this workspace.');
  }
};

export const getOauthProviderAvailability = async (workspaceDomain: string | undefined) => {
  const org = await resolveOrgByWorkspaceDomain(workspaceDomain);
  const input = (workspaceDomain || '').trim().toLowerCase();
  const domainSuffix = input.endsWith('.localhost') ? '.localhost' : '.velo.ai';

  return {
    workspaceDomain: `${org.loginSubdomain}${domainSuffix}`,
    orgName: org.name,
    microsoft: {
      enabled: Boolean(org.allowMicrosoftAuth && org.microsoftWorkspaceConnected)
    },
    status: {
      microsoftConnected: Boolean(org.microsoftWorkspaceConnected),
      microsoftAllowed: Boolean(org.allowMicrosoftAuth)
    }
  };
};
