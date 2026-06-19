import { useEffect, useState } from 'react';
import { clsx } from 'clsx';
import { useQuery } from '@tanstack/react-query';
import { Network, Plug, Save } from 'lucide-react';
import { api } from '../api/client';
import { PageHeader, Spinner } from '../components/ui';
import type { AdConfigInput, AdTestResult } from '../api/types';

const EMPTY: AdConfigInput = {
  url: '',
  base_dn: '',
  bind_dn: '',
  bind_password: '',
  search_filter: '(sAMAccountName={{username}})',
  tls_reject_unauthorized: true,
  enabled: false,
};

export default function AdConfigPage() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['ad-config'],
    queryFn: () => api.getAdConfig(),
  });

  const [form, setForm] = useState<AdConfigInput>(EMPTY);
  const [hasPassword, setHasPassword] = useState(false);
  const [testUser, setTestUser] = useState('');
  const [testPass, setTestPass] = useState('');
  const [result, setResult] = useState<AdTestResult | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState<'test' | 'save' | null>(null);

  useEffect(() => {
    if (data) {
      setForm({
        url: data.url,
        base_dn: data.base_dn,
        bind_dn: data.bind_dn,
        bind_password: '', // nunca vem do servidor; em branco mantém a atual
        search_filter: data.search_filter,
        tls_reject_unauthorized: data.tls_reject_unauthorized,
        enabled: data.enabled,
      });
      setHasPassword(data.hasPassword);
    }
  }, [data]);

  const set = <K extends keyof AdConfigInput>(k: K, v: AdConfigInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const isLdaps = form.url.startsWith('ldaps://');

  const test = async () => {
    setBusy('test');
    setResult(null);
    try {
      const r = await api.testAdConfig({
        ...form,
        testUsername: testUser.trim() || undefined,
        testPassword: testPass || undefined,
      });
      setResult(r);
    } catch (err) {
      setResult({ ok: false, step: 'connect', message: (err as Error).message });
    } finally {
      setBusy(null);
    }
  };

  const save = async () => {
    setBusy('save');
    setSaved(false);
    try {
      await api.saveAdConfig(form);
      setSaved(true);
      await refetch();
    } finally {
      setBusy(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Active Directory"
        subtitle="Configuração de login via AD para usuários comuns (o admin usa senha local)"
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Configuração */}
        <div className="card p-5 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Network size={18} className="text-brand" />
            <h3 className="font-semibold text-white">Conexão</h3>
          </div>

          <div>
            <label className="label">URL (esquema + host + porta)</label>
            <input
              className="input"
              value={form.url}
              onChange={(e) => set('url', e.target.value)}
              placeholder="ldap://dc.empresa.local:389  ou  ldaps://dc.empresa.local:636"
            />
            <p className="text-xs text-slate-600 mt-1">
              Use <code>ldaps://</code> e porta 636 para conexão SSL.
            </p>
          </div>

          <div>
            <label className="label">Base DN</label>
            <input
              className="input"
              value={form.base_dn}
              onChange={(e) => set('base_dn', e.target.value)}
              placeholder="DC=empresa,DC=local"
            />
          </div>

          <div>
            <label className="label">Bind DN (conta de serviço)</label>
            <input
              className="input"
              value={form.bind_dn}
              onChange={(e) => set('bind_dn', e.target.value)}
              placeholder="CN=svc-bull,OU=Servicos,DC=empresa,DC=local"
            />
          </div>

          <div>
            <label className="label">
              Senha da conta de serviço{' '}
              {hasPassword && (
                <span className="text-slate-600">(em branco mantém a atual)</span>
              )}
            </label>
            <input
              className="input"
              type="password"
              value={form.bind_password ?? ''}
              onChange={(e) => set('bind_password', e.target.value)}
              placeholder={hasPassword ? '••••••••' : ''}
            />
          </div>

          <div>
            <label className="label">Filtro de busca</label>
            <input
              className="input"
              value={form.search_filter}
              onChange={(e) => set('search_filter', e.target.value)}
            />
            <p className="text-xs text-slate-600 mt-1">
              <code>{'{{username}}'}</code> é substituído pelo login informado.
            </p>
          </div>

          <div className="flex flex-col gap-2 pt-1">
            <label
              className={clsx(
                'flex items-center gap-2 text-sm',
                isLdaps ? 'text-slate-300' : 'text-slate-600'
              )}
            >
              <input
                type="checkbox"
                disabled={!isLdaps}
                checked={form.tls_reject_unauthorized}
                onChange={(e) => set('tls_reject_unauthorized', e.target.checked)}
              />
              Validar certificado TLS (desmarque para CA interna/self-signed)
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(e) => set('enabled', e.target.checked)}
              />
              Habilitar login via AD
            </label>
          </div>

          <div className="flex justify-end pt-2">
            <button className="btn-primary" onClick={save} disabled={busy !== null}>
              {busy === 'save' ? <Spinner /> : <Save size={16} />} Salvar
            </button>
          </div>
          {saved && (
            <p className="text-sm text-emerald-300 text-right">Configuração salva.</p>
          )}
        </div>

        {/* Teste */}
        <div className="card p-5 space-y-3 self-start">
          <div className="flex items-center gap-2 mb-1">
            <Plug size={18} className="text-brand" />
            <h3 className="font-semibold text-white">Testar</h3>
          </div>
          <p className="text-sm text-slate-400">
            Testa a conexão e o bind da conta de serviço com os valores do formulário
            (sem precisar salvar). Informe um usuário/senha para também validar um login
            real.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Usuário de teste (opcional)</label>
              <input
                className="input"
                value={testUser}
                onChange={(e) => setTestUser(e.target.value)}
                placeholder="jsilva"
              />
            </div>
            <div>
              <label className="label">Senha de teste</label>
              <input
                className="input"
                type="password"
                value={testPass}
                onChange={(e) => setTestPass(e.target.value)}
              />
            </div>
          </div>

          <button className="btn-ghost" onClick={test} disabled={busy !== null}>
            {busy === 'test' ? <Spinner /> : <Plug size={16} />} Testar conexão
          </button>

          {result && (
            <div
              className={clsx(
                'text-sm rounded-lg px-3 py-2',
                result.ok ? 'bg-emerald-500/10 text-emerald-300' : 'bg-red-500/10 text-red-300'
              )}
            >
              <p className="font-medium">{result.ok ? 'Sucesso' : 'Falha'} · {result.step}</p>
              <p>{result.message}</p>
              {result.userDn && (
                <p className="text-xs text-slate-400 mt-1 break-all">{result.userDn}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
