import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useDashboard } from '../api/hooks';
import { PageHeader, Spinner, CountsRow, CountsBar, EmptyState } from '../components/ui';
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
  // Ferramentas e grupos iniciam minimizados; clicar no cabeçalho expande/recolhe.
  const [expandedTools, setExpandedTools] = useState<Set<number>>(new Set());
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const toggleIn = (setter: typeof setExpanded) => (id: number) =>
    setter((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  const toggleTool = toggleIn(setExpandedTools);
  const toggleGroup = toggleIn(setExpanded);

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
          {data.tools.map((tool) => {
            const isToolOpen = expandedTools.has(tool.id);
            return (
              <div key={tool.id} className="card overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleTool(tool.id)}
                  className={clsx(
                    'flex w-full items-center justify-between gap-4 px-5 py-4 text-left',
                    isToolOpen && 'border-b border-surface-border'
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <ChevronRight
                      size={16}
                      className={clsx(
                        'shrink-0 text-slate-500 transition-transform',
                        isToolOpen && 'rotate-90'
                      )}
                    />
                    <div className="min-w-0">
                      <h3 className="font-semibold text-white truncate">
                        {tool.name}
                        <span className="ml-2 text-xs font-normal text-slate-600">
                          ({tool.groups.length} grupo{tool.groups.length === 1 ? '' : 's'})
                        </span>
                      </h3>
                      {tool.description && (
                        <p className="text-xs text-slate-500 truncate">{tool.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <CountsRow counts={tool.counts as unknown as Record<string, number>} />
                    <CountsBar counts={tool.counts as unknown as Record<string, number>} />
                  </div>
                </button>

                {isToolOpen && (
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
                            className="flex w-full items-center justify-between gap-4 text-left"
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
                            <div className="flex flex-col gap-1 shrink-0">
                              <CountsRow
                                counts={group.counts as unknown as Record<string, number>}
                              />
                              <CountsBar
                                counts={group.counts as unknown as Record<string, number>}
                              />
                            </div>
                          </button>
                          {isOpen && (
                            <div className="pl-5 space-y-2 mt-2">
                              {group.queues.length === 0 && (
                                <p className="text-xs text-slate-600 py-1">
                                  Nenhuma fila neste grupo.
                                </p>
                              )}
                              {group.queues.map((q) => (
                                <div
                                  key={q.id}
                                  className="flex items-center justify-between gap-4 text-sm"
                                >
                                  <Link
                                    to={`/queues/${q.id}/board`}
                                    className="flex items-center gap-2 text-slate-400 hover:text-brand-hover min-w-0"
                                  >
                                    <span
                                      className={clsx(
                                        'h-1.5 w-1.5 rounded-full shrink-0',
                                        q.online ? 'bg-emerald-400' : 'bg-red-500'
                                      )}
                                    />
                                    <span className="truncate">{q.queue_name}</span>
                                    <ExternalLink size={12} className="opacity-50 shrink-0" />
                                  </Link>
                                  <div className="flex flex-col gap-1 shrink-0">
                                    <CountsRow
                                      counts={q.counts as unknown as Record<string, number>}
                                    />
                                    <CountsBar
                                      counts={q.counts as unknown as Record<string, number>}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
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
                className="flex items-center justify-between gap-4 px-5 py-2.5 text-sm"
              >
                <Link
                  to={`/queues/${q.id}/board`}
                  className="flex items-center gap-2 text-slate-300 hover:text-brand-hover min-w-0"
                >
                  <span className="truncate">{q.queue_name}</span>
                  <span className="text-xs text-slate-600 shrink-0">
                    @ {q.redis_server_name}
                  </span>
                </Link>
                <div className="flex flex-col gap-1 shrink-0">
                  <CountsRow counts={q.counts as unknown as Record<string, number>} />
                  <CountsBar counts={q.counts as unknown as Record<string, number>} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
