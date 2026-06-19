import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { api, BULL_BOARD_BASE } from '../api/client';
import { Spinner, CountsRow, EmptyState } from '../components/ui';

export default function QueueBoardPage() {
  const { id } = useParams();
  const queueId = Number(id);

  const { data: queue, isLoading } = useQuery({
    queryKey: ['queue', queueId],
    queryFn: () => api.getQueue(queueId),
  });

  const { data: stats } = useQuery({
    queryKey: ['queue-stats', queueId],
    queryFn: () => api.queueStats(queueId),
    refetchInterval: 5000,
  });

  if (isLoading)
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  if (!queue) return <EmptyState message="Fila não encontrada." />;

  // Bull Board filtrado apenas nesta fila (evita colisão de nomes entre Redis).
  const boardUrl = `${BULL_BOARD_BASE}?queues=${queue.id}`;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Link to="/queues" className="btn-ghost !p-2">
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-xl font-semibold text-white">{queue.queue_name}</h1>
            <p className="text-xs text-slate-500">
              {queue.redis_server_name}
              {queue.tool_name && ` · ${queue.tool_name} / ${queue.group_name}`}
            </p>
          </div>
        </div>
        {stats && (
          <CountsRow counts={stats.counts as unknown as Record<string, number>} />
        )}
      </div>

      <div className="card flex-1 overflow-hidden">
        <iframe
          title="Bull Board"
          src={boardUrl}
          className="w-full h-full border-0 rounded-xl bg-white"
        />
      </div>
    </div>
  );
}
