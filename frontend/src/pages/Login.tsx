import { useState, type FormEvent } from 'react';
import { Layers, LogIn } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { Spinner } from '../components/ui';

export default function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(username.trim(), password);
    } catch (err) {
      setError((err as Error).message || 'Falha ao autenticar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="card w-full max-w-sm p-8">
        <div className="flex flex-col items-center mb-6">
          <Layers className="text-brand" size={36} />
          <h1 className="text-xl font-semibold text-white mt-3">Orquestrador de Filas</h1>
          <p className="text-xs text-slate-500 mt-1">Entre com suas credenciais</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">Usuário</label>
            <input
              className="input"
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin ou seu login de rede"
            />
          </div>
          <div>
            <label className="label">Senha</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <div className="text-sm rounded-lg px-3 py-2 bg-red-500/10 text-red-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn-primary w-full justify-center"
            disabled={loading || !username.trim() || !password}
          >
            {loading ? <Spinner /> : <LogIn size={16} />} Entrar
          </button>
        </form>
      </div>
    </div>
  );
}
