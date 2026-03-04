import { OAuthProvider } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { createId } from '../../lib/ids.js';
import { ticketsStore } from './tickets.store.js';
import { ticketsNotificationStore } from './tickets.notification.store.js';
import { isTicketCode } from './tickets.reference.js';
import { GRAPH_BASE_URL, getRetryAfterMs, withGraphRetry } from './tickets.graph.request.js';
import { extractCommentTextFromMessage, extractHeaderValue, extractTicketIdFromMessage } from './tickets.graph.parse.js';
import { getCircuitOpenError, isCircuitOpen, rolling24hCount, updateGraphHealthOnResult } from './tickets.graph.health.js';
import { parseConnectionMetadata, resolveConnection, updateConnectionMetadata } from './tickets.graph.connection.js';
import { resolveGraphAuthContext } from './tickets.graph.auth.js';

export const syncMailDelta = async (input: { orgId: string }): Promise<{ processed: number; deltaLink?: string }> => {
  const { metadata } = await resolveConnection(input.orgId);
  if (isCircuitOpen(metadata)) throw getCircuitOpenError(metadata);
  const { accessToken } = await resolveGraphAuthContext({ orgId: input.orgId });
  let nextUrl = metadata.mailDeltaLink || `${GRAPH_BASE_URL}/me/mailFolders/inbox/messages/delta?$select=id,subject,conversationId,internetMessageId,internetMessageHeaders,from,receivedDateTime,bodyPreview,body,uniqueBody`;

  let processed = 0;
  let duplicateDrops = 0;
  let lastDuplicateDropAt: string | undefined;
  let latestDeltaLink: string | undefined;

  try {
    while (nextUrl) {
      const payload = await withGraphRetry(async () => {
        const response = await fetch(nextUrl, {
          method: 'GET',
          headers: { Authorization: `Bearer ${accessToken}`, Prefer: 'outlook.body-content-type="text"' }
        });
        if (!response.ok) {
          const retryAfterMs = getRetryAfterMs(response);
          if (retryAfterMs) await new Promise((r) => setTimeout(r, retryAfterMs));
          throw new Error(`Microsoft delta query failed (${response.status}).`);
        }
        return response.json() as Promise<{ value?: Array<any>; ['@odata.nextLink']?: string; ['@odata.deltaLink']?: string }>;
      });

      for (const row of payload.value || []) {
        const messageId = String(row?.id || '').trim();
        if (!messageId) continue;
        const seen = await ticketsNotificationStore.hasSeenInboundMessage({ orgId: input.orgId, messageKey: messageId });
        if (seen) {
          duplicateDrops += 1;
          lastDuplicateDropAt = new Date().toISOString();
          continue;
        }
        await ticketsNotificationStore.markInboundMessageSeen({ orgId: input.orgId, messageKey: messageId });

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
          { id: createId('cmt'), userId: senderAddress ? `email:${senderAddress}` : 'email:unknown', userName: senderName, text: commentText, createdAt: Date.now() }
        ];
        await ticketsStore.update(input.orgId, ticket.id, { comments: nextComments, source: 'email' });
        processed += 1;
      }

      if (payload['@odata.nextLink']) nextUrl = payload['@odata.nextLink'];
      else {
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
              inboundDuplicateDropCount24h: rolling24hCount(metadata.inboundDuplicateDropCount24h, metadata.lastInboundDuplicateDropAt) + duplicateDrops,
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
};

export const syncAllMailDelta = async (): Promise<{ scanned: number; synced: number; failed: number; processed: number }> => {
  const connections = await prisma.organizationOAuthConnection.findMany({
    where: { provider: OAuthProvider.microsoft },
    select: { orgId: true }
  });
  let synced = 0;
  let failed = 0;
  let processed = 0;
  for (const connection of connections) {
    try {
      const result = await syncMailDelta({ orgId: connection.orgId });
      synced += 1;
      processed += result.processed;
    } catch {
      failed += 1;
    }
  }
  return { scanned: connections.length, synced, failed, processed };
};
