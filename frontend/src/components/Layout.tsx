import type { ReactNode } from 'react';
import { RefreshCw, LogOut } from 'lucide-react';
import Sidebar from './Sidebar';
import { useSync } from '../api/hooks';
import { useAuth } from '../auth/AuthContext';
import { Spinner } from './ui';

export default function Layout({ children }: { children: ReactNode }) {
  const sync = useSync();
  const { user, logout } = useAuth();
  const isAdmin = !!user?.isAdmin;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 shrink-0 border-b border-surface-border bg-surface-card/60 backdrop-blur flex items-center justify-between px-6">
          <div className="text-sm text-slate-400">
            Gerenciamento de filas BullMQ distribuídas
          </div>
          <div className="flex items-center gap-3">
            {isAdmin && sync.isSuccess && (
              <span className="text-xs text-slate-500">
                {sync.data.totalDiscovered} filas · {sync.data.totalCreated} novas
              </span>
            )}
            {isAdmin && (
              <button
                className="btn-primary"
                onClick={() => sync.mutate(undefined)}
                disabled={sync.isPending}
              >
                {sync.isPending ? <Spinner /> : <RefreshCw size={16} />}
                Sincronizar
              </button>
            )}
            <div className="flex items-center gap-2 pl-2 border-l border-surface-border">
              <span className="text-sm text-slate-300">
                {user?.username}
                {isAdmin && (
                  <span className="ml-1 badge bg-brand/20 text-brand-hover">admin</span>
                )}
              </span>
              <button className="btn-ghost !p-2" title="Sair" onClick={() => logout()}>
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
