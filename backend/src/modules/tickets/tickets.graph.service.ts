import { OAuthProvider } from '@prisma/client';
import { env } from '../../config/env.js';
import { HttpError } from '../../lib/httpError.js';
import { prisma } from '../../lib/prisma.js';
import { createId } from '../../lib/ids.js';
import { ensureProviderAccessToken } from '../auth/auth.oauth.js';
import { ticketsStore } from './tickets.store.js';
import { ticketsNotificationStore } from './tickets.notification.store.js';
import { isTicketCode } from './tickets.reference.js';

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
  webhookClientStateMismatchCount24h?: number;
  lastWebhookClientStateMismatchAt?: string;
  inboundDuplicateDropCount24h?: number;
  lastInboundDuplicateDropAt?: string;
  graphThrottleCount24h?: number;
  lastGraphThrottleAt?: string;
  graphConsecutiveFailures?: number;
  graphCircuitBreakerUntil?: string;
  graphCircuitBreakerReason?: string;
  refreshTokenPresent?: boolean;
  lastTokenRefreshAt?: string;
  lastTokenRefreshStatus?: 'ok' | 'temporary_failure' | 'reconsent_required';
  lastTokenRefreshError?: string;
};
type GraphAuthMode = 'app_only' | 'delegated';
type GraphAuthContext = {
  accessToken: string;
  mode: GraphAuthMode;
  tenantId?: string;
};

type GraphMessageHeader = { name?: string; value?: string };

const GRAPH_BASE_URL = 'https://graph.microsoft.com/v1.0';
const MICROSOFT_TOKEN_BASE = 'https://login.microsoftonline.com';
const APP_ONLY_SCOPE = 'https://graph.microsoft.com/.default';
const appOnlyTokenCache = new Map<string, { accessToken: string; expiresAtMs: number }>();

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
    // Graph endpoints like sendMail often return 202 with an empty body.
    if (response.status === 202 || response.status === 204) return undefined as T;
    const raw = await response.text().catch(() => '');
    if (!raw || !raw.trim()) return undefined as T;
    try {
      return JSON.parse(raw) as T;
    } catch {
      throw new HttpError(502, `Microsoft Graph returned invalid JSON for ${input.url}`);
    }
  });
};

const isAccessDeniedError = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : String(error || '');
  const lower = message.toLowerCase();
  return (
    message.includes('(403)') ||
    lower.includes('erroraccessdenied') ||
    lower.includes('authorization_requestdenied')
  );
};

const removeSenderOverrides = (message: Record<string, unknown>) => {
  const clone = { ...message };
  delete (clone as any).from;
  delete (clone as any).sender;
  delete (clone as any).replyTo;
  return clone;
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

const isThrottleError = (message: string): boolean => {
  const text = String(message || '').toLowerCase();
  return text.includes('(429)') || text.includes('throttle') || text.includes('too many requests');
};

const toIso = (value?: string): number => {
  const ts = Date.parse(String(value || ''));
  return Number.isFinite(ts) ? ts : NaN;
};

const rolling24hCount = (count: unknown, lastAt?: string): number => {
  const lastTs = toIso(lastAt);
  if (!Number.isFinite(lastTs)) return 0;
  if (Date.now() - lastTs > 24 * 60 * 60 * 1000) return 0;
  const value = Number(count || 0);
  return Number.isFinite(value) && value > 0 ? value : 0;
};

const isCircuitOpen = (metadata: GraphConnectionMetadata): boolean => {
  const until = toIso(metadata.graphCircuitBreakerUntil);
  return Number.isFinite(until) && until > Date.now();
};

const getCircuitOpenError = (metadata: GraphConnectionMetadata): HttpError => {
  const until = metadata.graphCircuitBreakerUntil || 'unknown';
  const reason = metadata.graphCircuitBreakerReason || 'Graph failures';
  return new HttpError(503, `Ticket notifications temporarily paused until ${until}: ${reason}`);
};

const updateGraphHealthOnResult = async (input: { orgId: string; ok: boolean; errorMessage?: string }) => {
  const connection = await prisma.organizationOAuthConnection.findUnique({
    where: { orgId_provider: { orgId: input.orgId, provider: OAuthProvider.microsoft } },
    select: { id: true, metadata: true }
  });
  if (!connection) return;
  const current = parseConnectionMetadata(connection.metadata);
  const nowIso = new Date().toISOString();
  const patch: Partial<GraphConnectionMetadata> = {};
  if (input.ok) {
    patch.graphConsecutiveFailures = 0;
    patch.graphCircuitBreakerUntil = undefined;
    patch.graphCircuitBreakerReason = undefined;
  } else {
    const failures = Math.max(0, Number(current.graphConsecutiveFailures || 0)) + 1;
    patch.graphConsecutiveFailures = failures;
    if (isThrottleError(String(input.errorMessage || ''))) {
      const lastThrottleTs = toIso(current.lastGraphThrottleAt);
      patch.graphThrottleCount24h =
        Number.isFinite(lastThrottleTs) && Date.now() - lastThrottleTs <= 24 * 60 * 60 * 1000
          ? Math.max(0, Number(current.graphThrottleCount24h || 0)) + 1
          : 1;
      patch.lastGraphThrottleAt = nowIso;
    }
    if (failures >= 5) {
      patch.graphCircuitBreakerUntil = new Date(Date.now() + 5 * 60 * 1000).toISOString();
      patch.graphCircuitBreakerReason = String(input.errorMessage || 'Consecutive Graph failures');
    }
  }
  await prisma.organizationOAuthConnection.update({
    where: { id: connection.id },
    data: { metadata: { ...current, ...patch } }
  });
};

const createWebhookClientState = (orgId: string): string =>
  `velo-ticket:${orgId}:${createId('wcs')}`;

const getOrgNotificationSenderEmail = async (orgId: string): Promise<string | undefined> => {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { notificationSenderEmail: true }
  });
  const senderEmail = String(org?.notificationSenderEmail || '').trim().toLowerCase();
  return senderEmail || undefined;
};

