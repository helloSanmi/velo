import { OAuthProvider } from '@prisma/client';
import { env } from '../../config/env.js';
import { HttpError } from '../../lib/httpError.js';
import { prisma } from '../../lib/prisma.js';
import { createId } from '../../lib/ids.js';
import { ensureProviderAccessToken } from '../auth/auth.oauth.js';
import { ticketsStore } from './tickets.store.js';
import { ticketsNotificationStore } from './tickets.notification.store.js';

type GraphConnectionMetadata = {
  teamsTeamId?: string;
  teamsChannelId?: string;
  teamsChatId?: string;
  mailSubscriptionId?: string;
  mailSubscriptionExpiresAt?: string;
  mailDeltaLink?: string;
  mailWebhookClientState?: string;
  lastMailDeltaSyncAt?: string;
  lastMailWebhookAt?: string;
};

export interface TicketGraphDiagnostics {
  orgId: string;
  microsoft: {
    connected: boolean;
    ssoEnabled: boolean;
    tenantId?: string;
    hasRefreshToken: boolean;
    accessTokenExpiresAt?: string;
    tokenStatus: 'ok' | 'expiring' | 'expired' | 'missing' | 'error';
    tokenError?: string;
  };
  subscription: {
    id?: string;
    expiresAt?: string;
    minutesRemaining?: number;
    status: 'ok' | 'expiring' | 'expired' | 'missing' | 'unknown';
  };
  webhook: {
    clientStateConfigured: boolean;
    lastSyncAt?: string;
    lastWebhookAt?: string;
    inboundSeenLast24h: number;
    inboundSeenTotal: number;
  };
  delivery: {
    queued: number;
    digestPending: number;
    failedLast24h: number;
    deadLetterOpen: number;
    lastSentAt?: string;
    lastFailureAt?: string;
  };
}

export interface TicketGraphActiveHealthCheck {
  ranAt: string;
  checks: Array<{
    key: 'connection' | 'token_refresh' | 'graph_me' | 'subscription_read' | 'webhook_client_state' | 'delivery_dead_letter';
    ok: boolean;
    detail: string;
    remediation?: string;
  }>;
  ok: boolean;
}

type GraphMessageHeader = { name?: string; value?: string };

const GRAPH_BASE_URL = 'https://graph.microsoft.com/v1.0';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const getRetryAfterMs = (response: Response): number | undefined => {
  const raw = response.headers.get('retry-after');
  if (!raw) return undefined;
  const seconds = Number(raw);
  if (Number.isFinite(seconds) && seconds > 0) return seconds * 1000;
  const dateMs = Date.parse(raw);
  if (!Number.isFinite(dateMs)) return undefined;
  const delay = dateMs - Date.now();
  return delay > 0 ? delay : undefined;
};

const withGraphRetry = async <T>(fn: () => Promise<T>): Promise<T> => {
  const maxAttempts = 3;
  let attempt = 0;
  let delayMs = 400;
  while (attempt < maxAttempts) {
    attempt += 1;
    try {
      return await fn();
    } catch (error) {
      const status =
        error instanceof HttpError
          ? Number((error.message.match(/Microsoft Graph request failed \((\d+)\)/)?.[1] || 0))
          : 0;
      const retryable = status === 429 || status >= 500;
      if (!retryable || attempt >= maxAttempts) throw error;
      await sleep(delayMs);
      delayMs *= 2;
    }
  }
  throw new HttpError(502, 'Microsoft Graph request retries exhausted.');
};

const graphRequest = async <T = any>(input: {
  accessToken: string;
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  url: string;
  body?: unknown;
}): Promise<T> => {
  return withGraphRetry(async () => {
    const response = await fetch(`${GRAPH_BASE_URL}${input.url}`, {
      method: input.method || 'GET',
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: input.body === undefined ? undefined : JSON.stringify(input.body)
    });
    if (!response.ok) {
      const retryAfterMs = getRetryAfterMs(response);
      if (retryAfterMs) await sleep(retryAfterMs);
      const text = await response.text().catch(() => '');
      throw new HttpError(400, `Microsoft Graph request failed (${response.status}): ${text || input.url}`);
    }
    if (response.status === 204) return undefined as T;
    return response.json() as Promise<T>;
  });
};

