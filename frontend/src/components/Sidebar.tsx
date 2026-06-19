import { NavLink } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  LayoutDashboard,
  Boxes,
  Server,
  ListTree,
  Settings,
  Layers,
  Users,
  Network,
} from 'lucide-react';
import { useToolsList, useRedisList } from '../api/hooks';
import { useAuth } from '../auth/AuthContext';

const baseItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true, adminOnly: false },
  { to: '/queues', label: 'Filas', icon: ListTree, adminOnly: false },
  { to: '/tools', label: 'Ferramentas', icon: Boxes, adminOnly: true },
  { to: '/redis', label: 'Redis', icon: Server, adminOnly: true },
  { to: '/users', label: 'Usuários', icon: Users, adminOnly: true },
  { to: '/ad', label: 'Active Directory', icon: Network, adminOnly: true },
  { to: '/settings', label: 'Configurações', icon: Settings, adminOnly: false },
];

export default function Sidebar() {
  const { user } = useAuth();
  const isAdmin = !!user?.isAdmin;
  const navItems = baseItems.filter((i) => !i.adminOnly || isAdmin);

  const { data: tools } = useToolsList({ pageSize: 100 }, { enabled: isAdmin });
  const { data: redis } = useRedisList({ pageSize: 100 }, { enabled: isAdmin });

  return (
    <aside className="w-64 shrink-0 border-r border-surface-border bg-surface-card flex flex-col">
      <div className="flex items-center gap-2 px-5 h-16 border-b border-surface-border">
        <Layers className="text-brand" size={22} />
        <span className="font-semibold text-white leading-tight">
          Orquestrador
          <span className="block text-[11px] font-normal text-slate-500">
            BullMQ · multi-Redis
          </span>
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                isActive
                  ? 'bg-brand/15 text-brand-hover font-medium'
                  : 'text-slate-400 hover:bg-surface-hover hover:text-slate-200'
              )
            }
          >
            <item.icon size={18} />
            {item.label}
          </NavLink>
        ))}

        {tools && tools.data.length > 0 && (
          <div className="pt-4">
            <p className="px-3 pb-1 text-[11px] uppercase tracking-wide text-slate-600">
              Ferramentas
            </p>
            {tools.data.map((t) => (
              <NavLink
                key={t.id}
                to={`/queues?toolId=${t.id}`}
                className="block px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:bg-surface-hover hover:text-slate-200 truncate"
              >
                {t.name}
              </NavLink>
            ))}
          </div>
        )}

        {redis && redis.data.length > 0 && (
          <div className="pt-4">
            <p className="px-3 pb-1 text-[11px] uppercase tracking-wide text-slate-600">
              Redis
            </p>
            {redis.data.map((r) => (
              <NavLink
                key={r.id}
                to={`/queues?redisServerId=${r.id}`}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:bg-surface-hover hover:text-slate-200 truncate"
              >
                <span
                  className={clsx(
                    'h-2 w-2 rounded-full shrink-0',
                    r.enabled ? 'bg-emerald-400' : 'bg-slate-600'
                  )}
                />
                {r.name}
              </NavLink>
            ))}
          </div>
        )}
      </nav>
    </aside>
  );
}
