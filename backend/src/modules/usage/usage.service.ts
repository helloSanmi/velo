import { prisma } from '../../lib/prisma.js';
import { env } from '../../config/env.js';
import { createId } from '../../lib/ids.js';
import { HttpError } from '../../lib/httpError.js';

const dayKey = (date = new Date()): string => date.toISOString().slice(0, 10);

interface ReserveInput {
  orgId: string;
  estimatedTokens: number;
}

export const usageService = {
  async reserveOrThrow(input: ReserveInput) {
    const org = await prisma.organization.findUnique({ where: { id: input.orgId } });
    if (!org) throw new HttpError(404, 'Organization not found.');

    const key = dayKey();
    const baseReqLimit = org.aiDailyRequestLimit || env.AI_DEFAULT_DAILY_REQUEST_LIMIT;
    const baseTokenLimit = org.aiDailyTokenLimit || env.AI_DEFAULT_DAILY_TOKEN_LIMIT;
    const maxReq = baseReqLimit + env.AI_GRACE_REQUESTS;
    const maxTokens = baseTokenLimit + env.AI_GRACE_TOKENS;

    const record =
      (await prisma.aiUsageDaily.findUnique({ where: { orgId_dayKey: { orgId: input.orgId, dayKey: key } } })) ||
      (await prisma.aiUsageDaily.create({
        data: {
          id: createId('ai_day'),
          orgId: input.orgId,
          dayKey: key
        }
      }));

    const nextRequests = record.requestsUsed + 1;
    const nextTokens = record.tokensUsed + Math.max(0, input.estimatedTokens);

    const blocked = nextRequests > maxReq || nextTokens > maxTokens;
    if (blocked) {
      await prisma.aiUsageDaily.update({
        where: { id: record.id },
        data: {
          blockedAt: new Date()
        }
      });
      throw new HttpError(429, 'AI quota reached for today. Try again after reset.', {
        dayKey: key,
        requestLimit: baseReqLimit,
        tokenLimit: baseTokenLimit,
        graceRequests: env.AI_GRACE_REQUESTS,
        graceTokens: env.AI_GRACE_TOKENS
      });
    }

    const warningThresholdReq = Math.ceil(baseReqLimit * 0.8);
    const warningThresholdTokens = Math.ceil(baseTokenLimit * 0.8);
    const shouldWarn = nextRequests >= warningThresholdReq || nextTokens >= warningThresholdTokens;
    const inGrace = nextRequests > baseReqLimit || nextTokens > baseTokenLimit;

    await prisma.aiUsageDaily.update({
      where: { id: record.id },
      data: {
        requestsUsed: nextRequests,
        tokensUsed: nextTokens,
        warningIssuedAt: shouldWarn ? new Date() : record.warningIssuedAt
      }
    });

    return {
      dayKey: key,
      shouldWarn,
      inGrace,
      limits: {
        requests: baseReqLimit,
        tokens: baseTokenLimit,
        graceRequests: env.AI_GRACE_REQUESTS,
        graceTokens: env.AI_GRACE_TOKENS
      },
      usage: {
        requestsUsed: nextRequests,
        tokensUsed: nextTokens
      }
    };
  },

  async getUsage(orgId: string, days = 30) {
    const rows = await prisma.aiUsageDaily.findMany({
      where: { orgId },
      orderBy: { dayKey: 'desc' },
      take: days
    });
    return rows;
  }
};
