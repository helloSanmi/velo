import { OAuthProvider } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { graphRequest, isAccessDeniedError } from './tickets.graph.request.js';
import { parseConnectionMetadata, getOrgNotificationSenderEmail, resolveConnection } from './tickets.graph.connection.js';
import { resolveGraphAuthContext } from './tickets.graph.auth.js';
import { isCircuitOpen } from './tickets.graph.health.js';
import { sendWorkspaceEmail } from './tickets.graph.delivery.js';

export const senderMailboxPreflight = async (input: {
  orgId: string;
  testRecipientEmail?: string;
}): Promise<{ ok: boolean; senderEmail?: string; checks: Array<{ key: string; ok: boolean; message: string }> }> => {
  const checks: Array<{ key: string; ok: boolean; message: string }> = [];
  try {
    const { metadata, connection } = await resolveConnection(input.orgId);
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
    return { ok: false, checks: [{ key: 'workspace_connection', ok: false, message: error?.message || 'Microsoft workspace is not connected.' }] };
  }

  const senderEmail = await getOrgNotificationSenderEmail(input.orgId);
  if (!senderEmail) {
    checks.push({ key: 'sender_mailbox', ok: false, message: 'Notification sender mailbox is not set in workspace settings.' });
    return { ok: false, checks };
  }
  checks.push({ key: 'sender_mailbox', ok: true, message: `Sender mailbox is configured as ${senderEmail}.` });

  let accessToken: string;
  let authMode: 'app_only' | 'delegated' = 'delegated';
  let authTenantId: string | undefined;
  try {
    const auth = await resolveGraphAuthContext({ orgId: input.orgId });
    accessToken = auth.accessToken;
    authMode = auth.mode;
    authTenantId = auth.tenantId;
    checks.push({
      key: 'oauth_token',
      ok: true,
      message: auth.mode === 'app_only'
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
      checks.push({ key: 'token_refresh_last_result', ok: true, message: `Last token refresh succeeded${lastRefreshAt ? ` at ${lastRefreshAt}` : ''}.` });
    } else if (lastRefreshStatus === 'temporary_failure') {
      checks.push({ key: 'token_refresh_last_result', ok: false, message: `Last token refresh failed temporarily${lastRefreshAt ? ` at ${lastRefreshAt}` : ''}${lastRefreshError ? `: ${lastRefreshError}` : ''}` });
    } else if (lastRefreshStatus === 'reconsent_required') {
      checks.push({ key: 'token_refresh_last_result', ok: false, message: `Last token refresh requires re-consent${lastRefreshAt ? ` (${lastRefreshAt})` : ''}${lastRefreshError ? `: ${lastRefreshError}` : ''}` });
    } else {
      checks.push({ key: 'token_refresh_last_result', ok: true, message: 'No token refresh history yet.' });
    }
  } catch {
    checks.push({ key: 'token_refresh_last_result', ok: true, message: 'No token refresh history yet.' });
  }

  try {
    let principal = 'unknown principal';
    if (authMode === 'app_only') {
      principal = `App-only Graph context${authTenantId ? ` (tenant: ${authTenantId})` : ''}`;
    } else {
      const me = await graphRequest<{ id?: string; displayName?: string; userPrincipalName?: string; mail?: string; }>({
        accessToken,
        method: 'GET',
        url: '/me?$select=id,displayName,userPrincipalName,mail'
      });
      principal = me.mail || me.userPrincipalName || me.displayName || me.id || 'unknown principal';
    }
    checks.push({ key: 'connected_principal', ok: true, message: `Connected principal: ${principal}` });
  } catch (error: any) {
    checks.push({ key: 'connected_principal', ok: false, message: error?.message || 'Could not resolve connected principal from Microsoft Graph.' });
  }

  if (authMode === 'delegated') {
    try {
      await graphRequest({ accessToken, method: 'GET', url: `/users/${encodeURIComponent(senderEmail)}?$select=id,displayName,mail,userPrincipalName` });
      checks.push({ key: 'mailbox_lookup', ok: true, message: 'Shared mailbox exists in tenant directory.' });
    } catch (error: any) {
      checks.push({ key: 'mailbox_lookup', ok: false, message: error?.message || 'Could not read sender mailbox from Microsoft Graph.' });
      return { ok: false, senderEmail, checks };
    }
  } else {
    checks.push({ key: 'mailbox_lookup', ok: true, message: 'Mailbox directory lookup skipped in app-only mode.' });
  }

  try {
    await graphRequest({ accessToken, method: 'GET', url: `/users/${encodeURIComponent(senderEmail)}/mailFolders/inbox?$top=1` });
    checks.push({ key: 'mailbox_read_access', ok: true, message: 'Mailbox read access is available (Mail.Read + mailbox permissions).' });
  } catch (error: any) {
    const message = authMode === 'app_only' && isAccessDeniedError(error)
      ? 'Mailbox read access denied for app-only mode. Grant Microsoft Graph Application permission Mail.Read (admin consent) and ensure your Exchange Application Access Policy includes this sender mailbox.'
      : error?.message || 'Mailbox read access failed.';
    checks.push({ key: 'mailbox_read_access', ok: false, message });
  }

  if (input.testRecipientEmail) {
    try {
      await sendWorkspaceEmail({
        orgId: input.orgId,
        to: [input.testRecipientEmail.trim().toLowerCase()],
        subject: `Velo sender preflight test (${senderEmail})`,
        htmlBody: '<div style="font-family:Segoe UI,Inter,sans-serif"><h3>Velo preflight test</h3><p>This is a sender mailbox connectivity test.</p></div>',
        threadKey: `preflight-${Date.now()}`
      });
      checks.push({ key: 'send_mail_test', ok: true, message: `Test email sent to ${input.testRecipientEmail.trim().toLowerCase()}.` });
    } catch (error: any) {
      checks.push({ key: 'send_mail_test', ok: false, message: error?.message || 'Test send failed.' });
    }
  }

  return { ok: checks.every((row) => row.ok), senderEmail, checks };
};