const parseConnectionMetadata = (raw: unknown): GraphConnectionMetadata => {
  if (!raw || typeof raw !== 'object') return {};
  return raw as GraphConnectionMetadata;
};

const updateConnectionMetadata = async (input: {
  orgId: string;
  metadataPatch: Partial<GraphConnectionMetadata>;
}) => {
  const connection = await prisma.organizationOAuthConnection.findUnique({
    where: {
      orgId_provider: {
        orgId: input.orgId,
        provider: OAuthProvider.microsoft
      }
    }
  });
  if (!connection) return;
  const current = parseConnectionMetadata(connection.metadata);
  const next: GraphConnectionMetadata = { ...current, ...input.metadataPatch };
  await prisma.organizationOAuthConnection.update({
    where: { id: connection.id },
    data: { metadata: next }
  });
};

const createWebhookClientState = (orgId: string): string =>
  `velo-ticket:${orgId}:${createId('wcs')}`;

const resolveConnection = async (orgId: string) => {
  const [org, connection] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: orgId },
      select: { id: true, allowMicrosoftAuth: true, microsoftWorkspaceConnected: true }
    }),
    prisma.organizationOAuthConnection.findUnique({
      where: {
        orgId_provider: {
          orgId,
          provider: OAuthProvider.microsoft
        }
      }
    })
  ]);

  if (!org || !org.allowMicrosoftAuth || !org.microsoftWorkspaceConnected || !connection) {
    throw new HttpError(409, 'Microsoft workspace integration is not connected for this organization.');
  }

  return {
    connection,
    metadata: parseConnectionMetadata(connection.metadata)
  };
};

const buildTicketUrl = (ticketId: string): string =>
  `${env.FRONTEND_BASE_URL.replace(/\/$/, '')}/app?tickets=${encodeURIComponent(ticketId)}`;

const extractHeaderValue = (headers: GraphMessageHeader[] | undefined, name: string): string | undefined =>
  headers?.find((header) => String(header?.name || '').toLowerCase() === name.toLowerCase())?.value;

const extractTicketIdFromMessage = (input: {
  subject?: string;
  headers?: GraphMessageHeader[];
  conversationId?: string;
  inReplyTo?: string;
  references?: string;
}): string | undefined => {
  const fromHeader = extractHeaderValue(input.headers, 'x-velo-ticket-id');
  if (fromHeader && fromHeader.trim()) return fromHeader.trim();

  const subject = String(input.subject || '');
  const bySubject = subject.match(/\[TKT:([A-Za-z0-9_-]+)\]/i)?.[1];
  if (bySubject) return bySubject;

  const link = `${input.references || ''} ${input.inReplyTo || ''} ${input.conversationId || ''}`;
  const byReference = link.match(/tkt[_-][A-Za-z0-9_-]+/i)?.[0];
  return byReference;
};

const remediationForGraphError = (message: string): string => {
  const text = String(message || '').toLowerCase();
  if (text.includes('re-consent') || text.includes('sso_reconnect_required')) {
    return 'Reconnect Microsoft in Integrations > Workspace SSO and accept consent.';
  }
  if (text.includes('insufficient') || text.includes('forbidden') || text.includes('(403)')) {
    return 'Grant admin consent for required Graph scopes (Mail.Read, Mail.Send, ChannelMessage.Send).';
  }
  if (text.includes('unauthorized') || text.includes('(401)') || text.includes('invalid_grant')) {
    return 'Reconnect Microsoft to refresh tokens for this workspace.';
  }
  if (text.includes('throttle') || text.includes('(429)')) {
    return 'Graph is throttling. Retry later or reduce burst notification volume.';
  }
  return 'Check Microsoft connection and permissions in Integrations > Workspace SSO.';
};

