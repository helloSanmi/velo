import { prisma } from '../../lib/prisma.js';
import { HttpError } from '../../lib/httpError.js';
import { createId } from '../../lib/ids.js';
import { getOrgPlanFeatures } from '../../lib/planFeatures.js';
import { getBackendPlanUpgradeMessage } from '../../lib/accessMessages.js';
import { writeAudit } from '../audit/audit.service.js';
import {
  exchangeOauthCode,
  getProviderConfig,
  toPrismaProvider
} from './integrations.oauth.providers.js';
import {
  getFrontendOrigin,
  renderPopupResult,
  verifyState
} from './integrations.oauth.state.js';
import type { IntegrationProvider } from './integrations.oauth.types.js';

export const completeIntegrationOauthCallback = async (input: {
  provider: IntegrationProvider;
  code?: string;
  state?: string;
  error?: string;
  errorDescription?: string;
  userAgent?: string;
  ipAddress?: string;
}) => {
  if (input.error) {
    return renderPopupResult({
      ok: false,
      provider: input.provider,
      error: input.errorDescription || input.error
    });
  }
  if (!input.code || !input.state) {
    throw new HttpError(400, 'Missing integration OAuth code/state.');
  }

  const state = verifyState(input.state);
  if (state.provider !== input.provider) {
    throw new HttpError(400, 'Integration provider/state mismatch.');
  }

  const actor = await prisma.user.findUnique({
    where: { id: state.actorUserId },
    select: { id: true, orgId: true, role: true }
  });
  if (!actor || actor.orgId !== state.orgId || actor.role !== 'admin') {
    return renderPopupResult({ ok: false, provider: input.provider, error: 'Admin session invalid. Retry from settings.' });
  }
  const planFeatures = await getOrgPlanFeatures(state.orgId);
  if (!planFeatures.integrations) {
    return renderPopupResult({
      ok: false,
      provider: input.provider,
      error: getBackendPlanUpgradeMessage('integrations')
    });
  }

  const config = getProviderConfig(input.provider);
  let tokenPayload: Awaited<ReturnType<typeof exchangeOauthCode>>;
  try {
    tokenPayload = await exchangeOauthCode({
      provider: input.provider,
      code: input.code,
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      redirectUri: config.redirectUri
    });
  } catch (error) {
    return renderPopupResult({
      ok: false,
      provider: input.provider,
      error: error instanceof HttpError ? error.message : 'OAuth exchange failed.'
    });
  }

  const accessTokenExpiresAt = tokenPayload.expiresIn
    ? new Date(Date.now() + Math.max(30, tokenPayload.expiresIn - 30) * 1000)
    : null;
  await (prisma as any).organizationOAuthConnection.upsert({
    where: {
      orgId_provider: {
        orgId: state.orgId,
        provider: toPrismaProvider(input.provider)
      }
    },
    create: {
      id: createId('oauth'),
      orgId: state.orgId,
      provider: toPrismaProvider(input.provider),
      accessToken: tokenPayload.accessToken || null,
      refreshToken: tokenPayload.refreshToken || null,
      accessTokenExpiresAt,
      scope: tokenPayload.scope || null,
      metadata: tokenPayload.metadata
    },
    update: {
      accessToken: tokenPayload.accessToken || null,
      refreshToken: tokenPayload.refreshToken || null,
      accessTokenExpiresAt,
      scope: tokenPayload.scope || null,
      metadata: tokenPayload.metadata
    }
  });

  await writeAudit({
    orgId: state.orgId,
    userId: actor.id,
    actionType: 'project_updated',
    action: `${input.provider === 'slack' ? 'Slack' : 'GitHub'} integration connected for workspace.`,
    entityType: 'organization',
    entityId: state.orgId,
    metadata: {
      provider: input.provider,
      ...tokenPayload.metadata
    },
    ipAddress: input.ipAddress,
    userAgent: input.userAgent
  });

  return renderPopupResult(
    { ok: true, provider: input.provider },
    'velo-integration-connect-result',
    state.returnOrigin || getFrontendOrigin()
  );
};
