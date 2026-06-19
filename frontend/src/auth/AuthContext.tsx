import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import type { AuthUser } from '../api/types';

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [user, setUser] = useState<AuthUser | null>(null);

  // Tenta restaurar a sessão a partir do cookie httpOnly.
  const { isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      try {
        const u = await api.me();
        setUser(u);
        return u;
      } catch {
        setUser(null);
        return null;
      }
    },
    retry: false,
    staleTime: Infinity,
  });

  const login = async (username: string, password: string) => {
    const u = await api.login(username, password);
    setUser(u);
    qc.clear(); // limpa caches anteriores (escopo muda por usuário)
  };

  const logout = async () => {
    await api.logout().catch(() => undefined);
    setUser(null);
    qc.clear();
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}
