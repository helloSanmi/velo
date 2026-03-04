import { UserRole } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';

export const parseMemberIds = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];

export const parseStageDefs = (value: unknown): { id: string; name: string }[] =>
  Array.isArray(value)
    ? value
        .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
        .map((item) => ({
          id: typeof item.id === 'string' ? item.id.trim() : '',
          name: typeof item.name === 'string' ? item.name.trim() : ''
        }))
        .filter((stage) => stage.id.length > 0 && stage.name.length > 0)
    : [];

export const parseOwnerIdsFromMetadata = (metadata: unknown, fallbackOwnerId?: string): string[] => {
  const ownerIds =
    metadata && typeof metadata === 'object' && Array.isArray((metadata as Record<string, unknown>).ownerIds)
      ? ((metadata as Record<string, unknown>).ownerIds as unknown[]).filter(
          (value): value is string => typeof value === 'string'
        )
      : [];
  return Array.from(new Set([...(fallbackOwnerId ? [fallbackOwnerId] : []), ...ownerIds]));
};

export const resolveProjectCompletionRecipients = async (input: {
  orgId: string;
  ownerIds: string[];
}): Promise<Array<{ userId: string; email: string; displayName: string }>> => {
  const users = await prisma.user.findMany({
    where: {
      orgId: input.orgId,
      OR: [{ licenseActive: true }, { id: { in: input.ownerIds } }, { role: UserRole.admin }]
    },
    select: { id: true, email: true, displayName: true, role: true }
  });

  const ids = new Set([
    ...input.ownerIds,
    ...users.filter((row) => row.role === UserRole.admin).map((row) => row.id)
  ]);

  return users
    .filter((row) => ids.has(row.id) && row.email)
    .map((row) => ({ userId: row.id, email: row.email, displayName: row.displayName }));
};
