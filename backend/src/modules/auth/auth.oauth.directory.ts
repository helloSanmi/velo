import { UserRole } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { HttpError } from '../../lib/httpError.js';
import { ensureProviderAccessToken } from './auth.oauth.connection.js';
import type { Provider } from './auth.oauth.types.js';

export const fetchDirectoryUsersByAccessToken = async (input: {
  provider: Provider;
  accessToken: string;
}): Promise<Array<{ externalId: string; email: string; displayName: string; firstName?: string; lastName?: string; avatar?: string }>> => {
  let nextUrl: string | null =
    'https://graph.microsoft.com/v1.0/users?$select=id,displayName,givenName,surname,mail,userPrincipalName,accountEnabled,proxyAddresses&$top=200';
  const rows: Array<any> = [];
  while (nextUrl) {
    const response = await fetch(nextUrl, {
      headers: { Authorization: `Bearer ${input.accessToken}` }
    });
    if (!response.ok) {
      throw new HttpError(400, 'Could not load Microsoft directory users. Ensure admin consent includes User.ReadBasic.All.');
    }
    const data = (await response.json()) as { value?: Array<any>; ['@odata.nextLink']?: string };
    rows.push(...(data.value || []));
    nextUrl = data['@odata.nextLink'] || null;
  }

  const normalizedRows = rows
    .map((row) => {
      const proxyAddresses = Array.isArray(row.proxyAddresses) ? row.proxyAddresses : [];
      const smtpFromProxy = proxyAddresses
        .map((value: unknown) => String(value))
        .find((value: string) => /^SMTP:/i.test(value))
        ?.replace(/^SMTP:/i, '');
      const email = String(row.mail || smtpFromProxy || row.userPrincipalName || '').trim().toLowerCase();
      return {
        externalId: String(row.id || ''),
        email,
        displayName: String(row.displayName || email || 'Unknown User'),
        firstName: row.givenName ? String(row.givenName) : undefined,
        lastName: row.surname ? String(row.surname) : undefined
      };
    })
    .filter((row) => row.externalId && row.email);

  const attachAvatar = async (row: (typeof normalizedRows)[number]) => {
    try {
      const response = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(row.externalId)}/photo/$value`, {
        headers: { Authorization: `Bearer ${input.accessToken}` }
      });
      if (!response.ok) return row;
      const bytes = await response.arrayBuffer();
      if (!bytes || bytes.byteLength === 0) return row;
      const contentType = response.headers.get('content-type') || 'image/jpeg';
      const base64 = Buffer.from(bytes).toString('base64');
      return {
        ...row,
        avatar: `data:${contentType};base64,${base64}`
      };
    } catch {
      return row;
    }
  };

  const concurrency = Math.min(8, Math.max(1, normalizedRows.length));
  const enrichedRows: typeof normalizedRows = [...normalizedRows];
  let cursor = 0;
  await Promise.all(
    Array.from({ length: concurrency }).map(async () => {
      while (cursor < normalizedRows.length) {
        const index = cursor++;
        enrichedRows[index] = await attachAvatar(normalizedRows[index]);
      }
    })
  );
  return enrichedRows;
};

export const listDirectoryUsers = async (input: {
  provider: Provider;
  actor: { userId: string; orgId: string; role: UserRole };
}) => {
  if (input.actor.role !== 'admin') {
    throw new HttpError(403, 'Only workspace admins can list directory users.');
  }
  const org = await prisma.organization.findUnique({
    where: { id: input.actor.orgId },
    select: {
      id: true,
      microsoftWorkspaceConnected: true
    }
  });
  if (!org) throw new HttpError(404, 'Organization not found.');
  if (!org.microsoftWorkspaceConnected) {
    throw new HttpError(400, 'Microsoft is not connected for this workspace.');
  }

  const accessToken = await ensureProviderAccessToken({
    orgId: input.actor.orgId,
    provider: input.provider
  });
  const users = await fetchDirectoryUsersByAccessToken({
    provider: input.provider,
    accessToken
  });
  return {
    provider: input.provider,
    users
  };
};
