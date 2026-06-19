import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw, HeartPulse, KeyRound } from 'lucide-react';
import { http, BULL_BOARD_BASE, api } from '../api/client';
import { useSync, useRedisList } from '../api/hooks';
import { useAuth } from '../auth/AuthContext';
import { PageHeader, Spinner } from '../components/ui';
import { clsx } from 'clsx';

interface Health {
  status: string;
  db: boolean;
  uptime: number;
  timestamp: string;
}

function ChangePasswordCard() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setMsg(null);
    if (next !== confirm) {
      setMsg({ ok: false, text: 'A confirmação não confere.' });
      return;
    }
    setSaving(true);
    try {
      await api.changePassword(current, next);
      setMsg({ ok: true, text: 'Senha alterada com sucesso.' });
      setCurrent('');
      setNext('');
      setConfirm('');
    } catch (err) {
      setMsg({ ok: false, text: (err as Error).message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-3">
        <KeyRound size={18} className="text-brand" />
        <h3 className="font-semibold text-white">Trocar minha senha</h3>
      </div>
      <div className="space-y-3 max-w-sm">
        <div>
          <label className="label">Senha atual</label>
          <input
            className="input"
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Nova senha (mín. 6 caracteres)</label>
          <input
            className="input"
            type="password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Confirmar nova senha</label>
          <input
            className="input"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </div>
        {msg && (
          <div
            className={clsx(
              'text-sm rounded-lg px-3 py-2',
              msg.ok ? 'bg-emerald-500/10 text-emerald-300' : 'bg-red-500/10 text-red-300'
            )}
          >
            {msg.text}
          </div>
        )}
        <button
          className="btn-primary"
          onClick={submit}
          disabled={saving || !current || !next}
        >
          {saving ? <Spinner /> : <KeyRound size={16} />} Alterar senha
        </button>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { user } = useAuth();
  const isAdmin = !!user?.isAdmin;
  const isLocal = user?.authType === 'local';

  const sync = useSync();
  const { data: redis } = useRedisList({ pageSize: 100 }, { enabled: isAdmin });
  const [target, setTarget] = useState<string>('');

  const health = useQuery({
    queryKey: ['health'],
    queryFn: () => http.get<Health>('/health').then((r) => r.data),
    refetchInterval: 10000,
  });

  return (
    <div>
      <PageHeader title="Configurações" subtitle="Conta, sincronização e saúde" />

      <div className="grid gap-4 md:grid-cols-2">
        {/* Trocar senha: apenas usuários com autenticação local (ex.: admin) */}
        {isLocal && <ChangePasswordCard />}

        {isAdmin && (
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-3">
              <RefreshCw size={18} className="text-brand" />
              <h3 className="font-semibold text-white">Sincronização</h3>
            </div>
            <p className="text-sm text-slate-400 mb-3">
              Descobre filas (<code>bull:*:id</code>) nos Redis habilitados e registra as
              novas.
            </p>
            <div className="flex gap-2">
              <select
                className="input max-w-[220px]"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
              >
                <option value="">Todos os Redis habilitados</option>
                {(redis?.data ?? []).map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
              <button
                className="btn-primary"
                disabled={sync.isPending}
                onClick={() => sync.mutate(target ? Number(target) : undefined)}
              >
                {sync.isPending ? <Spinner /> : <RefreshCw size={16} />} Sincronizar
              </button>
            </div>
            {sync.isSuccess && (
              <div className="mt-4 space-y-1 text-sm">
                <p className="text-slate-300">
                  {sync.data.totalDiscovered} filas encontradas · {sync.data.totalCreated}{' '}
                  novas
                </p>
                {sync.data.servers.map((s) => (
                  <p
                    key={s.serverId}
                    className={clsx(s.ok ? 'text-slate-400' : 'text-red-400')}
                  >
                    {s.serverName}: {s.ok ? `${s.discovered} filas` : s.error}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="card p-5">
          <div className="flex items-center gap-2 mb-3">
            <HeartPulse size={18} className="text-emerald-400" />
            <h3 className="font-semibold text-white">Saúde do sistema</h3>
          </div>
          {health.data ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Status</span>
                <span
                  className={clsx(
                    'badge',
                    health.data.status === 'ok'
                      ? 'bg-emerald-500/15 text-emerald-300'
                      : 'bg-red-500/15 text-red-300'
                  )}
                >
                  {health.data.status}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Banco (SQLite)</span>
                <span className="text-slate-300">{health.data.db ? 'OK' : 'falha'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Uptime</span>
                <span className="text-slate-300">
                  {Math.floor(health.data.uptime / 60)} min
                </span>
              </div>
            </div>
          ) : (
            <Spinner />
          )}
        </div>

        {isAdmin && (
          <div className="card p-5 md:col-span-2">
            <h3 className="font-semibold text-white mb-2">Bull Board</h3>
            <p className="text-sm text-slate-400">
              O Bull Board é servido pelo backend em{' '}
              <code className="text-brand-hover">{BULL_BOARD_BASE}</code> e embutido dentro
              de cada fila. Para abrir uma visão consolidada de todas as filas habilitadas,
              acesse{' '}
              <a
                className="text-brand-hover underline"
                href={BULL_BOARD_BASE}
                target="_blank"
                rel="noreferrer"
              >
                {BULL_BOARD_BASE}
              </a>
              .
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
