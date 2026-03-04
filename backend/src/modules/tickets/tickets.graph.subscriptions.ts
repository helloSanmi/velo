import { HttpError } from '../../lib/httpError.js';
import { env } from '../../config/env.js';
import { OAuthProvider } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { graphRequest } from './tickets.graph.request.js';
import { createWebhookClientState, parseConnectionMetadata, resolveConnection, updateConnectionMetadata } from './tickets.graph.connection.js';
import { getCircuitOpenError, isCircuitOpen } from './tickets.graph.health.js';
import { resolveGraphAuthContext } from './tickets.graph.auth.js';

export const ensureMailSubscription = async (input: { orgId: string }): Promise<{ subscriptionId: string; expiresAt: string }> => {
  const { metadata } = await resolveConnection(input.orgId);
  if (isCircuitOpen(metadata)) throw getCircuitOpenError(metadata);
  const { accessToken } = await resolveGraphAuthContext({ orgId: input.orgId });
  const existingSubscriptionId = metadata.mailSubscriptionId;
  const existingClientState = metadata.mailWebhookClientState || createWebhookClientState(input.orgId);

  if (existingSubscriptionId && metadata.mailSubscriptionExpiresAt) {
    const expiresAt = Date.parse(metadata.mailSubscriptionExpiresAt);
    if (Number.isFinite(expiresAt) && expiresAt > Date.now() + 60 * 60 * 1000) {
      if (metadata.mailWebhookClientState !== existingClientState) {
        await updateConnectionMetadata({ orgId: input.orgId, metadataPatch: { mailWebhookClientState: existingClientState } });
      }
      return { subscriptionId: existingSubscriptionId, expiresAt: metadata.mailSubscriptionExpiresAt };
    }
  }

  const expiration = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
  const webhookUrl = `${env.APP_BASE_URL.replace(/\/$/, '')}/api/v1/integrations/microsoft/graph/webhook`;
  const lowerWebhookUrl = webhookUrl.toLowerCase();
  const isHttps = lowerWebhookUrl.startsWith('https://');
  const isLocalHostWebhook = lowerWebhookUrl.includes('://localhost') || lowerWebhookUrl.includes('://127.0.0.1') || lowerWebhookUrl.includes('://0.0.0.0');
  if (!isHttps || isLocalHostWebhook) {
    throw new HttpError(400, `Microsoft webhook subscriptions require a public HTTPS URL. Current webhook URL is "${webhookUrl}". Use an HTTPS tunnel/domain for APP_BASE_URL and retry.`);
  }
  let created: { id: string; expirationDateTime: string } | null = null;

  if (existingSubscriptionId) {
    try {
      created = await graphRequest<{ id: string; expirationDateTime: string }>({
        accessToken,
        method: 'PATCH',
        url: `/subscriptions/${encodeURIComponent(existingSubscriptionId)}`,
        body: { expirationDateTime: expiration }
      });
    } catch {
      created = null;
    }
  }

  if (!created) {
    created = await graphRequest<{ id: string; expirationDateTime: string }>({
      accessToken,
      method: 'POST',
      url: '/subscriptions',
      body: {
        changeType: 'created',
        notificationUrl: webhookUrl,
        resource: "/me/mailFolders('inbox')/messages",
        expirationDateTime: expiration,
        clientState: existingClientState
      }
    });
  }

  await updateConnectionMetadata({
    orgId: input.orgId,
    metadataPatch: {
      mailSubscriptionId: created.id,
      mailSubscriptionExpiresAt: created.expirationDateTime,
      mailWebhookClientState: existingClientState
    }
  });

  return { subscriptionId: created.id, expiresAt: created.expirationDateTime };
};

export const renewExpiringMailSubscriptions = async (input?: {
  renewBeforeMinutes?: number;
}): Promise<{ scanned: number; renewed: number; failed: number }> => {
  const renewBeforeMinutes = Math.max(30, input?.renewBeforeMinutes ?? 180);
  const renewBeforeTs = Date.now() + renewBeforeMinutes * 60 * 1000;
  const connections = await prisma.organizationOAuthConnection.findMany({
    where: { provider: OAuthProvider.microsoft },
    select: { orgId: true, metadata: true }
  });

  let renewed = 0;
  let failed = 0;
  for (const connection of connections) {
    const metadata = parseConnectionMetadata(connection.metadata);
    const expiresAtTs = Date.parse(String(metadata.mailSubscriptionExpiresAt || ''));
    if (!Number.isFinite(expiresAtTs) || expiresAtTs > renewBeforeTs) continue;
    try {
      await ensureMailSubscription({ orgId: connection.orgId });
      renewed += 1;
    } catch {
      failed += 1;
    }
  }
  return { scanned: connections.length, renewed, failed };
};

export const extractValidatedOrgIdsFromWebhookNotifications = async (input: {
  notifications: Array<{ clientState?: string }>;
}): Promise<string[]> => {
  const candidateMap = new Map<string, string>();
  input.notifications.map((item) => String(item?.clientState || '')).filter(Boolean).forEach((value) => {
    const parts = value.split(':');
    if (parts.length < 3 || parts[0] !== 'velo-ticket') return;
    const orgId = parts[1];
    if (!orgId) return;
    candidateMap.set(orgId, parts.join(':'));
  });
  const candidates = Array.from(candidateMap.entries()).map(([orgId, clientState]) => ({ orgId, clientState }));
  if (candidates.length === 0) return [];

  const orgIds = Array.from(new Set(candidates.map((item) => item.orgId)));
  const rows = await prisma.organizationOAuthConnection.findMany({
    where: { provider: OAuthProvider.microsoft, orgId: { in: orgIds } },
    select: { orgId: true, metadata: true }
  });
  const expectedByOrgId = new Map(rows.map((row) => [row.orgId, parseConnectionMetadata(row.metadata).mailWebhookClientState || '']));

  return candidates.filter((item) => expectedByOrgId.get(item.orgId) === item.clientState).map((item) => item.orgId);
};
