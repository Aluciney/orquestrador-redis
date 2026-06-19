import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import ToolsPage from './pages/ToolsPage';
import RedisPage from './pages/RedisPage';
import QueuesPage from './pages/QueuesPage';
import QueueBoardPage from './pages/QueueBoardPage';
import SettingsPage from './pages/SettingsPage';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/tools" element={<ToolsPage />} />
        <Route path="/redis" element={<RedisPage />} />
        <Route path="/queues" element={<QueuesPage />} />
        <Route path="/queues/:id/board" element={<QueueBoardPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Dashboard />} />
      </Routes>
    </Layout>
  );
}
