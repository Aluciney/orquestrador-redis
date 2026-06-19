import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useDashboard } from '../api/hooks';
import { PageHeader, Spinner, CountsRow, EmptyState } from '../components/ui';
import type { JobCounts } from '../api/types';
import { clsx } from 'clsx';
import { ChevronRight, ExternalLink } from 'lucide-react';

const TILES: { key: keyof JobCounts; label: string; color: string }[] = [
  { key: 'waiting', label: 'Aguardando', color: 'text-amber-300' },
  { key: 'active', label: 'Ativos', color: 'text-emerald-300' },
  { key: 'delayed', label: 'Agendados', color: 'text-sky-300' },
  { key: 'failed', label: 'Falhas', color: 'text-red-300' },
  { key: 'completed', label: 'Concluídos', color: 'text-slate-300' },
  { key: 'paused', label: 'Pausados', color: 'text-purple-300' },
];

export default function Dashboard() {
  const { data, isLoading } = useDashboard();
  // Grupos iniciam minimizados; clicar no cabeçalho expande/recolhe.
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const toggleGroup = (groupId: number) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(groupId) ? next.delete(groupId) : next.add(groupId);
      return next;
    });

  if (isLoading)
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  if (!data) return <EmptyState message="Sem dados." />;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle={`Agregado em tempo real · atualizado ${new Date(
          data.generatedAt
        ).toLocaleTimeString('pt-BR')}`}
      />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
        {TILES.map((t) => (
          <div key={t.key} className="card p-4">
            <p className="text-xs text-slate-500 uppercase tracking-wide">{t.label}</p>
            <p className={clsx('text-2xl font-semibold mt-1', t.color)}>
              {data.totals[t.key].toLocaleString('pt-BR')}
            </p>
          </div>
        ))}
      </div>

      <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-3">
        Por ferramenta
      </h2>

      {data.tools.length === 0 ? (
        <EmptyState message="Nenhuma ferramenta cadastrada. Crie ferramentas e classifique suas filas." />
      ) : (
        <div className="space-y-4">
          {data.tools.map((tool) => (
            <div key={tool.id} className="card overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border">
                <div>
                  <h3 className="font-semibold text-white">{tool.name}</h3>
                  {tool.description && (
                    <p className="text-xs text-slate-500">{tool.description}</p>
                  )}
                </div>
                <CountsRow counts={tool.counts as unknown as Record<string, number>} />
              </div>

              <div className="divide-y divide-surface-border">
                {tool.groups.length === 0 && (
                  <p className="px-5 py-3 text-sm text-slate-500">
                    Nenhum grupo nesta ferramenta.
                  </p>
                )}
                {tool.groups.map((group) => {
                  const isOpen = expanded.has(group.id);
                  return (
                    <div key={group.id} className="px-5 py-3">
                      <button
                        type="button"
                        onClick={() => toggleGroup(group.id)}
                        className="flex w-full items-center justify-between gap-2 text-left"
                      >
                        <span className="flex items-center gap-1 text-sm font-medium text-slate-200">
                          <ChevronRight
                            size={14}
                            className={clsx(
                              'text-slate-500 transition-transform',
                              isOpen && 'rotate-90'
                            )}
                          />
                          {group.name}
                          <span className="text-xs text-slate-600">
                            ({group.queues.length})
                          </span>
                        </span>
                        <CountsRow
                          counts={group.counts as unknown as Record<string, number>}
                        />
                      </button>
                      {isOpen && (
                        <div className="pl-5 space-y-1 mt-2">
                          {group.queues.length === 0 && (
                            <p className="text-xs text-slate-600 py-1">
                              Nenhuma fila neste grupo.
                            </p>
                          )}
                          {group.queues.map((q) => (
                            <div
                              key={q.id}
                              className="flex items-center justify-between text-sm py-1"
                            >
                              <Link
                                to={`/queues/${q.id}/board`}
                                className="flex items-center gap-2 text-slate-400 hover:text-brand-hover"
                              >
                                <span
                                  className={clsx(
                                    'h-1.5 w-1.5 rounded-full',
                                    q.online ? 'bg-emerald-400' : 'bg-red-500'
                                  )}
                                />
                                {q.queue_name}
                                <ExternalLink size={12} className="opacity-50" />
                              </Link>
                              <CountsRow
                                counts={q.counts as unknown as Record<string, number>}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {data.unclassified.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-3">
            Não classificadas ({data.unclassified.length})
          </h2>
          <div className="card divide-y divide-surface-border">
            {data.unclassified.map((q) => (
              <div
                key={q.id}
                className="flex items-center justify-between px-5 py-2.5 text-sm"
              >
                <Link
                  to={`/queues/${q.id}/board`}
                  className="flex items-center gap-2 text-slate-300 hover:text-brand-hover"
                >
                  {q.queue_name}
                  <span className="text-xs text-slate-600">
                    @ {q.redis_server_name}
                  </span>
                </Link>
                <CountsRow counts={q.counts as unknown as Record<string, number>} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
