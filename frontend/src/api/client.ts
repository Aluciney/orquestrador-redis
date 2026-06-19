import axios from 'axios';
import type {
  DashboardStats,
  Group,
  Paginated,
  Queue,
  QueueStats,
  RedisServer,
  RedisServerInput,
  SyncResult,
  TestResult,
  Tool,
} from './types';

export const http = axios.create({ baseURL: '/api' });

// Normaliza mensagens de erro vindas do backend.
http.interceptors.response.use(
  (r) => r,
  (error) => {
    const msg =
      error?.response?.data?.error ?? error?.message ?? 'Erro de rede';
    return Promise.reject(new Error(msg));
  }
);

type Query = Record<string, string | number | boolean | undefined>;

const qs = (params?: Query) => {
  if (!params) return '';
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
};

export const api = {
  // Redis
  listRedis: (p?: Query) =>
    http.get<Paginated<RedisServer>>(`/redis${qs(p)}`).then((r) => r.data),
  createRedis: (b: RedisServerInput) =>
    http.post<RedisServer>('/redis', b).then((r) => r.data),
  updateRedis: (id: number, b: RedisServerInput) =>
    http.put<RedisServer>(`/redis/${id}`, b).then((r) => r.data),
  deleteRedis: (id: number) => http.delete(`/redis/${id}`).then(() => undefined),
  toggleRedis: (id: number, enabled: boolean) =>
    http.patch<RedisServer>(`/redis/${id}/enabled`, { enabled }).then((r) => r.data),
  testRedis: (id: number) =>
    http.post<TestResult>(`/redis/${id}/test`).then((r) => r.data),
  testRedisRaw: (b: RedisServerInput) =>
    http.post<TestResult>('/redis/test', b).then((r) => r.data),

  // Tools
  listTools: (p?: Query) =>
    http.get<Paginated<Tool>>(`/tools${qs(p)}`).then((r) => r.data),
  createTool: (b: { name: string; description?: string | null }) =>
    http.post<Tool>('/tools', b).then((r) => r.data),
  updateTool: (id: number, b: { name: string; description?: string | null }) =>
    http.put<Tool>(`/tools/${id}`, b).then((r) => r.data),
  reorderTools: (ids: number[]) =>
    http.put<Tool[]>('/tools/reorder', { ids }).then((r) => r.data),
  deleteTool: (id: number) => http.delete(`/tools/${id}`).then(() => undefined),

  // Groups
  listGroups: (toolId?: number) =>
    http.get<Group[]>(`/groups${qs({ toolId })}`).then((r) => r.data),
  createGroup: (b: { tool_id: number; name: string }) =>
    http.post<Group>('/groups', b).then((r) => r.data),
  updateGroup: (id: number, b: { tool_id: number; name: string }) =>
    http.put<Group>(`/groups/${id}`, b).then((r) => r.data),
  deleteGroup: (id: number) => http.delete(`/groups/${id}`).then(() => undefined),

  // Queues
  listQueues: (p?: Query) =>
    http.get<Paginated<Queue>>(`/queues${qs(p)}`).then((r) => r.data),
  getQueue: (id: number) => http.get<Queue>(`/queues/${id}`).then((r) => r.data),
  queueStats: (id: number) =>
    http.get<QueueStats>(`/queues/${id}/stats`).then((r) => r.data),
  updateQueue: (id: number, b: { group_id?: number | null; enabled?: boolean }) =>
    http.put<Queue>(`/queues/${id}`, b).then((r) => r.data),
  deleteQueue: (id: number) => http.delete(`/queues/${id}`).then(() => undefined),

  // Sync + stats
  sync: (redisServerId?: number) =>
    http.post<SyncResult>('/sync', { redisServerId }).then((r) => r.data),
  dashboard: (force?: boolean) =>
    http.get<DashboardStats>(`/stats/dashboard${qs({ force })}`).then((r) => r.data),
};

export const BULL_BOARD_BASE = '/admin/queues';
