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
