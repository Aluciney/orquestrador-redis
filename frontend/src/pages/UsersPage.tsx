import { useEffect, useState } from 'react';
import { clsx } from 'clsx';
import { UserPlus, Trash2, ShieldCheck, Power, KeySquare } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import {
  useUsersList,
  useUserMutations,
  useToolsList,
  useGroupsList,
} from '../api/hooks';
import { api } from '../api/client';
import { PageHeader, Modal, Spinner, EmptyState } from '../components/ui';
import type { User } from '../api/types';

function AccessEditor({ user, onClose }: { user: User; onClose: () => void }) {
  const { data: tools } = useToolsList({ pageSize: 100 });
  const { data: groups } = useGroupsList(); // todos os grupos
  const m = useUserMutations();

  const { data: access, isLoading } = useQuery({
    queryKey: ['user-access', user.id],
    queryFn: () => api.getUserAccess(user.id),
  });

  const [toolIds, setToolIds] = useState<Set<number>>(new Set());
  const [groupIds, setGroupIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (access) {
      setToolIds(new Set(access.toolIds));
      setGroupIds(new Set(access.groupIds));
    }
  }, [access]);

  const toggle = (set: Set<number>, id: number, setter: (s: Set<number>) => void) => {
    const next = new Set(set);
    next.has(id) ? next.delete(id) : next.add(id);
    setter(next);
  };

  const save = async () => {
    await m.setAccess.mutateAsync({
      id: user.id,
      body: { toolIds: [...toolIds], groupIds: [...groupIds] },
    });
    onClose();
  };

  return (
    <Modal
      open
      title={`Acesso · ${user.username}`}
      onClose={onClose}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn-primary" onClick={save} disabled={m.setAccess.isPending}>
            Salvar
          </button>
        </>
      }
    >
      {isLoading ? (
        <Spinner />
      ) : (
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            Marque <b>ferramentas inteiras</b> (todos os grupos) e/ou{' '}
            <b>grupos específicos</b>. Filas não classificadas nunca são visíveis a
            usuários comuns.
          </p>

          <div>
            <p className="label">Ferramentas (todos os grupos)</p>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {(tools?.data ?? []).map((t) => (
                <label
                  key={t.id}
                  className="flex items-center gap-2 text-sm text-slate-200 bg-surface rounded-lg px-3 py-1.5"
                >
                  <input
                    type="checkbox"
                    checked={toolIds.has(t.id)}
                    onChange={() => toggle(toolIds, t.id, setToolIds)}
                  />
                  {t.name}
                </label>
              ))}
            </div>
          </div>

          <div>
            <p className="label">Grupos específicos</p>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {(groups ?? []).map((g) => {
                const toolName = tools?.data.find((t) => t.id === g.tool_id)?.name;
                const coveredByTool = toolIds.has(g.tool_id);
                return (
                  <label
                    key={g.id}
                    className={clsx(
                      'flex items-center gap-2 text-sm bg-surface rounded-lg px-3 py-1.5',
                      coveredByTool ? 'text-slate-500' : 'text-slate-200'
                    )}
                  >
                    <input
                      type="checkbox"
                      disabled={coveredByTool}
                      checked={coveredByTool || groupIds.has(g.id)}
                      onChange={() => toggle(groupIds, g.id, setGroupIds)}
                    />
                    {toolName ? `${toolName} / ` : ''}
                    {g.name}
                    {coveredByTool && (
                      <span className="text-xs text-slate-600">(via ferramenta)</span>
                    )}
                  </label>
                );
              })}
              {(groups ?? []).length === 0 && (
                <p className="text-xs text-slate-500">Nenhum grupo cadastrado.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

export default function UsersPage() {
  const [search, setSearch] = useState('');
  const { data, isLoading } = useUsersList({ search, pageSize: 100 });
  const m = useUserMutations();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ username: '', is_admin: false });
  const [accessFor, setAccessFor] = useState<User | null>(null);

  const create = async () => {
    await m.create.mutateAsync({ username: form.username.trim(), is_admin: form.is_admin });
    setForm({ username: '', is_admin: false });
    setOpen(false);
  };

  return (
    <div>
      <PageHeader
        title="Usuários"
        subtitle="Usuários comuns logam via AD; o admin local troca a senha em Configurações"
        actions={
          <button className="btn-primary" onClick={() => setOpen(true)}>
            <UserPlus size={16} /> Novo usuário
          </button>
        }
      />

      <input
        className="input max-w-xs mb-4"
        placeholder="Buscar usuário..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Spinner />
        </div>
      ) : !data || data.data.length === 0 ? (
        <EmptyState message="Nenhum usuário." />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="text-left text-slate-500 border-b border-surface-border">
              <tr>
                <th className="px-4 py-3 font-medium">Usuário</th>
                <th className="px-4 py-3 font-medium">Autenticação</th>
                <th className="px-4 py-3 font-medium">Perfil</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {data.data.map((u) => (
                <tr key={u.id} className="hover:bg-surface-hover/50">
                  <td className="px-4 py-3 font-medium text-slate-200">
                    {u.username}
                    {u.isBootstrapAdmin && (
                      <span className="ml-2 text-xs text-slate-600">(inicial)</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="badge bg-slate-700 text-slate-300">
                      {u.auth_type === 'local' ? 'Local (senha)' : 'AD'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      className={clsx(
                        'badge inline-flex items-center gap-1',
                        u.is_admin
                          ? 'bg-brand/20 text-brand-hover'
                          : 'bg-slate-600/30 text-slate-400'
                      )}
                      title="Alternar administrador"
                      disabled={u.isBootstrapAdmin}
                      onClick={() => m.update.mutate({ id: u.id, body: { is_admin: !u.is_admin } })}
                    >
                      <ShieldCheck size={12} />
                      {u.is_admin ? 'Administrador' : 'Comum'}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={clsx(
                        'badge',
                        u.enabled
                          ? 'bg-emerald-500/15 text-emerald-300'
                          : 'bg-slate-600/30 text-slate-400'
                      )}
                    >
                      {u.enabled ? 'habilitado' : 'desabilitado'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {!u.is_admin && (
                        <button
                          className="btn-ghost !p-2"
                          title="Definir acesso a filas"
                          onClick={() => setAccessFor(u)}
                        >
                          <KeySquare size={15} />
                        </button>
                      )}
                      <button
                        className="btn-ghost !p-2"
                        title={u.enabled ? 'Desabilitar' : 'Habilitar'}
                        disabled={u.isBootstrapAdmin}
                        onClick={() =>
                          m.update.mutate({ id: u.id, body: { enabled: !u.enabled } })
                        }
                      >
                        <Power size={15} />
                      </button>
                      <button
                        className="btn-danger !p-2"
                        title="Remover"
                        disabled={u.isBootstrapAdmin}
                        onClick={() => {
                          if (confirm(`Remover o usuário "${u.username}"?`))
                            m.remove.mutate(u.id);
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
        title="Novo usuário"
        onClose={() => setOpen(false)}
        footer={
          <>
            <button className="btn-ghost" onClick={() => setOpen(false)}>
              Cancelar
            </button>
            <button
              className="btn-primary"
              onClick={create}
              disabled={!form.username.trim() || m.create.isPending}
            >
              Criar
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-xs text-slate-500">
            O usuário autenticará via <b>AD</b> com este username. Não há senha local.
          </p>
          <div>
            <label className="label">Username (login de rede / sAMAccountName)</label>
            <input
              className="input"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder="jsilva"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={form.is_admin}
              onChange={(e) => setForm({ ...form, is_admin: e.target.checked })}
            />
            Conceder permissão de administrador
          </label>
        </div>
      </Modal>

      {accessFor && <AccessEditor user={accessFor} onClose={() => setAccessFor(null)} />}
    </div>
  );
}
