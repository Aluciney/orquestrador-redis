export interface RedisServerRow {
  id: number;
  name: string;
  host: string;
  port: number;
  username: string | null;
  password: string | null;
  tls: number;
  enabled: number;
  created_at: string;
}

export interface ToolRow {
  id: number;
  name: string;
  description: string | null;
  sort_order: number;
  created_at: string;
}

export interface GroupRow {
  id: number;
  tool_id: number;
  name: string;
  created_at: string;
}

export interface QueueRow {
  id: number;
  redis_server_id: number;
  group_id: number | null;
  queue_name: string;
  enabled: number;
  created_at: string;
}

export type AuthType = 'local' | 'ad';

export interface AdConfigRow {
  id: number;
  url: string;
  base_dn: string;
  bind_dn: string;
  bind_password: string;
  search_filter: string;
  tls_reject_unauthorized: number;
  enabled: number;
  updated_at: string | null;
}

export interface UserRow {
  id: number;
  username: string;
  auth_type: AuthType;
  password_hash: string | null;
  is_admin: number;
  enabled: number;
  created_at: string;
}

/** Linha de fila enriquecida com nomes de servidor/grupo/ferramenta (via JOIN). */
export interface QueueDetailRow extends QueueRow {
  redis_server_name: string;
  group_name: string | null;
  tool_id: number | null;
  tool_name: string | null;
}
