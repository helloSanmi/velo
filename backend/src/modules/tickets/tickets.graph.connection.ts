import { OAuthProvider } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { HttpError } from '../../lib/httpError.js';
import { createId } from '../../lib/ids.js';
import type { GraphConnectionMetadata } from './tickets.graph.types.js';

export const parseConnectionMetadata = (raw: unknown): GraphConnectionMetadata => {
  if (!raw || typeof raw !== 'object') return {};
  return raw as GraphConnectionMetadata;
};

export const updateConnectionMetadata = async (input: {
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

export const resolveConnection = async (orgId: string) => {
  const [org, connection] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: orgId },
      select: { id: true, allowMicrosoftAuth: true, microsoftWorkspaceConnected: true, microsoftTenantId: true }
    }),
    prisma.organizationOAuthConnection.findUnique({
      where: { orgId_provider: { orgId, provider: OAuthProvider.microsoft } }
    })
  ]);

  if (!org || !org.allowMicrosoftAuth || !org.microsoftWorkspaceConnected || !connection) {
    throw new HttpError(409, 'Microsoft workspace integration is not connected for this organization.');
  }

  return { org, connection, metadata: parseConnectionMetadata(connection.metadata) };
};

export const getOrgNotificationSenderEmail = async (orgId: string): Promise<string | undefined> => {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { notificationSenderEmail: true }
  });
  const senderEmail = String(org?.notificationSenderEmail || '').trim().toLowerCase();
  return senderEmail || undefined;
};

export const createWebhookClientState = (orgId: string): string =>
  `velo-ticket:${orgId}:${createId('wcs')}`;
