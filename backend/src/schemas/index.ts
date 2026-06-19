import { z } from 'zod';

export const redisServerSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(120),
  host: z.string().min(1, 'Host é obrigatório').max(255),
  port: z.coerce.number().int().min(1).max(65535).default(6379),
  username: z.string().max(255).optional().nullable(),
  password: z.string().max(255).optional().nullable(),
  tls: z.coerce.boolean().default(false),
  enabled: z.coerce.boolean().default(true),
});
export type RedisServerBody = z.infer<typeof redisServerSchema>;

export const toolSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(120),
  description: z.string().max(500).optional().nullable(),
});
export type ToolBody = z.infer<typeof toolSchema>;

export const toolReorderSchema = z.object({
  ids: z.array(z.coerce.number().int().positive()).min(1),
});
export type ToolReorderBody = z.infer<typeof toolReorderSchema>;

export const groupSchema = z.object({
  tool_id: z.coerce.number().int().positive(),
  name: z.string().min(1, 'Nome é obrigatório').max(120),
});
export type GroupBody = z.infer<typeof groupSchema>;

export const queueUpdateSchema = z
  .object({
    group_id: z.coerce.number().int().positive().nullable().optional(),
    enabled: z.coerce.boolean().optional(),
  })
  .refine((d) => d.group_id !== undefined || d.enabled !== undefined, {
    message: 'Informe group_id e/ou enabled.',
  });
export type QueueUpdateBody = z.infer<typeof queueUpdateSchema>;

export const enabledSchema = z.object({ enabled: z.coerce.boolean() });

/* ----------------------------- Auth / Usuários ----------------------------- */

export const loginSchema = z.object({
  username: z.string().min(1, 'Usuário é obrigatório').max(120),
  password: z.string().min(1, 'Senha é obrigatória').max(255),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(255),
  newPassword: z.string().min(6, 'A nova senha deve ter ao menos 6 caracteres').max(255),
});

export const userCreateSchema = z.object({
  username: z.string().min(1, 'Username é obrigatório').max(120),
  is_admin: z.coerce.boolean().default(false),
});

export const userUpdateSchema = z
  .object({
    is_admin: z.coerce.boolean().optional(),
    enabled: z.coerce.boolean().optional(),
  })
  .refine((d) => d.is_admin !== undefined || d.enabled !== undefined, {
    message: 'Informe is_admin e/ou enabled.',
  });

export const accessSchema = z.object({
  toolIds: z.array(z.coerce.number().int().positive()).default([]),
  groupIds: z.array(z.coerce.number().int().positive()).default([]),
});

/* ----------------------------- AD config ----------------------------- */

export const adConfigSchema = z.object({
  url: z.string().max(255).default(''),
  base_dn: z.string().max(255).default(''),
  bind_dn: z.string().max(255).default(''),
  // Em branco/ausente => mantém a senha já salva.
  bind_password: z.string().max(255).optional(),
  search_filter: z.string().min(1).max(255).default('(sAMAccountName={{username}})'),
  tls_reject_unauthorized: z.coerce.boolean().default(true),
  enabled: z.coerce.boolean().default(false),
});

export const adTestSchema = adConfigSchema.extend({
  testUsername: z.string().max(120).optional(),
  testPassword: z.string().max(255).optional(),
});
