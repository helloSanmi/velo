import { prisma } from '../../lib/prisma.js';
import { writeAudit } from '../audit/audit.service.js';
import { frontendOrigin, renderPopupResult } from './auth.oauth.provider.js';
import { upsertOrgOauthConnection } from './auth.oauth.connection.js';

export const completeOauthConnectCallback = async (input: {
  state: any;
  stateOrg: { id: string; loginSubdomain: string } | null;
  provider: 'microsoft';
  tokenJson: { access_token?: string; refresh_token?: string; expires_in?: number; scope?: string };
  profile: { email: string };
  microsoftTenantId?: string;
  ipAddress?: string;
  userAgent?: string;
}) => {
  if (!input.stateOrg) {
    throw new Error('Workspace context missing for connect flow.');
  }
  const actor = input.state.actorUserId
    ? await prisma.user.findUnique({ where: { id: input.state.actorUserId }, select: { id: true, orgId: true, role: true } })
    : null;
  if (!actor || actor.orgId !== input.stateOrg.id || actor.role !== 'admin') {
    return renderPopupResult(
      { ok: false, error: 'Admin session is no longer valid. Retry from workspace settings.' },
      'velo-oauth-connect-result',
      input.state.returnOrigin || frontendOrigin
    );
  }

  const patch = { microsoftWorkspaceConnected: true, allowMicrosoftAuth: true, microsoftTenantId: input.microsoftTenantId };

  const updated = await prisma.organization.update({
    where: { id: input.stateOrg.id },
    data: patch,
    select: {
      loginSubdomain: true,
      allowMicrosoftAuth: true,
      microsoftWorkspaceConnected: true,
      microsoftTenantId: true
    }
  });

  await upsertOrgOauthConnection({
    orgId: input.stateOrg.id,
    provider: input.provider,
    accessToken: input.tokenJson.access_token,
    refreshToken: input.tokenJson.refresh_token,
    expiresInSeconds: input.tokenJson.expires_in,
    scope: input.tokenJson.scope
  });

  let subscriptionEnsured = false;
  let subscriptionEnsureError: string | undefined;
  try {
    const { ticketsGraphService } = await import('../tickets/tickets.graph.service.js');
    const ensured = await ticketsGraphService.ensureMailSubscription({ orgId: input.stateOrg.id });
    subscriptionEnsured = Boolean(ensured.subscriptionId);
  } catch (error: any) {
    subscriptionEnsureError = error?.message || 'Could not auto-create ticket mail subscription.';
  }

  await writeAudit({
    orgId: input.stateOrg.id,
    userId: actor.id,
    actionType: 'project_updated',
    action: 'Microsoft SSO connected for workspace.',
    entityType: 'organization',
    entityId: input.stateOrg.id,
    metadata: {
      provider: input.provider,
      consentedBy: input.profile.email,
      tenantId: input.microsoftTenantId,
      ticketNotificationSubscriptionEnsured: subscriptionEnsured,
      ticketNotificationSubscriptionError: subscriptionEnsureError
    },
    ipAddress: input.ipAddress,
    userAgent: input.userAgent
  });

  return renderPopupResult(
    {
      ok: true,
      provider: input.provider,
      workspaceDomain: `${updated.loginSubdomain}.velo.ai`,
      microsoftConnected: updated.microsoftWorkspaceConnected,
      microsoftAllowed: updated.allowMicrosoftAuth,
      subscriptionEnsured,
      subscriptionEnsureError
    },
    'velo-oauth-connect-result',
    input.state.returnOrigin || frontendOrigin
  );
};
