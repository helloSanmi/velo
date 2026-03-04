import { UserRole } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { HttpError } from '../../lib/httpError.js';
import { createId } from '../../lib/ids.js';
import {
  buildProviderAuthorizeUrl,
  getProviderConfig
} from './integrations.oauth.providers.js';
import {
  normalizeReturnOrigin,
  signState
} from './integrations.oauth.state.js';
import type { IntegrationProvider } from './integrations.oauth.types.js';

export const buildIntegrationConnectUrl = async (input: {
  provider: IntegrationProvider;
  actor: { userId: string; orgId: string; role: UserRole };
  returnOrigin?: string;
}) => {
  if (input.actor.role !== 'admin') {
    throw new HttpError(403, 'Only workspace admins can connect integrations.');
  }

  const config = getProviderConfig(input.provider);
  const state = signState({
    provider: input.provider,
    orgId: input.actor.orgId,
    actorUserId: input.actor.userId,
    returnOrigin: normalizeReturnOrigin(input.returnOrigin),
    nonce: createId('nonce')
  });

  return buildProviderAuthorizeUrl({
    provider: input.provider,
    state,
    clientId: config.clientId,
    redirectUri: config.redirectUri
  });
};

export const listIntegrationConnections = async (input: { orgId: string }) => {
  const rows = await (prisma as any).organizationOAuthConnection.findMany({
    where: {
      orgId: input.orgId,
      provider: { in: ['slack', 'github'] }
    },
    select: {
      provider: true,
      metadata: true,
      updatedAt: true
    }
  });

  const base = {
    slack: { connected: false, updatedAt: null as string | null, accountLabel: null as string | null },
    github: { connected: false, updatedAt: null as string | null, accountLabel: null as string | null }
  };

  for (const row of rows) {
    const provider = String(row.provider) as 'slack' | 'github';
    const metadata = row.metadata && typeof row.metadata === 'object' ? (row.metadata as Record<string, unknown>) : {};
    base[provider] = {
      connected: true,
      updatedAt: row.updatedAt ? row.updatedAt.toISOString() : null,
      accountLabel:
        provider === 'slack'
          ? (typeof metadata.teamName === 'string' ? metadata.teamName : null)
          : (typeof metadata.login === 'string' ? metadata.login : null)
    };
  }

  return base;
};
