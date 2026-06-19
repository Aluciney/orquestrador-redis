export interface Paginated<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface RedisServer {
  id: number;
  name: string;
  host: string;
  port: number;
  username: string | null;
  tls: boolean;
  enabled: boolean;
  hasPassword: boolean;
  created_at: string;
}

export interface RedisServerInput {
  name: string;
  host: string;
  port: number;
  username?: string | null;
  password?: string | null;
  tls: boolean;
  enabled: boolean;
}

export interface TestResult {
  ok: boolean;
  latencyMs?: number;
  version?: string;
  error?: string;
}

export interface Tool {
  id: number;
  name: string;
  description: string | null;
  sort_order: number;
  created_at: string;
  groupCount?: number;
}

export interface Group {
  id: number;
  tool_id: number;
  name: string;
  created_at: string;
}

export interface Queue {
  id: number;
  redis_server_id: number;
  group_id: number | null;
  queue_name: string;
  enabled: boolean | number;
  created_at: string;
  redis_server_name: string;
  group_name: string | null;
  tool_id: number | null;
  tool_name: string | null;
}

export interface JobCounts {
  waiting: number;
  active: number;
  delayed: number;
  completed: number;
  failed: number;
  paused: number;
}

export interface QueueStats extends Queue {
  counts: JobCounts;
  online: boolean;
}

export interface GroupStats {
  id: number;
  name: string;
  toolId: number;
  counts: JobCounts;
  queues: QueueStats[];
}

export interface ToolStats {
  id: number;
  name: string;
  description: string | null;
  counts: JobCounts;
  groups: GroupStats[];
}

export interface DashboardStats {
  totals: JobCounts;
  tools: ToolStats[];
  unclassified: QueueStats[];
  generatedAt: string;
}

export interface SyncResult {
  servers: {
    serverId: number;
    serverName: string;
    ok: boolean;
    discovered: number;
    created: number;
    error?: string;
  }[];
  totalDiscovered: number;
  totalCreated: number;
}
