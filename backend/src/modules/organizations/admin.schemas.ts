import { UserRole } from '@prisma/client';
import { z } from 'zod';

export const orgParamsSchema = z.object({ orgId: z.string().min(1) });

export const addSeatsSchema = z.object({
  seatsToAdd: z.coerce.number().int().min(1).max(100000)
});

export const provisionUserSchema = z.object({
  username: z.string().min(1),
  role: z.nativeEnum(UserRole).default(UserRole.member),
  displayName: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email(),
  password: z.string().min(6),
  mustChangePassword: z.boolean().default(true)
});

export const updateUserSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email().optional(),
  displayName: z.string().optional(),
  avatar: z.string().optional()
});

export const updateLicenseSchema = z.object({
  licenseActive: z.boolean()
});

export const importUsersSchema = z.object({
  provider: z.enum(['microsoft']),
  users: z
    .array(
      z.object({
        externalId: z.string().min(1).optional(),
        email: z.string().email(),
        displayName: z.string().min(1),
        firstName: z.string().optional(),
        lastName: z.string().optional()
      })
    )
    .min(1)
    .max(500)
});

export type ProvisionUserInput = z.infer<typeof provisionUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ImportUsersInput = z.infer<typeof importUsersSchema>;

