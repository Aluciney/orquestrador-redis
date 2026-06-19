import { useState } from 'react';
import { clsx } from 'clsx';
import { Plus, Pencil, Trash2, Plug, Power } from 'lucide-react';
import { useRedisList, useRedisMutations } from '../api/hooks';
import { api } from '../api/client';
import { PageHeader, Modal, Spinner, EmptyState } from '../components/ui';
import type { RedisServer, RedisServerInput, TestResult } from '../api/types';

const empty: RedisServerInput = {
  name: '',
  host: '',
  port: 6379,
  username: '',
  password: '',
  tls: false,
  enabled: true,
};

export default function RedisPage() {
  const [search, setSearch] = useState('');
  const { data, isLoading } = useRedisList({ search, pageSize: 100 });
  const m = useRedisMutations();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RedisServer | null>(null);
  const [form, setForm] = useState<RedisServerInput>(empty);
  const [test, setTest] = useState<{ id: number | 'form'; result: TestResult } | null>(
    null
  );
  const [testing, setTesting] = useState(false);

  const openCreate = () => {
    setEditing(null);
    setForm(empty);
    setTest(null);
    setOpen(true);
  };

  const openEdit = (s: RedisServer) => {
    setEditing(s);
    setForm({
      name: s.name,
      host: s.host,
      port: s.port,
      username: s.username ?? '',
      password: '',
      tls: s.tls,
      enabled: s.enabled,
    });
    setTest(null);
    setOpen(true);
  };

  const save = async () => {
    if (editing) await m.update.mutateAsync({ id: editing.id, body: form });
    else await m.create.mutateAsync(form);
    setOpen(false);
  };

  const testForm = async () => {
    setTesting(true);
    try {
      const result = await api.testRedisRaw(form);
      setTest({ id: 'form', result });
    } finally {
      setTesting(false);
    }
  };

  const testExisting = async (s: RedisServer) => {
    const result = await api.testRedis(s.id);
    setTest({ id: s.id, result });
  };

  return (
    <div>
      <PageHeader
        title="Servidores Redis"
        subtitle="Cadastre os Redis onde suas filas BullMQ vivem"
        actions={
          <button className="btn-primary" onClick={openCreate}>
            <Plus size={16} /> Adicionar Redis
          </button>
        }
      />

      <input
        className="input max-w-xs mb-4"
        placeholder="Buscar por nome ou host..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Spinner />
        </div>
      ) : !data || data.data.length === 0 ? (
        <EmptyState message="Nenhum servidor Redis cadastrado." />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="text-left text-slate-500 border-b border-surface-border">
              <tr>
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">Endereço</th>
                <th className="px-4 py-3 font-medium">TLS</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {data.data.map((s) => (
                <tr key={s.id} className="hover:bg-surface-hover/50">
                  <td className="px-4 py-3 font-medium text-slate-200">{s.name}</td>
                  <td className="px-4 py-3 text-slate-400">
                    {s.host}:{s.port}
                  </td>
                  <td className="px-4 py-3">
                    <span className="badge bg-slate-700 text-slate-300">
                      {s.tls ? 'sim' : 'não'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={clsx(
                        'badge',
                        s.enabled
                          ? 'bg-emerald-500/15 text-emerald-300'
                          : 'bg-slate-600/30 text-slate-400'
                      )}
                    >
                      {s.enabled ? 'habilitado' : 'desabilitado'}
                    </span>
                    {test?.id === s.id && (
                      <span
                        className={clsx(
                          'ml-2 text-xs',
                          test.result.ok ? 'text-emerald-400' : 'text-red-400'
                        )}
                      >
                        {test.result.ok
                          ? `OK ${test.result.latencyMs}ms · v${test.result.version}`
                          : `falha: ${test.result.error}`}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        title="Testar conexão"
                        className="btn-ghost !p-2"
                        onClick={() => testExisting(s)}
                      >
                        <Plug size={15} />
                      </button>
                      <button
                        title={s.enabled ? 'Desabilitar' : 'Habilitar'}
                        className="btn-ghost !p-2"
                        onClick={() =>
                          m.toggle.mutate({ id: s.id, enabled: !s.enabled })
                        }
                      >
                        <Power size={15} />
                      </button>
                      <button
                        title="Editar"
                        className="btn-ghost !p-2"
                        onClick={() => openEdit(s)}
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        title="Remover"
                        className="btn-danger !p-2"
                        onClick={() => {
                          if (confirm(`Remover o Redis "${s.name}"?`))
                            m.remove.mutate(s.id);
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={open}
        title={editing ? 'Editar Redis' : 'Adicionar Redis'}
        onClose={() => setOpen(false)}
        footer={
          <>
            <button className="btn-ghost" onClick={testForm} disabled={testing}>
              {testing ? <Spinner /> : <Plug size={15} />} Testar
            </button>
            <button className="btn-ghost" onClick={() => setOpen(false)}>
              Cancelar
            </button>
            <button
              className="btn-primary"
              onClick={save}
              disabled={m.create.isPending || m.update.isPending}
            >
              Salvar
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="label">Nome</label>
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Produção"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="label">Host</label>
              <input
                className="input"
                value={form.host}
                onChange={(e) => setForm({ ...form, host: e.target.value })}
                placeholder="172.16.48.212"
              />
            </div>
            <div>
              <label className="label">Porta</label>
              <input
                className="input"
                type="number"
                value={form.port}
                onChange={(e) =>
                  setForm({ ...form, port: Number(e.target.value) })
                }
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Usuário (opcional)</label>
              <input
                className="input"
                value={form.username ?? ''}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
              />
            </div>
            <div>
              <label className="label">
                Senha {editing && '(deixe em branco p/ manter)'}
              </label>
              <input
                className="input"
                type="password"
                value={form.password ?? ''}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
          </div>
          <div className="flex items-center gap-6 pt-1">
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={form.tls}
                onChange={(e) => setForm({ ...form, tls: e.target.checked })}
              />
              TLS
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
              />
              Habilitado
            </label>
          </div>
          {test?.id === 'form' && (
            <div
              className={clsx(
                'text-sm rounded-lg px-3 py-2',
                test.result.ok
                  ? 'bg-emerald-500/10 text-emerald-300'
                  : 'bg-red-500/10 text-red-300'
              )}
            >
              {test.result.ok
                ? `Conexão OK · ${test.result.latencyMs}ms · Redis v${test.result.version}`
                : `Falha: ${test.result.error}`}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
