import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { clsx } from 'clsx';
import { ExternalLink, FolderTree, Power, Trash2 } from 'lucide-react';
import {
  useQueuesList,
  useQueueMutations,
  useToolsList,
  useGroupsList,
  useRedisList,
} from '../api/hooks';
import { PageHeader, Modal, Spinner, EmptyState } from '../components/ui';
import { useAuth } from '../auth/AuthContext';
import type { Queue } from '../api/types';

function ClassifyModal({
  queue,
  onClose,
}: {
  queue: Queue;
  onClose: () => void;
}) {
  const { data: tools } = useToolsList({ pageSize: 100 });
  const [toolId, setToolId] = useState<number | undefined>(queue.tool_id ?? undefined);
  const { data: groups } = useGroupsList(toolId);
  const [groupId, setGroupId] = useState<number | null>(queue.group_id);
  const m = useQueueMutations();

  return (
    <Modal
      open
      title={`Classificar · ${queue.queue_name}`}
      onClose={onClose}
      footer={
        <>
          <button
            className="btn-ghost"
            onClick={async () => {
              await m.update.mutateAsync({ id: queue.id, body: { group_id: null } });
              onClose();
            }}
          >
            Remover classificação
          </button>
          <button
            className="btn-primary"
            disabled={!groupId}
            onClick={async () => {
              await m.update.mutateAsync({ id: queue.id, body: { group_id: groupId } });
              onClose();
            }}
          >
            Salvar
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <label className="label">Ferramenta</label>
          <select
            className="input"
            value={toolId ?? ''}
            onChange={(e) => {
              setToolId(e.target.value ? Number(e.target.value) : undefined);
              setGroupId(null);
            }}
          >
            <option value="">— selecione —</option>
            {(tools?.data ?? []).map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Grupo</label>
          <select
            className="input"
            value={groupId ?? ''}
            disabled={!toolId}
            onChange={(e) => setGroupId(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">— selecione —</option>
            {(groups ?? []).map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
          {toolId && (groups ?? []).length === 0 && (
            <p className="text-xs text-amber-400 mt-1">
              Essa ferramenta não tem grupos. Crie um em "Ferramentas".
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
}

export default function QueuesPage() {
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const toolId = params.get('toolId') ?? '';
  const redisServerId = params.get('redisServerId') ?? '';

  const query = useMemo(
    () => ({
      search,
      page,
      pageSize: 20,
      toolId: toolId || undefined,
      redisServerId: redisServerId || undefined,
    }),
    [search, page, toolId, redisServerId]
  );

  const { user } = useAuth();
  const isAdmin = !!user?.isAdmin;

  const { data, isLoading } = useQueuesList(query);
  const { data: tools } = useToolsList({ pageSize: 100 }, { enabled: isAdmin });
  const { data: redis } = useRedisList({ pageSize: 100 }, { enabled: isAdmin });
  const m = useQueueMutations();
  const [classify, setClassify] = useState<Queue | null>(null);

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next);
    setPage(1);
  };

  return (
    <div>
      <PageHeader
        title="Filas"
        subtitle="Filas descobertas nos Redis cadastrados"
      />

      <div className="flex flex-wrap gap-3 mb-4">
        <input
          className="input max-w-xs"
          placeholder="Buscar fila..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        {isAdmin && (
          <>
            <select
              className="input max-w-[200px]"
              value={toolId}
              onChange={(e) => setFilter('toolId', e.target.value)}
            >
              <option value="">Todas as ferramentas</option>
              {(tools?.data ?? []).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <select
              className="input max-w-[200px]"
              value={redisServerId}
              onChange={(e) => setFilter('redisServerId', e.target.value)}
            >
              <option value="">Todos os Redis</option>
              {(redis?.data ?? []).map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Spinner />
        </div>
      ) : !data || data.data.length === 0 ? (
        <EmptyState message="Nenhuma fila encontrada. Clique em Sincronizar para descobrir filas." />
      ) : (
        <>
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="text-left text-slate-500 border-b border-surface-border">
                <tr>
                  <th className="px-4 py-3 font-medium">Fila</th>
                  <th className="px-4 py-3 font-medium">Redis</th>
                  <th className="px-4 py-3 font-medium">Ferramenta / Grupo</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {data.data.map((q) => (
                  <tr key={q.id} className="hover:bg-surface-hover/50">
                    <td className="px-4 py-3 font-medium text-slate-200">
                      {q.queue_name}
                    </td>
                    <td className="px-4 py-3 text-slate-400">{q.redis_server_name}</td>
                    <td className="px-4 py-3">
                      {q.tool_name ? (
                        <span className="text-slate-300">
                          {q.tool_name}{' '}
                          <span className="text-slate-600">/ {q.group_name}</span>
                        </span>
                      ) : (
                        <span className="badge bg-amber-500/15 text-amber-300">
                          não classificada
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={clsx(
                          'badge',
                          q.enabled
                            ? 'bg-emerald-500/15 text-emerald-300'
                            : 'bg-slate-600/30 text-slate-400'
                        )}
                      >
                        {q.enabled ? 'habilitada' : 'desabilitada'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          to={`/queues/${q.id}/board`}
                          className="btn-ghost !p-2"
                          title="Abrir Bull Board"
                        >
                          <ExternalLink size={15} />
                        </Link>
                        {isAdmin && (
                          <>
                            <button
                              className="btn-ghost !p-2"
                              title="Classificar"
                              onClick={() => setClassify(q)}
                            >
                              <FolderTree size={15} />
                            </button>
                            <button
                              className="btn-ghost !p-2"
                              title={q.enabled ? 'Desabilitar' : 'Habilitar'}
                              onClick={() =>
                                m.update.mutate({
                                  id: q.id,
                                  body: { enabled: !q.enabled },
                                })
                              }
                            >
                              <Power size={15} />
                            </button>
                            <button
                              className="btn-danger !p-2"
                              title="Remover do catálogo"
                              onClick={() => {
                                if (confirm(`Remover "${q.queue_name}" do catálogo?`))
                                  m.remove.mutate(q.id);
                              }}
                            >
                              <Trash2 size={15} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between mt-4 text-sm text-slate-400">
            <span>
              {data.total} fila(s) · página {data.page}/{data.totalPages}
            </span>
            <div className="flex gap-2">
              <button
                className="btn-ghost"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Anterior
              </button>
              <button
                className="btn-ghost"
                disabled={page >= data.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Próxima
              </button>
            </div>
          </div>
        </>
      )}

      {classify && (
        <ClassifyModal queue={classify} onClose={() => setClassify(null)} />
      )}
    </div>
  );
}
