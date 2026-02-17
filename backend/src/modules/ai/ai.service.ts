import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { AiProvider } from '@prisma/client';
import { env } from '../../config/env.js';
import { HttpError } from '../../lib/httpError.js';
import { usageService } from '../usage/usage.service.js';
import { prisma } from '../../lib/prisma.js';
import { createId } from '../../lib/ids.js';
import { writeAudit } from '../audit/audit.service.js';
import { normalizeWorkspacePlan } from '../../lib/planLimits.js';

const openaiClient = env.OPENAI_API_KEY ? new OpenAI({ apiKey: env.OPENAI_API_KEY }) : null;
const geminiClient = env.GEMINI_API_KEY ? new GoogleGenerativeAI(env.GEMINI_API_KEY) : null;

const estimateTokens = (text: string): number => Math.ceil(text.length / 4);

interface GenerateInput {
  orgId: string;
  userId: string;
  feature: string;
  prompt: string;
}

interface GenerateOutput {
  content: string;
  provider: AiProvider;
  model: string;
  warning: { shouldWarn: boolean; inGrace: boolean };
}

const runOpenAI = async (prompt: string): Promise<{ text: string; model: string; usageTokens?: number }> => {
  if (!openaiClient) throw new Error('OpenAI key missing');

  const resp = await openaiClient.responses.create({
    model: env.OPENAI_MODEL,
    input: prompt
  });

  const text = resp.output_text?.trim();
  if (!text) throw new Error('OpenAI returned empty response');

  return {
    text,
    model: env.OPENAI_MODEL,
    usageTokens: resp.usage?.total_tokens
  };
};

const runGemini = async (prompt: string): Promise<{ text: string; model: string; usageTokens?: number }> => {
  if (!geminiClient) throw new Error('Gemini key missing');

  const model = geminiClient.getGenerativeModel({ model: env.GEMINI_MODEL });
  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();
  if (!text) throw new Error('Gemini returned empty response');

  return {
    text,
    model: env.GEMINI_MODEL
  };
};

export const aiService = {
  async generate(input: GenerateInput): Promise<GenerateOutput> {
    if (!input.prompt.trim()) throw new HttpError(400, 'Prompt is required.');
    const org = await prisma.organization.findUnique({
      where: { id: input.orgId },
      select: { plan: true }
    });
    if (!org) throw new HttpError(404, 'Organization not found.');
    if (normalizeWorkspacePlan(org.plan) !== 'pro') {
      throw new HttpError(403, 'AI features are available on the Pro plan.');
    }

    const reserved = await usageService.reserveOrThrow({
      orgId: input.orgId,
      estimatedTokens: estimateTokens(input.prompt)
    });

    let provider: AiProvider = AiProvider.openai;
    let model = env.OPENAI_MODEL;
    let responseText = '';
    let totalTokens = 0;
    let wasFallback = false;

    try {
      const primary = await runOpenAI(input.prompt);
      provider = AiProvider.openai;
      model = primary.model;
      responseText = primary.text;
      totalTokens = primary.usageTokens || estimateTokens(input.prompt + responseText);
    } catch (primaryError) {
      try {
        const fallback = await runGemini(input.prompt);
        provider = AiProvider.gemini;
        model = fallback.model;
        responseText = fallback.text;
        totalTokens = fallback.usageTokens || estimateTokens(input.prompt + responseText);
        wasFallback = true;
      } catch (fallbackError) {
        throw new HttpError(503, 'AI provider unavailable.', {
          primaryError: String(primaryError),
          fallbackError: String(fallbackError)
        });
      }
    }

    await prisma.$transaction([
      prisma.aiInteraction.create({
        data: {
          id: createId('aii'),
          orgId: input.orgId,
          userId: input.userId,
          provider,
          feature: input.feature,
          model,
          prompt: input.prompt,
          response: responseText,
          inputTokens: estimateTokens(input.prompt),
          outputTokens: Math.max(1, totalTokens - estimateTokens(input.prompt)),
          totalTokens,
          wasFallback
        }
      }),
      prisma.aiUsageDaily.update({
        where: { orgId_dayKey: { orgId: input.orgId, dayKey: new Date().toISOString().slice(0, 10) } },
        data: { tokensUsed: { increment: Math.max(0, totalTokens - estimateTokens(input.prompt)) } }
      })
    ]);

    await writeAudit({
      orgId: input.orgId,
      userId: input.userId,
      actionType: 'ai_request',
      action: `AI ${input.feature} generated via ${provider}`,
      entityType: 'ai_interaction',
      metadata: {
        provider,
        model,
        totalTokens,
        wasFallback,
        warning: reserved.shouldWarn,
        inGrace: reserved.inGrace
      }
    });

    return {
      content: responseText,
      provider,
      model,
      warning: {
        shouldWarn: reserved.shouldWarn,
        inGrace: reserved.inGrace
      }
    };
  }
};
