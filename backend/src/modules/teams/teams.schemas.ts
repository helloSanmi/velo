import { z } from 'zod';

export const orgParamsSchema = z.object({ orgId: z.string().min(1) });
export const teamIdSchema = z.string().min(1);

export const teamSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  leadId: z.string().optional(),
  memberIds: z.array(z.string()).default([])
});

export const teamPatchSchema = teamSchema.partial();

export const parseIds = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((row): row is string => typeof row === 'string' && row.length > 0) : [];

