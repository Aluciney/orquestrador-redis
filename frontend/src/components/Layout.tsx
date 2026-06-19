import type { ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';
import Sidebar from './Sidebar';
import { useSync } from '../api/hooks';
import { Spinner } from './ui';

export default function Layout({ children }: { children: ReactNode }) {
  const sync = useSync();

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 shrink-0 border-b border-surface-border bg-surface-card/60 backdrop-blur flex items-center justify-between px-6">
          <div className="text-sm text-slate-400">
            Gerenciamento de filas BullMQ distribuídas
          </div>
          <div className="flex items-center gap-3">
            {sync.isSuccess && (
              <span className="text-xs text-slate-500">
                {sync.data.totalDiscovered} filas · {sync.data.totalCreated} novas
              </span>
            )}
            <button
              className="btn-primary"
              onClick={() => sync.mutate(undefined)}
              disabled={sync.isPending}
            >
              {sync.isPending ? <Spinner /> : <RefreshCw size={16} />}
              Sincronizar
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
