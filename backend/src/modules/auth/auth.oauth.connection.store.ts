import { createId } from '../../lib/ids.js';
import { prisma } from '../../lib/prisma.js';
import type { OAuthConnectionMetadata, Provider } from './auth.oauth.types.js';

export const toPrismaProvider = (_provider: Provider): 'microsoft' => 'microsoft';

export const patchOauthConnectionMetadata = async (input: {
  orgId: string;
  provider: Provider;
  patch: Partial<OAuthConnectionMetadata>;
}) => {
  const oauthModel = (prisma as any).organizationOAuthConnection;
  const connection = await oauthModel.findUnique({
    where: { orgId_provider: { orgId: input.orgId, provider: toPrismaProvider(input.provider) } },
    select: { id: true, metadata: true }
  });
  if (!connection) return;
  const current =
    connection.metadata && typeof connection.metadata === 'object'
      ? (connection.metadata as OAuthConnectionMetadata)
      : {};
  await oauthModel.update({
    where: { id: connection.id },
    data: { metadata: { ...current, ...input.patch } }
  });
};

export const upsertOrgOauthConnection = async (input: {
  orgId: string;
  provider: Provider;
  accessToken?: string;
  refreshToken?: string;
  expiresInSeconds?: number;
  scope?: string;
}) => {
  const provider = toPrismaProvider(input.provider);
  const oauthModel = (prisma as any).organizationOAuthConnection;
  const accessTokenExpiresAt = input.expiresInSeconds
    ? new Date(Date.now() + Math.max(30, input.expiresInSeconds - 30) * 1000)
    : null;
  const existing = await oauthModel.findUnique({
    where: { orgId_provider: { orgId: input.orgId, provider } }
  });
  return oauthModel.upsert({
    where: { orgId_provider: { orgId: input.orgId, provider } },
    create: {
      id: createId('oauth'),
      orgId: input.orgId,
      provider,
      accessToken: input.accessToken || null,
      refreshToken: input.refreshToken || null,
      accessTokenExpiresAt,
      scope: input.scope || null
    },
    update: {
      accessToken: input.accessToken || existing?.accessToken || null,
      refreshToken: input.refreshToken || existing?.refreshToken || null,
      accessTokenExpiresAt,
      scope: input.scope || existing?.scope || null
    }
  });
};
