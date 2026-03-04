import { updateConnectionMetadata } from './tickets.graph.connection.js';
import { senderMailboxPreflight } from './tickets.graph.preflight.js';
import {
  sendTicketEmail,
  sendTicketTeamsCard,
  sendWorkspaceEmail,
  sendWorkspaceTeamsCard
} from './tickets.graph.delivery.js';
import {
  ensureMailSubscription,
  extractValidatedOrgIdsFromWebhookNotifications,
  renewExpiringMailSubscriptions
} from './tickets.graph.subscriptions.js';
import { syncAllMailDelta, syncMailDelta } from './tickets.graph.delta.js';

export const ticketsGraphService = {
  senderMailboxPreflight,
  sendTicketEmail,
  sendWorkspaceEmail,
  sendTicketTeamsCard,
  sendWorkspaceTeamsCard,
  ensureMailSubscription,
  renewExpiringMailSubscriptions,
  extractValidatedOrgIdsFromWebhookNotifications,
  syncMailDelta,
  syncAllMailDelta,
  async recordWebhookHit(input: { orgId: string }): Promise<void> {
    await updateConnectionMetadata({
      orgId: input.orgId,
      metadataPatch: { lastMailWebhookAt: new Date().toISOString() }
    });
  }
};
