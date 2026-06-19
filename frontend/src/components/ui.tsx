import { clsx } from 'clsx';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';

export function Spinner() {
  return (
    <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-600 border-t-brand" />
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">{title}</h1>
        {subtitle && <p className="text-sm text-slate-400 mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="card p-10 text-center text-slate-500 text-sm">{message}</div>
  );
}

export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="card w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-surface-border px-5 py-4">
          <h3 className="font-semibold text-white">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 border-t border-surface-border px-5 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

const COUNT_STYLES: Record<string, string> = {
  waiting: 'bg-amber-500/15 text-amber-300',
  active: 'bg-emerald-500/15 text-emerald-300',
  delayed: 'bg-sky-500/15 text-sky-300',
  completed: 'bg-slate-500/15 text-slate-300',
  failed: 'bg-red-500/15 text-red-300',
  paused: 'bg-purple-500/15 text-purple-300',
};

/** Rótulos em português para os status de jobs do BullMQ. */
export const COUNT_LABELS: Record<string, string> = {
  waiting: 'aguardando',
  active: 'ativos',
  delayed: 'agendados',
  completed: 'concluídos',
  failed: 'falhas',
  paused: 'pausados',
};

export function CountBadge({ kind, value }: { kind: string; value: number }) {
  return (
    <span className={clsx('badge', COUNT_STYLES[kind] ?? 'bg-slate-700 text-slate-300')}>
      {COUNT_LABELS[kind] ?? kind}: {value}
    </span>
  );
}

export function CountsRow({
  counts,
}: {
  counts: Record<string, number>;
}) {
  const order = ['waiting', 'active', 'delayed', 'failed', 'completed', 'paused'];
  return (
    <div className="flex flex-wrap gap-1.5">
      {order.map((k) => (
        <CountBadge key={k} kind={k} value={counts[k] ?? 0} />
      ))}
    </div>
  );
}

// Cores sólidas para os segmentos da barra (mesma semântica dos badges).
const BAR_COLORS: Record<string, string> = {
  active: 'bg-emerald-400',
  waiting: 'bg-amber-400',
  delayed: 'bg-sky-400',
  failed: 'bg-red-500',
  completed: 'bg-slate-400',
  paused: 'bg-purple-400',
};

/**
 * Barra de progresso segmentada por status (estilo Bull Board): cada segmento é
 * proporcional à contagem daquele status. Sem jobs, mostra o trilho vazio.
 */
export function CountsBar({ counts }: { counts: Record<string, number> }) {
  const order = ['active', 'waiting', 'delayed', 'failed', 'completed', 'paused'];
  const total = order.reduce((s, k) => s + (counts[k] ?? 0), 0);
  return (
    <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-surface-border">
      {total > 0 &&
        order.map((k) => {
          const v = counts[k] ?? 0;
          if (!v) return null;
          return (
            <div
              key={k}
              className={BAR_COLORS[k]}
              style={{ width: `${(v / total) * 100}%` }}
              title={`${COUNT_LABELS[k] ?? k}: ${v}`}
            />
          );
        })}
    </div>
  );
}