export const ticketsGraphService = {
  async recordWebhookHit(input: { orgId: string }): Promise<void> {
    await updateConnectionMetadata({
      orgId: input.orgId,
      metadataPatch: { lastMailWebhookAt: new Date().toISOString() }
    });
  },

  async sendTicketEmail(input: {
    orgId: string;
    to: string[];
    subject: string;
    htmlBody: string;
    ticketId: string;
  }): Promise<void> {
    if (input.to.length === 0) return;
    const accessToken = await ensureProviderAccessToken({ orgId: input.orgId, provider: 'microsoft' });
    await graphRequest({
      accessToken,
      method: 'POST',
      url: '/me/sendMail',
      body: {
        message: {
          subject: `[TKT:${input.ticketId}] ${input.subject}`,
          body: { contentType: 'HTML', content: input.htmlBody },
          toRecipients: input.to.map((address) => ({ emailAddress: { address } })),
          internetMessageHeaders: [
            { name: 'X-Velo-Ticket-Id', value: input.ticketId },
            { name: 'X-Velo-Thread-Key', value: `ticket-${input.ticketId}` }
          ]
        },
        saveToSentItems: true
      }
    });
  },

  async sendTicketTeamsCard(input: {
    orgId: string;
    title: string;
    summary: string;
    facts?: Array<{ title: string; value: string }>;
    ticketId: string;
  }): Promise<void> {
    const { metadata } = await resolveConnection(input.orgId);
    const teamsTeamId = metadata.teamsTeamId;
    const teamsChannelId = metadata.teamsChannelId;
    const teamsChatId = metadata.teamsChatId;
    if (!teamsChatId && !(teamsTeamId && teamsChannelId)) return;

    const accessToken = await ensureProviderAccessToken({ orgId: input.orgId, provider: 'microsoft' });
    const card = {
      type: 'AdaptiveCard',
      version: '1.5',
      $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
      body: [
        { type: 'TextBlock', size: 'Medium', weight: 'Bolder', text: input.title, wrap: true },
        { type: 'TextBlock', text: input.summary, wrap: true },
        ...(Array.isArray(input.facts) && input.facts.length > 0
          ? [{ type: 'FactSet', facts: input.facts }]
          : [])
      ],
      actions: [
        {
          type: 'Action.OpenUrl',
          title: 'Open ticket',
          url: buildTicketUrl(input.ticketId)
        }
      ]
    };

    const body = {
      body: {
        contentType: 'html',
        content: `Ticket update: ${input.title}`
      },
      attachments: [
        {
          id: createId('card'),
          contentType: 'application/vnd.microsoft.card.adaptive',
          contentUrl: null,
          content: JSON.stringify(card),
          name: 'ticket-card'
        }
      ]
    };

    if (teamsChatId) {
      await graphRequest({
        accessToken,
        method: 'POST',
        url: `/chats/${encodeURIComponent(teamsChatId)}/messages`,
        body
      });
      return;
    }

    await graphRequest({
      accessToken,
      method: 'POST',
      url: `/teams/${encodeURIComponent(String(teamsTeamId))}/channels/${encodeURIComponent(String(teamsChannelId))}/messages`,
      body
    });
  },

  async ensureMailSubscription(input: { orgId: string }): Promise<{ subscriptionId: string; expiresAt: string }> {
    const { metadata } = await resolveConnection(input.orgId);
    const accessToken = await ensureProviderAccessToken({ orgId: input.orgId, provider: 'microsoft' });
    const existingSubscriptionId = metadata.mailSubscriptionId;
    const existingClientState = metadata.mailWebhookClientState || createWebhookClientState(input.orgId);

    if (existingSubscriptionId && metadata.mailSubscriptionExpiresAt) {
      const expiresAt = Date.parse(metadata.mailSubscriptionExpiresAt);
      if (Number.isFinite(expiresAt) && expiresAt > Date.now() + 60 * 60 * 1000) {
        if (metadata.mailWebhookClientState !== existingClientState) {
          await updateConnectionMetadata({
            orgId: input.orgId,
            metadataPatch: { mailWebhookClientState: existingClientState }
          });
        }
        return { subscriptionId: existingSubscriptionId, expiresAt: metadata.mailSubscriptionExpiresAt };
      }
    }

    const expiration = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
    const webhookUrl = `${env.APP_BASE_URL.replace(/\/$/, '')}/api/v1/integrations/microsoft/graph/webhook`;
    let created: { id: string; expirationDateTime: string } | null = null;

    if (existingSubscriptionId) {
      try {
        created = await graphRequest<{
          id: string;
          expirationDateTime: string;
        }>({
          accessToken,
          method: 'PATCH',
          url: `/subscriptions/${encodeURIComponent(existingSubscriptionId)}`,
          body: {
            expirationDateTime: expiration
          }
        });
      } catch {
        created = null;
      }
    }

    if (!created) {
      created = await graphRequest<{
        id: string;
        expirationDateTime: string;
      }>({
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
  },

  async renewExpiringMailSubscriptions(input?: {
    renewBeforeMinutes?: number;
  }): Promise<{ scanned: number; renewed: number; failed: number }> {
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
        await this.ensureMailSubscription({ orgId: connection.orgId });
        renewed += 1;
      } catch {
        failed += 1;
      }
    }
    return { scanned: connections.length, renewed, failed };
  },

  async extractValidatedOrgIdsFromWebhookNotifications(input: {
    notifications: Array<{ clientState?: string }>;
  }): Promise<string[]> {
    const candidateMap = new Map<string, string>();
    input.notifications
      .map((item) => String(item?.clientState || ''))
      .filter(Boolean)
      .forEach((value) => {
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
    const expectedByOrgId = new Map(
      rows.map((row) => [row.orgId, parseConnectionMetadata(row.metadata).mailWebhookClientState || ''])
    );
    return candidates
      .filter((item) => expectedByOrgId.get(item.orgId) === item.clientState)
      .map((item) => item.orgId);
  },

  async syncMailDelta(input: { orgId: string }): Promise<{ processed: number; deltaLink?: string }> {
    const { metadata } = await resolveConnection(input.orgId);
    const accessToken = await ensureProviderAccessToken({ orgId: input.orgId, provider: 'microsoft' });
    let nextUrl =
      metadata.mailDeltaLink ||
      `${GRAPH_BASE_URL}/me/mailFolders/inbox/messages/delta?$select=id,subject,conversationId,internetMessageId,internetMessageHeaders,from,receivedDateTime,bodyPreview`;

    let processed = 0;
    let latestDeltaLink: string | undefined;

    while (nextUrl) {
      const payload = await withGraphRetry(async () => {
        const response = await fetch(nextUrl, {
          method: 'GET',
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        if (!response.ok) {
          const retryAfterMs = getRetryAfterMs(response);
          if (retryAfterMs) await sleep(retryAfterMs);
          throw new HttpError(400, `Microsoft delta query failed (${response.status}).`);
        }
        return response.json() as Promise<{
          value?: Array<any>;
          ['@odata.nextLink']?: string;
          ['@odata.deltaLink']?: string;
        }>;
      });

      for (const row of payload.value || []) {
        const messageId = String(row?.id || '').trim();
        if (!messageId) continue;
        const dedupKey = messageId;
        const seen = await ticketsNotificationStore.hasSeenInboundMessage({
          orgId: input.orgId,
          messageKey: dedupKey
        });
        if (seen) continue;
        await ticketsNotificationStore.markInboundMessageSeen({
          orgId: input.orgId,
          messageKey: dedupKey
        });

        const ticketId = extractTicketIdFromMessage({
          subject: row?.subject,
          headers: Array.isArray(row?.internetMessageHeaders) ? row.internetMessageHeaders : undefined,
          conversationId: row?.conversationId,
          inReplyTo: extractHeaderValue(row?.internetMessageHeaders, 'In-Reply-To'),
          references: extractHeaderValue(row?.internetMessageHeaders, 'References')
        });
        if (!ticketId) continue;

        const ticket = await ticketsStore.get(input.orgId, ticketId);
        if (!ticket) continue;

        const senderAddress = String(row?.from?.emailAddress?.address || '').trim().toLowerCase();
        const senderName = String(row?.from?.emailAddress?.name || senderAddress || 'Email user');
        const commentText = String(row?.bodyPreview || '').trim();
        if (!commentText) continue;

        const nextComments = [
          ...(ticket.comments || []),
          {
            id: createId('cmt'),
            userId: senderAddress ? `email:${senderAddress}` : 'email:unknown',
            userName: senderName,
            text: commentText,
            createdAt: Date.now()
          }
        ];
        await ticketsStore.update(input.orgId, ticket.id, { comments: nextComments, source: 'email' });
        processed += 1;
      }

      if (payload['@odata.nextLink']) {
        nextUrl = payload['@odata.nextLink'];
      } else {
        latestDeltaLink = payload['@odata.deltaLink'];
        nextUrl = '';
      }
    }

    await updateConnectionMetadata({
      orgId: input.orgId,
      metadataPatch: {
        ...(latestDeltaLink ? { mailDeltaLink: latestDeltaLink } : {}),
        lastMailDeltaSyncAt: new Date().toISOString()
      }
    });

    return { processed, deltaLink: latestDeltaLink };
  },

  async getDiagnostics(input: { orgId: string; queue: { queued: number; digestPending: number } }): Promise<TicketGraphDiagnostics> {
    const org = await prisma.organization.findUnique({
      where: { id: input.orgId },
      select: { id: true, allowMicrosoftAuth: true, microsoftWorkspaceConnected: true, microsoftTenantId: true }
    });
    const connection = await prisma.organizationOAuthConnection.findUnique({
      where: {
        orgId_provider: {
          orgId: input.orgId,
          provider: OAuthProvider.microsoft
        }
      }
    });

    const metadata = parseConnectionMetadata(connection?.metadata);
    const now = Date.now();
    const tokenExpTs = connection?.accessTokenExpiresAt ? connection.accessTokenExpiresAt.getTime() : NaN;
    const tokenStatus: TicketGraphDiagnostics['microsoft']['tokenStatus'] =
      !connection?.accessToken
        ? 'missing'
        : Number.isFinite(tokenExpTs)
          ? tokenExpTs <= now
            ? 'expired'
            : tokenExpTs - now <= 15 * 60 * 1000
              ? 'expiring'
              : 'ok'
          : 'ok';

    const subscriptionExpTs = Date.parse(String(metadata.mailSubscriptionExpiresAt || ''));
    const subscriptionStatus: TicketGraphDiagnostics['subscription']['status'] =
      !metadata.mailSubscriptionId
        ? 'missing'
        : !Number.isFinite(subscriptionExpTs)
          ? 'unknown'
          : subscriptionExpTs <= now
            ? 'expired'
            : subscriptionExpTs - now <= 6 * 60 * 60 * 1000
              ? 'expiring'
              : 'ok';

    const [inboundLast24h, inboundTotal, lastInboundRow, deliveryAgg, lastSent, lastFailed] = await Promise.all([
      prisma.ticketInboundMessageState.count({
        where: { orgId: input.orgId, seenAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }
      }),
      prisma.ticketInboundMessageState.count({ where: { orgId: input.orgId } }),
      prisma.ticketInboundMessageState.findFirst({
        where: { orgId: input.orgId },
        orderBy: { seenAt: 'desc' },
        select: { seenAt: true }
      }),
      prisma.ticketNotificationDelivery.groupBy({
        by: ['status'],
        where: { orgId: input.orgId },
        _count: { _all: true }
      }),
      prisma.ticketNotificationDelivery.findFirst({
        where: { orgId: input.orgId, status: 'sent' },
        orderBy: { sentAt: 'desc' },
        select: { sentAt: true, createdAt: true }
      }),
      prisma.ticketNotificationDelivery.findFirst({
        where: { orgId: input.orgId, status: { in: ['failed', 'dead_letter'] } },
        orderBy: { updatedAt: 'desc' },
        select: { updatedAt: true, createdAt: true }
      })
    ]);

    const statusCount = new Map(deliveryAgg.map((row) => [row.status, row._count._all]));
    const failedLast24h = await prisma.ticketNotificationDelivery.count({
      where: {
        orgId: input.orgId,
        status: { in: ['failed', 'dead_letter'] },
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }
    });

    const diagnostics: TicketGraphDiagnostics = {
      orgId: input.orgId,
      microsoft: {
        connected: Boolean(connection && org?.microsoftWorkspaceConnected),
        ssoEnabled: Boolean(org?.allowMicrosoftAuth),
        tenantId: org?.microsoftTenantId || undefined,
        hasRefreshToken: Boolean(connection?.refreshToken),
        accessTokenExpiresAt: connection?.accessTokenExpiresAt?.toISOString(),
        tokenStatus,
        tokenError: connection ? undefined : 'No Microsoft OAuth connection found.'
      },
      subscription: {
        id: metadata.mailSubscriptionId,
        expiresAt: metadata.mailSubscriptionExpiresAt,
        minutesRemaining: Number.isFinite(subscriptionExpTs) ? Math.floor((subscriptionExpTs - now) / 60000) : undefined,
        status: subscriptionStatus
      },
      webhook: {
        clientStateConfigured: Boolean(metadata.mailWebhookClientState),
        lastSyncAt: metadata.lastMailDeltaSyncAt,
        lastWebhookAt: metadata.lastMailWebhookAt,
        inboundSeenLast24h: inboundLast24h,
        inboundSeenTotal: inboundTotal || statusCount.get('sent') || 0
      },
      delivery: {
        queued: input.queue.queued,
        digestPending: input.queue.digestPending,
        failedLast24h,
        deadLetterOpen: statusCount.get('dead_letter') || 0,
        lastSentAt: lastSent?.sentAt?.toISOString() || lastSent?.createdAt?.toISOString(),
        lastFailureAt: lastFailed?.updatedAt?.toISOString() || lastFailed?.createdAt?.toISOString()
      }
    };

    if (diagnostics.microsoft.connected) {
      try {
        await ensureProviderAccessToken({ orgId: input.orgId, provider: 'microsoft' });
      } catch (error: any) {
        diagnostics.microsoft.tokenStatus = 'error';
        diagnostics.microsoft.tokenError = error?.message || 'Could not refresh Microsoft token.';
      }
    }

    if (lastInboundRow?.seenAt && !diagnostics.webhook.lastWebhookAt) {
      diagnostics.webhook.lastWebhookAt = lastInboundRow.seenAt.toISOString();
    }

    return diagnostics;
  },

  async runActiveHealthCheck(input: { orgId: string; queue: { queued: number; digestPending: number } }): Promise<TicketGraphActiveHealthCheck> {
    const diagnostics = await this.getDiagnostics(input);
    const checks: TicketGraphActiveHealthCheck['checks'] = [];

    const connected = diagnostics.microsoft.connected && diagnostics.microsoft.ssoEnabled;
    checks.push({
      key: 'connection',
      ok: connected,
      detail: connected
        ? 'Microsoft workspace is connected and SSO is enabled.'
        : 'Microsoft workspace is not connected or SSO is disabled.',
      remediation: connected ? undefined : 'Enable and connect Microsoft in Integrations > Workspace SSO.'
    });

    let accessToken: string | null = null;
    try {
      accessToken = await ensureProviderAccessToken({ orgId: input.orgId, provider: 'microsoft' });
      checks.push({
        key: 'token_refresh',
        ok: true,
        detail: 'Token refresh/access token retrieval succeeded.'
      });
    } catch (error: any) {
      checks.push({
        key: 'token_refresh',
        ok: false,
        detail: error?.message || 'Token refresh failed.',
        remediation: remediationForGraphError(error?.message || '')
      });
    }

    if (accessToken) {
      try {
        const me = await graphRequest<{ id?: string; userPrincipalName?: string }>({
          accessToken,
          url: '/me?$select=id,userPrincipalName'
        });
        checks.push({
          key: 'graph_me',
          ok: Boolean(me?.id),
          detail: me?.id ? `Graph /me succeeded (${me.userPrincipalName || me.id}).` : 'Graph /me returned empty payload.'
        });
      } catch (error: any) {
        checks.push({
          key: 'graph_me',
          ok: false,
          detail: error?.message || 'Graph /me probe failed.',
          remediation: remediationForGraphError(error?.message || '')
        });
      }

      if (diagnostics.subscription.id) {
        try {
          const sub = await graphRequest<{ id?: string; expirationDateTime?: string }>({
            accessToken,
            url: `/subscriptions/${encodeURIComponent(diagnostics.subscription.id)}`
          });
          checks.push({
            key: 'subscription_read',
            ok: Boolean(sub?.id),
            detail: sub?.id
              ? `Subscription readable; expires ${sub.expirationDateTime || diagnostics.subscription.expiresAt || 'unknown'}.`
              : 'Subscription read returned empty payload.',
            remediation: sub?.id ? undefined : 'Recreate subscription from Ticket Notifications settings.'
          });
        } catch (error: any) {
          checks.push({
            key: 'subscription_read',
            ok: false,
            detail: error?.message || 'Subscription read failed.',
            remediation: 'Recreate subscription and verify webhook URL is reachable from Microsoft Graph.'
          });
        }
      } else {
        checks.push({
          key: 'subscription_read',
          ok: false,
          detail: 'No mail subscription ID found.',
          remediation: 'Create a mail subscription from Ticket Notifications settings.'
        });
      }
    } else {
      checks.push({
        key: 'graph_me',
        ok: false,
        detail: 'Skipped because token refresh failed.',
        remediation: 'Resolve token issue first, then rerun health check.'
      });
      checks.push({
        key: 'subscription_read',
        ok: false,
        detail: 'Skipped because token refresh failed.',
        remediation: 'Resolve token issue first, then rerun health check.'
      });
    }

    checks.push({
      key: 'webhook_client_state',
      ok: diagnostics.webhook.clientStateConfigured,
      detail: diagnostics.webhook.clientStateConfigured
        ? 'Webhook client state is configured.'
        : 'Webhook client state is missing.',
      remediation: diagnostics.webhook.clientStateConfigured ? undefined : 'Recreate mail subscription to generate client state.'
    });

    checks.push({
      key: 'delivery_dead_letter',
      ok: diagnostics.delivery.deadLetterOpen === 0,
      detail:
        diagnostics.delivery.deadLetterOpen === 0
          ? 'No dead-letter notification items open.'
          : `${diagnostics.delivery.deadLetterOpen} dead-letter item(s) open.`,
      remediation:
        diagnostics.delivery.deadLetterOpen === 0
          ? undefined
          : 'Retry dead-letter deliveries from the Delivery status panel and fix recurring permission errors.'
    });

    return {
      ranAt: new Date().toISOString(),
      checks,
      ok: checks.every((row) => row.ok)
    };
  }
};
