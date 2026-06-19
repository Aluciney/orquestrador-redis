import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { api } from './client';
import type { RedisServerInput } from './types';

type Query = Record<string, string | number | boolean | undefined>;

type ListOpts = { enabled?: boolean };

/* ----------------------------- Redis ----------------------------- */
export const useRedisList = (params?: Query, opts?: ListOpts) =>
  useQuery({
    queryKey: ['redis', params],
    queryFn: () => api.listRedis(params),
    enabled: opts?.enabled ?? true,
  });

export function useRedisMutations() {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['redis'] });
    qc.invalidateQueries({ queryKey: ['dashboard'] });
  };
  return {
    create: useMutation({ mutationFn: api.createRedis, onSuccess: invalidate }),
    update: useMutation({
      mutationFn: (v: { id: number; body: RedisServerInput }) =>
        api.updateRedis(v.id, v.body),
      onSuccess: invalidate,
    }),
    remove: useMutation({ mutationFn: api.deleteRedis, onSuccess: invalidate }),
    toggle: useMutation({
      mutationFn: (v: { id: number; enabled: boolean }) =>
        api.toggleRedis(v.id, v.enabled),
      onSuccess: invalidate,
    }),
  };
}

/* ----------------------------- Tools ----------------------------- */
export const useToolsList = (params?: Query, opts?: ListOpts) =>
  useQuery({
    queryKey: ['tools', params],
    queryFn: () => api.listTools(params),
    enabled: opts?.enabled ?? true,
  });

export function useToolMutations() {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['tools'] });
    qc.invalidateQueries({ queryKey: ['dashboard'] });
  };
  return {
    create: useMutation({ mutationFn: api.createTool, onSuccess: invalidate }),
    update: useMutation({
      mutationFn: (v: { id: number; body: { name: string; description?: string | null } }) =>
        api.updateTool(v.id, v.body),
      onSuccess: invalidate,
    }),
    reorder: useMutation({ mutationFn: api.reorderTools, onSuccess: invalidate }),
    remove: useMutation({ mutationFn: api.deleteTool, onSuccess: invalidate }),
  };
}

/* ----------------------------- Groups ----------------------------- */
export const useGroupsList = (toolId?: number) =>
  useQuery({ queryKey: ['groups', toolId], queryFn: () => api.listGroups(toolId) });

export function useGroupMutations() {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['groups'] });
    qc.invalidateQueries({ queryKey: ['dashboard'] });
  };
  return {
    create: useMutation({ mutationFn: api.createGroup, onSuccess: invalidate }),
    update: useMutation({
      mutationFn: (v: { id: number; body: { tool_id: number; name: string } }) =>
        api.updateGroup(v.id, v.body),
      onSuccess: invalidate,
    }),
    remove: useMutation({ mutationFn: api.deleteGroup, onSuccess: invalidate }),
  };
}

/* ----------------------------- Queues ----------------------------- */
export const useQueuesList = (params?: Query) =>
  useQuery({ queryKey: ['queues', params], queryFn: () => api.listQueues(params) });

export function useQueueMutations() {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['queues'] });
    qc.invalidateQueries({ queryKey: ['dashboard'] });
  };
  return {
    update: useMutation({
      mutationFn: (v: { id: number; body: { group_id?: number | null; enabled?: boolean } }) =>
        api.updateQueue(v.id, v.body),
      onSuccess: invalidate,
    }),
    remove: useMutation({ mutationFn: api.deleteQueue, onSuccess: invalidate }),
  };
}

/* ----------------------------- Dashboard / Sync ----------------------------- */
export const useDashboard = () =>
  useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.dashboard(),
    refetchInterval: 8000,
  });

export function useSync() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (redisServerId?: number) => api.sync(redisServerId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['queues'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

/* ----------------------------- Usuários (admin) ----------------------------- */
export const useUsersList = (params?: Query, opts?: ListOpts) =>
  useQuery({
    queryKey: ['users', params],
    queryFn: () => api.listUsers(params),
    enabled: opts?.enabled ?? true,
  });

export function useUserMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['users'] });
  return {
    create: useMutation({ mutationFn: api.createUser, onSuccess: invalidate }),
    update: useMutation({
      mutationFn: (v: { id: number; body: { is_admin?: boolean; enabled?: boolean } }) =>
        api.updateUser(v.id, v.body),
      onSuccess: invalidate,
    }),
    remove: useMutation({ mutationFn: api.deleteUser, onSuccess: invalidate }),
    setAccess: useMutation({
      mutationFn: (v: { id: number; body: { toolIds: number[]; groupIds: number[] } }) =>
        api.setUserAccess(v.id, v.body),
      onSuccess: invalidate,
    }),
  };
}
