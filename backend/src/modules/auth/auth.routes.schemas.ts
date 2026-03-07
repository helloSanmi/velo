import { z } from 'zod';

export const loginSchema = z.object({
  identifier: z.string().min(1),
  password: z.string().min(1),
  workspaceDomain: z.string().optional()
});

export const registerSchema = z.object({
  identifier: z.string().min(1),
  password: z.string().min(1),
  orgName: z.string().min(1),
  plan: z.enum(['free', 'basic', 'pro']).default('basic'),
  totalSeats: z.coerce.number().int().min(1).optional()
});

export const acceptInviteSchema = z.object({
  token: z.string().min(1),
  identifier: z.string().min(1).optional(),
  password: z.string().min(1)
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1)
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(6),
    confirmPassword: z.string().min(6)
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: 'New password and confirmation must match.',
    path: ['confirmPassword']
  });

export const resetPasswordSchema = z
  .object({
    identifier: z.string().min(1),
    workspaceDomain: z.string().optional(),
    currentPassword: z.string().min(1),
    newPassword: z.string().min(6),
    confirmPassword: z.string().min(6)
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: 'New password and confirmation must match.',
    path: ['confirmPassword']
  });