const resolveConnection = async (orgId: string) => {
  const [org, connection] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: orgId },
      select: { id: true, allowMicrosoftAuth: true, microsoftWorkspaceConnected: true, microsoftTenantId: true }
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
    org,
    connection,
    metadata: parseConnectionMetadata(connection.metadata)
  };
};

const getAppOnlyGraphToken = async (input: { tenantId: string }): Promise<string> => {
  const tenantId = String(input.tenantId || '').trim();
  if (!tenantId) throw new HttpError(503, 'Microsoft tenant id is required for app-only Graph access.');
  const cached = appOnlyTokenCache.get(tenantId);
  if (cached && cached.expiresAtMs > Date.now() + 60_000) return cached.accessToken;

  if (!env.MICROSOFT_OAUTH_CLIENT_ID || !env.MICROSOFT_OAUTH_CLIENT_SECRET) {
    throw new HttpError(503, 'Microsoft OAuth app credentials are missing on server.');
  }

  const params = new URLSearchParams({
    client_id: env.MICROSOFT_OAUTH_CLIENT_ID,
    client_secret: env.MICROSOFT_OAUTH_CLIENT_SECRET,
    grant_type: 'client_credentials',
    scope: APP_ONLY_SCOPE
  });
  const response = await fetch(`${MICROSOFT_TOKEN_BASE}/${encodeURIComponent(tenantId)}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({} as Record<string, unknown>));
    throw new HttpError(503, 'Microsoft Graph app-only token request failed.', {
      code: 'GRAPH_APP_ONLY_TOKEN_FAILED',
      providerError: String(payload?.error || ''),
      providerDescription: String(payload?.error_description || ''),
      status: response.status
    });
  }
  const token = await response.json() as { access_token?: string; expires_in?: number };
  if (!token.access_token) {
    throw new HttpError(503, 'Microsoft Graph app-only token response had no access token.', {
      code: 'GRAPH_APP_ONLY_TOKEN_FAILED'
    });
  }
  const expiresIn = Math.max(60, Number(token.expires_in || 3600));
  appOnlyTokenCache.set(tenantId, {
    accessToken: token.access_token,
    expiresAtMs: Date.now() + Math.max(60, expiresIn - 60) * 1000
  });
  return token.access_token;
};

const resolveGraphAuthContext = async (input: { orgId: string }): Promise<GraphAuthContext> => {
  const { org } = await resolveConnection(input.orgId);
  const appOnlyEnabled = Boolean(env.MICROSOFT_GRAPH_APP_ONLY_ENABLED);
  const appOnlyStrict = Boolean(env.MICROSOFT_GRAPH_APP_ONLY_STRICT);
  const tenantId = String(org.microsoftTenantId || '').trim();
  if (appOnlyEnabled && tenantId) {
    try {
      const accessToken = await getAppOnlyGraphToken({ tenantId });
      return { accessToken, mode: 'app_only', tenantId };
    } catch (error: any) {
      if (appOnlyStrict) {
        throw new HttpError(
          503,
          `Microsoft Graph app-only auth is required but failed for tenant ${tenantId}.`,
          {
            code: 'GRAPH_APP_ONLY_STRICT_FAILURE',
            cause: String(error?.message || 'App-only auth failed')
          }
        );
      }
      // Fall back to delegated token flow in non-strict mode.
    }
  } else if (appOnlyStrict) {
    throw new HttpError(
      503,
      'Microsoft Graph app-only strict mode is enabled but tenant id is missing on workspace.',
      { code: 'GRAPH_APP_ONLY_STRICT_FAILURE' }
    );
  }
  const accessToken = await ensureProviderAccessToken({ orgId: input.orgId, provider: 'microsoft' });
  return { accessToken, mode: 'delegated', tenantId: tenantId || undefined };
};

const buildTicketUrl = (ticketId: string): string =>
  `${env.FRONTEND_BASE_URL.replace(/\/$/, '')}/app?tickets=${encodeURIComponent(ticketId)}`;
const buildAppUrl = (path: string): string => `${env.FRONTEND_BASE_URL.replace(/\/$/, '')}${path}`;

const extractHeaderValue = (headers: GraphMessageHeader[] | undefined, name: string): string | undefined =>
  headers?.find((header) => String(header?.name || '').toLowerCase() === name.toLowerCase())?.value;

const decodeHtmlEntities = (value: string): string =>
  value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");

const stripHtml = (value: string): string =>
  decodeHtmlEntities(
    value
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
  );

const normalizeWhitespace = (value: string): string =>
  value
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .trim();

const trimQuotedReply = (value: string): string => {
  const lines = value.split('\n');
  const keep: string[] = [];
  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (/^>/.test(line)) break;
    if (/^on .+wrote:$/i.test(line)) break;
    if (/^from:\s/i.test(line)) break;
    if (/^sent:\s/i.test(line)) break;
    if (/^subject:\s/i.test(line)) break;
    if (/^to:\s/i.test(line)) break;
    if (/^--\s*$/.test(line)) break;
    keep.push(line);
  }
  return normalizeWhitespace(keep.join('\n'));
};

const extractCommentTextFromMessage = (row: any): string => {
  const candidates: string[] = [];
  const body = typeof row?.body?.content === 'string' ? row.body.content : '';
  const uniqueBody = typeof row?.uniqueBody?.content === 'string' ? row.uniqueBody.content : '';
  const preview = typeof row?.bodyPreview === 'string' ? row.bodyPreview : '';
  if (body) candidates.push(stripHtml(body));
  if (uniqueBody) candidates.push(stripHtml(uniqueBody));
  if (preview) candidates.push(preview);
  const primary = candidates.find((item) => normalizeWhitespace(item).length > 0) || '';
  const trimmed = trimQuotedReply(primary);
  return trimmed.slice(0, 4000).trim();
};

const tryExtractTicketId = (value: string): string | undefined => {
  const input = String(value || '');
  const byCodeBracket = input.match(/\[([A-Z0-9]{3}-\d{6})\]/i)?.[1];
  if (byCodeBracket) return byCodeBracket.toUpperCase();
  const byBracket = input.match(/\[TKT:([A-Za-z0-9_-]+)\]/i)?.[1];
  if (byBracket) return byBracket;
  const byHeader = input.match(/x-velo-ticket-id[:\s]+([A-Za-z0-9_-]+)/i)?.[1];
  if (byHeader) return byHeader;
  const byThreadKey = input.match(/ticket-([A-Za-z0-9_-]+)/i)?.[1];
  if (byThreadKey) return byThreadKey;
  const byUrl = input.match(/[?&]tickets=([A-Za-z0-9_-]+)/i)?.[1];
  if (byUrl) return byUrl;
  const byLegacy = input.match(/tkt[_-]([A-Za-z0-9_-]+)/i)?.[1];
  if (byLegacy) return byLegacy;
  return undefined;
};

const extractTicketIdFromMessage = (input: {
  subject?: string;
  headers?: GraphMessageHeader[];
  conversationId?: string;
  inReplyTo?: string;
  references?: string;
}): string | undefined => {
  const fromHeader = extractHeaderValue(input.headers, 'x-velo-ticket-id');
  if (fromHeader && fromHeader.trim()) return fromHeader.trim();
  const fromThreadHeader = extractHeaderValue(input.headers, 'x-velo-thread-key');
  const headerBlob = (input.headers || []).map((header) => `${header?.name || ''}: ${header?.value || ''}`).join('\n');
  const combined = [
    String(input.subject || ''),
    String(input.references || ''),
    String(input.inReplyTo || ''),
    String(input.conversationId || ''),
    String(fromThreadHeader || ''),
    headerBlob
  ]
    .filter(Boolean)
    .join('\n');
  return tryExtractTicketId(combined);
};

export const ticketsGraphService = {
  async senderMailboxPreflight(input: {
    orgId: string;
    testRecipientEmail?: string;
  }): Promise<{
    ok: boolean;
    senderEmail?: string;
    checks: Array<{ key: string; ok: boolean; message: string }>;
  }> {
    const checks: Array<{ key: string; ok: boolean; message: string }> = [];
    try {
      const { metadata, connection, org } = await resolveConnection(input.orgId);
      checks.push({ key: 'workspace_connection', ok: true, message: 'Microsoft workspace connection is active.' });
      const hasRefreshToken = Boolean(connection.refreshToken);
      checks.push({
        key: 'refresh_token_presence',
        ok: hasRefreshToken,
        message: hasRefreshToken ? 'Refresh token is present.' : 'Refresh token is missing. Re-consent is required.'
      });
      if (isCircuitOpen(metadata)) {
        checks.push({
          key: 'circuit_breaker',
          ok: false,
          message: `Graph circuit breaker is active until ${metadata.graphCircuitBreakerUntil || 'unknown'}.`
        });
      }
    } catch (error: any) {
      return {
        ok: false,
        checks: [{ key: 'workspace_connection', ok: false, message: error?.message || 'Microsoft workspace is not connected.' }]
      };
    }

    const senderEmail = await getOrgNotificationSenderEmail(input.orgId);
    if (!senderEmail) {
      checks.push({
        key: 'sender_mailbox',
        ok: false,
        message: 'Notification sender mailbox is not set in workspace settings.'
      });
      return { ok: false, checks };
    }
    checks.push({ key: 'sender_mailbox', ok: true, message: `Sender mailbox is configured as ${senderEmail}.` });

    let accessToken: string;
    let authMode: GraphAuthMode = 'delegated';
    let authTenantId: string | undefined;
    try {
      const auth = await resolveGraphAuthContext({ orgId: input.orgId });
      accessToken = auth.accessToken;
      authMode = auth.mode;
      authTenantId = auth.tenantId;
      checks.push({
        key: 'oauth_token',
        ok: true,
        message:
          auth.mode === 'app_only'
            ? `Microsoft Graph app-only token is valid${authTenantId ? ` (tenant: ${authTenantId})` : ''}.`
            : 'Microsoft OAuth token is valid.'
      });
    } catch (error: any) {
      checks.push({ key: 'oauth_token', ok: false, message: error?.message || 'Unable to get Microsoft OAuth token.' });
      if (error?.details?.providerError) {
        checks.push({
          key: 'oauth_token_provider_error',
          ok: false,
          message: `Provider error: ${String(error.details.providerError)}${error?.details?.providerDescription ? ` (${String(error.details.providerDescription)})` : ''}`
        });
      }
      return { ok: false, senderEmail, checks };
    }
    try {
      const latest = await prisma.organizationOAuthConnection.findUnique({
        where: { orgId_provider: { orgId: input.orgId, provider: OAuthProvider.microsoft } },
        select: { metadata: true }
      });
      const latestMeta = parseConnectionMetadata(latest?.metadata);
      const lastRefreshStatus = latestMeta.lastTokenRefreshStatus;
      const lastRefreshAt = latestMeta.lastTokenRefreshAt;
      const lastRefreshError = latestMeta.lastTokenRefreshError;
      if (lastRefreshStatus === 'ok') {
        checks.push({
          key: 'token_refresh_last_result',
          ok: true,
          message: `Last token refresh succeeded${lastRefreshAt ? ` at ${lastRefreshAt}` : ''}.`
        });
      } else if (lastRefreshStatus === 'temporary_failure') {
        checks.push({
          key: 'token_refresh_last_result',
          ok: false,
          message: `Last token refresh failed temporarily${lastRefreshAt ? ` at ${lastRefreshAt}` : ''}${lastRefreshError ? `: ${lastRefreshError}` : ''}`
        });
      } else if (lastRefreshStatus === 'reconsent_required') {
        checks.push({
          key: 'token_refresh_last_result',
          ok: false,
          message: `Last token refresh requires re-consent${lastRefreshAt ? ` (${lastRefreshAt})` : ''}${lastRefreshError ? `: ${lastRefreshError}` : ''}`
        });
      } else {
        checks.push({
          key: 'token_refresh_last_result',
          ok: true,
          message: 'No token refresh history yet.'
        });
      }
    } catch {
      checks.push({
        key: 'token_refresh_last_result',
        ok: true,
        message: 'No token refresh history yet.'
      });
    }

    try {
      let principal = 'unknown principal';
      if (authMode === 'app_only') {
        principal = `App-only Graph context${authTenantId ? ` (tenant: ${authTenantId})` : ''}`;
      } else {
        const me = await graphRequest<{
          id?: string;
          displayName?: string;
          userPrincipalName?: string;
          mail?: string;
        }>({
          accessToken,
          method: 'GET',
          url: '/me?$select=id,displayName,userPrincipalName,mail'
        });
        principal =
          me.mail ||
          me.userPrincipalName ||
          me.displayName ||
          me.id ||
          'unknown principal';
      }
      checks.push({
        key: 'connected_principal',
        ok: true,
        message: `Connected principal: ${principal}`
      });
    } catch (error: any) {
      checks.push({
        key: 'connected_principal',
        ok: false,
        message: error?.message || 'Could not resolve connected principal from Microsoft Graph.'
      });
    }

    if (authMode === 'delegated') {
      try {
        await graphRequest({
          accessToken,
          method: 'GET',
          url: `/users/${encodeURIComponent(senderEmail)}?$select=id,displayName,mail,userPrincipalName`
        });
        checks.push({ key: 'mailbox_lookup', ok: true, message: 'Shared mailbox exists in tenant directory.' });
      } catch (error: any) {
        checks.push({
          key: 'mailbox_lookup',
          ok: false,
          message: error?.message || 'Could not read sender mailbox from Microsoft Graph.'
        });
        return { ok: false, senderEmail, checks };
      }
    } else {
      checks.push({
        key: 'mailbox_lookup',
        ok: true,
        message: 'Mailbox directory lookup skipped in app-only mode.'
      });
    }

    try {
      await graphRequest({
        accessToken,
        method: 'GET',
        url: `/users/${encodeURIComponent(senderEmail)}/mailFolders/inbox?$top=1`
      });
      checks.push({
        key: 'mailbox_read_access',
        ok: true,
        message: 'Mailbox read access is available (Mail.Read + mailbox permissions).'
      });
    } catch (error: any) {
      const message =
        authMode === 'app_only' && isAccessDeniedError(error)
          ? 'Mailbox read access denied for app-only mode. Grant Microsoft Graph Application permission Mail.Read (admin consent) and ensure your Exchange Application Access Policy includes this sender mailbox.'
          : error?.message || 'Mailbox read access failed.';
      checks.push({
        key: 'mailbox_read_access',
        ok: false,
        message
      });
    }

    if (input.testRecipientEmail) {
      try {
        await this.sendWorkspaceEmail({
          orgId: input.orgId,
          to: [input.testRecipientEmail.trim().toLowerCase()],
          subject: `Velo sender preflight test (${senderEmail})`,
          htmlBody:
            '<div style="font-family:Segoe UI,Inter,sans-serif"><h3>Velo preflight test</h3><p>This is a sender mailbox connectivity test.</p></div>',
          threadKey: `preflight-${Date.now()}`
        });
        checks.push({
          key: 'send_mail_test',
          ok: true,
          message: `Test email sent to ${input.testRecipientEmail.trim().toLowerCase()}.`
        });
      } catch (error: any) {
        if (senderEmail && isAccessDeniedError(error)) {
          try {
            await graphRequest({
              accessToken,
              method: 'POST',
              url: '/me/sendMail',
              body: {
                message: {
                  subject: `Velo sender preflight fallback test`,
                  body: {
                    contentType: 'HTML',
                    content:
                      '<div style="font-family:Segoe UI,Inter,sans-serif"><h3>Velo fallback send test</h3><p>Shared mailbox is denied, but connected mailbox send works.</p></div>'
                  },
                  toRecipients: [{ emailAddress: { address: input.testRecipientEmail.trim().toLowerCase() } }]
                },
                saveToSentItems: true
              }
            });
            checks.push({
              key: 'send_mail_test_fallback',
              ok: true,
              message:
                'Shared mailbox send is denied, but fallback send via connected mailbox succeeded.'
            });
          } catch (fallbackError: any) {
            checks.push({
              key: 'send_mail_test_fallback',
              ok: false,
              message: fallbackError?.message || 'Fallback send via connected mailbox failed.'
            });
          }
        }
        checks.push({
          key: 'send_mail_test',
          ok: false,
          message: error?.message || 'Test send failed.'
        });
      }
    }

    return { ok: checks.every((row) => row.ok), senderEmail, checks };
  },

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
    ticketCode?: string;
  }): Promise<void> {
    if (input.to.length === 0) return;
    const { metadata } = await resolveConnection(input.orgId);
    if (isCircuitOpen(metadata)) throw getCircuitOpenError(metadata);
    try {
      const { accessToken, mode } = await resolveGraphAuthContext({ orgId: input.orgId });
      const senderEmail = await getOrgNotificationSenderEmail(input.orgId);
      if (mode === 'app_only' && !senderEmail) {
        throw new HttpError(400, 'Notification sender mailbox must be configured for app-only delivery.');
      }
      const message = {
        subject: input.ticketCode ? `[${input.ticketCode}] ${input.subject}` : input.subject,
        body: { contentType: 'HTML', content: input.htmlBody },
        toRecipients: input.to.map((address) => ({ emailAddress: { address } })),
        ...(senderEmail
          ? {
              from: { emailAddress: { address: senderEmail } },
              sender: { emailAddress: { address: senderEmail } },
              replyTo: [{ emailAddress: { address: senderEmail } }]
            }
          : {}),
        internetMessageHeaders: [
          { name: 'X-Velo-Ticket-Id', value: input.ticketId },
          { name: 'X-Velo-Thread-Key', value: `ticket-${input.ticketId}` }
        ]
      } as Record<string, unknown>;
      try {
        await graphRequest({
          accessToken,
          method: 'POST',
          url: senderEmail ? `/users/${encodeURIComponent(senderEmail)}/sendMail` : '/me/sendMail',
          body: { message, saveToSentItems: true }
        });
      } catch (error) {
        // Temporary resilience path: if shared mailbox delegation is still propagating,
        // fall back to connected mailbox sender to avoid dropping critical notifications.
        if (mode === 'app_only' || !senderEmail || !isAccessDeniedError(error)) throw error;
        await graphRequest({
          accessToken,
          method: 'POST',
          url: '/me/sendMail',
          body: { message: removeSenderOverrides(message), saveToSentItems: true }
        });
      }
      await updateGraphHealthOnResult({ orgId: input.orgId, ok: true });
    } catch (error: any) {
      await updateGraphHealthOnResult({ orgId: input.orgId, ok: false, errorMessage: error?.message || String(error) });
      throw error;
    }
  },

  async sendWorkspaceEmail(input: {
    orgId: string;
    to: string[];
    subject: string;
    htmlBody: string;
    threadKey?: string;
  }): Promise<void> {
    if (input.to.length === 0) return;
    const { metadata } = await resolveConnection(input.orgId);
    if (isCircuitOpen(metadata)) throw getCircuitOpenError(metadata);
    try {
      const { accessToken, mode } = await resolveGraphAuthContext({ orgId: input.orgId });
      const senderEmail = await getOrgNotificationSenderEmail(input.orgId);
      if (mode === 'app_only' && !senderEmail) {
        throw new HttpError(400, 'Notification sender mailbox must be configured for app-only delivery.');
      }
      const message = {
        subject: input.subject,
        body: { contentType: 'HTML', content: input.htmlBody },
        toRecipients: input.to.map((address) => ({ emailAddress: { address } })),
        ...(senderEmail
          ? {
              from: { emailAddress: { address: senderEmail } },
              sender: { emailAddress: { address: senderEmail } },
              replyTo: [{ emailAddress: { address: senderEmail } }]
            }
          : {}),
        internetMessageHeaders: input.threadKey
          ? [{ name: 'X-Velo-Thread-Key', value: input.threadKey }]
          : undefined
      } as Record<string, unknown>;
      try {
        await graphRequest({
          accessToken,
          method: 'POST',
          url: senderEmail ? `/users/${encodeURIComponent(senderEmail)}/sendMail` : '/me/sendMail',
          body: { message, saveToSentItems: true }
        });
      } catch (error) {
        if (mode === 'app_only' || !senderEmail || !isAccessDeniedError(error)) throw error;
        await graphRequest({
          accessToken,
          method: 'POST',
          url: '/me/sendMail',
          body: { message: removeSenderOverrides(message), saveToSentItems: true }
        });
      }
      await updateGraphHealthOnResult({ orgId: input.orgId, ok: true });
    } catch (error: any) {
      await updateGraphHealthOnResult({ orgId: input.orgId, ok: false, errorMessage: error?.message || String(error) });
      throw error;
    }
  },

  async sendTicketTeamsCard(input: {
    orgId: string;
    title: string;
    summary: string;
    facts?: Array<{ title: string; value: string }>;
    ticketId: string;
  }): Promise<void> {
    const { metadata } = await resolveConnection(input.orgId);
    if (isCircuitOpen(metadata)) throw getCircuitOpenError(metadata);
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

    try {
      if (teamsChatId) {
        await graphRequest({
          accessToken,
          method: 'POST',
          url: `/chats/${encodeURIComponent(teamsChatId)}/messages`,
          body
        });
        await updateGraphHealthOnResult({ orgId: input.orgId, ok: true });
        return;
      }

      await graphRequest({
        accessToken,
        method: 'POST',
        url: `/teams/${encodeURIComponent(String(teamsTeamId))}/channels/${encodeURIComponent(String(teamsChannelId))}/messages`,
        body
      });
      await updateGraphHealthOnResult({ orgId: input.orgId, ok: true });
    } catch (error: any) {
      await updateGraphHealthOnResult({ orgId: input.orgId, ok: false, errorMessage: error?.message || String(error) });
      throw error;
    }
  },

  async sendWorkspaceTeamsCard(input: {
    orgId: string;
    title: string;
    summary: string;
    facts?: Array<{ title: string; value: string }>;
    openPath?: string;
  }): Promise<void> {
    const { metadata } = await resolveConnection(input.orgId);
    if (isCircuitOpen(metadata)) throw getCircuitOpenError(metadata);
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
      actions: input.openPath
        ? [
            {
              type: 'Action.OpenUrl',
              title: 'Open in Velo',
              url: buildAppUrl(input.openPath)
            }
          ]
        : []
    };

    const body = {
      body: {
        contentType: 'html',
        content: input.title
      },
      attachments: [
        {
          id: createId('card'),
          contentType: 'application/vnd.microsoft.card.adaptive',
          contentUrl: null,
          content: JSON.stringify(card),
          name: 'workspace-card'
        }
      ]
    };

    try {
      if (teamsChatId) {
        await graphRequest({
          accessToken,
          method: 'POST',
          url: `/chats/${encodeURIComponent(teamsChatId)}/messages`,
          body
        });
        await updateGraphHealthOnResult({ orgId: input.orgId, ok: true });
        return;
      }

      await graphRequest({
        accessToken,
        method: 'POST',
        url: `/teams/${encodeURIComponent(String(teamsTeamId))}/channels/${encodeURIComponent(String(teamsChannelId))}/messages`,
        body
      });
      await updateGraphHealthOnResult({ orgId: input.orgId, ok: true });
    } catch (error: any) {
      await updateGraphHealthOnResult({ orgId: input.orgId, ok: false, errorMessage: error?.message || String(error) });
      throw error;
    }
  },

  async ensureMailSubscription(input: { orgId: string }): Promise<{ subscriptionId: string; expiresAt: string }> {
    const { metadata } = await resolveConnection(input.orgId);
    if (isCircuitOpen(metadata)) throw getCircuitOpenError(metadata);
    const senderEmail = await getOrgNotificationSenderEmail(input.orgId);
    const { accessToken, mode } = await resolveGraphAuthContext({ orgId: input.orgId });
    if (mode === 'app_only' && !senderEmail) {
      throw new HttpError(400, 'Notification sender mailbox must be configured for app-only mail subscription.');
    }
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
    const lowerWebhookUrl = webhookUrl.toLowerCase();
    const isHttps = lowerWebhookUrl.startsWith('https://');
    const isLocalHostWebhook =
      lowerWebhookUrl.includes('://localhost') ||
      lowerWebhookUrl.includes('://127.0.0.1') ||
      lowerWebhookUrl.includes('://0.0.0.0');
    if (!isHttps || isLocalHostWebhook) {
      throw new HttpError(
        400,
        `Microsoft webhook subscriptions require a public HTTPS URL. Current webhook URL is "${webhookUrl}". Use an HTTPS tunnel/domain for APP_BASE_URL and retry.`
      );
    }
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
          resource:
            mode === 'app_only'
              ? `/users/${encodeURIComponent(String(senderEmail))}/mailFolders('inbox')/messages`
              : "/me/mailFolders('inbox')/messages",
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
    await updateGraphHealthOnResult({ orgId: input.orgId, ok: true });

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

  async syncAllMailDelta(): Promise<{ scanned: number; synced: number; failed: number; processed: number }> {
    const connections = await prisma.organizationOAuthConnection.findMany({
      where: { provider: OAuthProvider.microsoft },
      select: { orgId: true }
    });
    let synced = 0;
    let failed = 0;
    let processed = 0;
    for (const connection of connections) {
      try {
        const result = await this.syncMailDelta({ orgId: connection.orgId });
        synced += 1;
        processed += result.processed;
      } catch {
        failed += 1;
      }
    }
    return { scanned: connections.length, synced, failed, processed };
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
    const valid: string[] = [];
    const mismatchedByOrg = new Map<string, number>();
    candidates.forEach((item) => {
      if (expectedByOrgId.get(item.orgId) === item.clientState) {
        valid.push(item.orgId);
      } else {
        mismatchedByOrg.set(item.orgId, (mismatchedByOrg.get(item.orgId) || 0) + 1);
      }
    });
    for (const [orgId, count] of mismatchedByOrg.entries()) {
      const row = rows.find((r) => r.orgId === orgId);
      if (!row) continue;
      const metadata = parseConnectionMetadata(row.metadata);
      const lastTs = toIso(metadata.lastWebhookClientStateMismatchAt);
      const nextCount =
        Number.isFinite(lastTs) && Date.now() - lastTs <= 24 * 60 * 60 * 1000
          ? Math.max(0, Number(metadata.webhookClientStateMismatchCount24h || 0)) + count
          : count;
      await updateConnectionMetadata({
        orgId,
        metadataPatch: {
          webhookClientStateMismatchCount24h: nextCount,
          lastWebhookClientStateMismatchAt: new Date().toISOString()
        }
      });
    }
    return valid;
  },

  async syncMailDelta(input: { orgId: string }): Promise<{ processed: number; deltaLink?: string }> {
    const { metadata } = await resolveConnection(input.orgId);
    if (isCircuitOpen(metadata)) throw getCircuitOpenError(metadata);
    const senderEmail = await getOrgNotificationSenderEmail(input.orgId);
    const { accessToken, mode } = await resolveGraphAuthContext({ orgId: input.orgId });
    if (mode === 'app_only' && !senderEmail) {
      throw new HttpError(400, 'Notification sender mailbox must be configured for app-only delta sync.');
    }
    let nextUrl =
      metadata.mailDeltaLink ||
      (mode === 'app_only'
        ? `${GRAPH_BASE_URL}/users/${encodeURIComponent(String(senderEmail))}/mailFolders/inbox/messages/delta?$select=id,subject,conversationId,internetMessageId,internetMessageHeaders,from,receivedDateTime,bodyPreview,body,uniqueBody`
        : `${GRAPH_BASE_URL}/me/mailFolders/inbox/messages/delta?$select=id,subject,conversationId,internetMessageId,internetMessageHeaders,from,receivedDateTime,bodyPreview,body,uniqueBody`);
    if (mode === 'app_only' && /\/me\//i.test(nextUrl)) {
      nextUrl = `${GRAPH_BASE_URL}/users/${encodeURIComponent(String(senderEmail))}/mailFolders/inbox/messages/delta?$select=id,subject,conversationId,internetMessageId,internetMessageHeaders,from,receivedDateTime,bodyPreview,body,uniqueBody`;
    }

    let processed = 0;
    let duplicateDrops = 0;
    let lastDuplicateDropAt: string | undefined;
    let latestDeltaLink: string | undefined;

    try {
    while (nextUrl) {
      const payload = await withGraphRetry(async () => {
        const response = await fetch(nextUrl, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Prefer: 'outlook.body-content-type="text"'
          }
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
        if (seen) {
          duplicateDrops += 1;
          lastDuplicateDropAt = new Date().toISOString();
          continue;
        }
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

        const ticket = isTicketCode(ticketId)
          ? await ticketsStore.findByCode(input.orgId, ticketId)
          : await ticketsStore.get(input.orgId, ticketId);
        if (!ticket) continue;

        const senderAddress = String(row?.from?.emailAddress?.address || '').trim().toLowerCase();
        const senderName = String(row?.from?.emailAddress?.name || senderAddress || 'Email user');
        const commentText = extractCommentTextFromMessage(row);
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
        lastMailDeltaSyncAt: new Date().toISOString(),
        ...(duplicateDrops > 0
          ? {
              inboundDuplicateDropCount24h:
                rolling24hCount(
                  metadata.inboundDuplicateDropCount24h,
                  metadata.lastInboundDuplicateDropAt
                ) + duplicateDrops,
              lastInboundDuplicateDropAt: lastDuplicateDropAt || new Date().toISOString()
            }
          : {})
      }
    });
    await updateGraphHealthOnResult({ orgId: input.orgId, ok: true });
    } catch (error: any) {
      await updateGraphHealthOnResult({ orgId: input.orgId, ok: false, errorMessage: error?.message || String(error) });
      throw error;
    }

    return { processed, deltaLink: latestDeltaLink };
  },

};
