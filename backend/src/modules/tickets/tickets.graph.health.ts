import { HttpError } from '../../lib/httpError.js';
import { prisma } from '../../lib/prisma.js';
import { OAuthProvider } from '@prisma/client';
import type { GraphConnectionMetadata } from './tickets.graph.types.js';
import { parseConnectionMetadata } from './tickets.graph.connection.js';

const toIso = (value?: string): number => {
  const ts = Date.parse(String(value || ''));
  return Number.isFinite(ts) ? ts : NaN;
};

export const rolling24hCount = (count: unknown, lastAt?: string): number => {
  const lastTs = toIso(lastAt);
  if (!Number.isFinite(lastTs)) return 0;
  if (Date.now() - lastTs > 24 * 60 * 60 * 1000) return 0;
  const value = Number(count || 0);
  return Number.isFinite(value) && value > 0 ? value : 0;
};

const isThrottleError = (message: string): boolean => {
  const text = String(message || '').toLowerCase();
  return text.includes('(429)') || text.includes('throttle') || text.includes('too many requests');
};

export const isCircuitOpen = (metadata: GraphConnectionMetadata): boolean => {
  const until = toIso(metadata.graphCircuitBreakerUntil);
  return Number.isFinite(until) && until > Date.now();
};

export const getCircuitOpenError = (metadata: GraphConnectionMetadata): HttpError => {
  const until = metadata.graphCircuitBreakerUntil || 'unknown';
  const reason = metadata.graphCircuitBreakerReason || 'Graph failures';
  return new HttpError(503, `Ticket notifications temporarily paused until ${until}: ${reason}`);
};

export const updateGraphHealthOnResult = async (input: { orgId: string; ok: boolean; errorMessage?: string }) => {
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
