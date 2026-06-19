import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ToolsPage from './pages/ToolsPage';
import RedisPage from './pages/RedisPage';
import QueuesPage from './pages/QueuesPage';
import QueueBoardPage from './pages/QueueBoardPage';
import SettingsPage from './pages/SettingsPage';
import UsersPage from './pages/UsersPage';
import AdConfigPage from './pages/AdConfigPage';
import { useAuth } from './auth/AuthContext';
import { Spinner } from './components/ui';

export default function App() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!user) return <Login />;

  const isAdmin = user.isAdmin;

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/queues" element={<QueuesPage />} />
        <Route path="/queues/:id/board" element={<QueueBoardPage />} />
        <Route path="/settings" element={<SettingsPage />} />

        {/* Rotas exclusivas de administrador */}
        {isAdmin && <Route path="/tools" element={<ToolsPage />} />}
        {isAdmin && <Route path="/redis" element={<RedisPage />} />}
        {isAdmin && <Route path="/users" element={<UsersPage />} />}
        {isAdmin && <Route path="/ad" element={<AdConfigPage />} />}

        {/* Qualquer outra rota volta ao Dashboard */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
