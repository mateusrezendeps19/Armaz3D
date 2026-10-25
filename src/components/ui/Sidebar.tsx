import { useEffect } from 'react';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ChevronsLeft,
  ChevronsRight,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Map as MapIcon,
  RotateCcw,
  ScrollText,
  UserCog,
  Warehouse,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useStockStore } from '../../store/useStockStore';
import { useStockStats } from '../../hooks/useStockStats';
import { useActiveTab, useCurrentUser, usePermission } from '../../hooks/useAuth';
import { ROLE_META, canOpenTab } from '../../lib/auth';
import type { AppTab } from '../../types/stock';
import { UserAvatar } from './UserAvatar';

export const TABS: Array<{ id: AppTab; label: string; description: string; icon: LucideIcon }> = [
  { id: 'dashboard', label: 'Dashboard', description: 'Visão geral do galpão', icon: LayoutDashboard },
  { id: 'inbound', label: 'Entradas', description: 'Recebimento e endereçamento', icon: ArrowDownToLine },
  { id: 'outbound', label: 'Saídas', description: 'Baixas e retirada de paletes', icon: ArrowUpFromLine },
  { id: 'audit', label: 'Registros', description: 'Movimentações por usuário e exportação', icon: ScrollText },
  { id: 'users', label: 'Usuários', description: 'Contas, perfis e acessos', icon: UserCog },
  { id: 'layout', label: 'Armazém', description: 'Ruas, estantes e níveis', icon: MapIcon },
];

/** Navegação principal, recolhível (Ctrl+B). Recolhida, mostra só os ícones. */
export function Sidebar() {
  const activeTab = useActiveTab();
  const collapsed = useStockStore((s) => s.sidebarCollapsed);
  const setActiveTab = useStockStore((s) => s.setActiveTab);
  const toggleSidebar = useStockStore((s) => s.toggleSidebar);
  const resetDemo = useStockStore((s) => s.resetDemo);
  const logout = useStockStore((s) => s.logout);
  const setPasswordDialogOpen = useStockStore((s) => s.setPasswordDialogOpen);
  const user = useCurrentUser();
  const canReset = usePermission('system:reset');
  const { alerts } = useStockStats();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggleSidebar]);

  const badges: Partial<Record<AppTab, number>> = { dashboard: alerts.length };

  return (
    <nav
      className={`pointer-events-auto flex h-full shrink-0 flex-col border-r border-slate-800 bg-slate-950/95 backdrop-blur-md transition-[width] duration-300 ease-out ${
        collapsed ? 'w-16' : 'w-56'
      }`}
    >
      <div className="flex h-16 items-center gap-3 overflow-hidden border-b border-slate-800 px-4">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-cyan-500/15 text-cyan-400">
          <Warehouse size={18} />
        </span>
        <div className={`whitespace-nowrap leading-tight transition-opacity duration-200 ${collapsed ? 'opacity-0' : 'opacity-100'}`}>
          <p className="text-sm font-bold text-slate-100">Armaz3D</p>
          <p className="text-[11px] text-slate-400">Galpão principal</p>
        </div>
      </div>

      <ul className="flex-1 space-y-1 p-2">
        {TABS.filter((t) => canOpenTab(user, t.id)).map(({ id, label, icon: Icon }) => {
          const active = id === activeTab;
          const badge = badges[id];
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => setActiveTab(id)}
                title={collapsed ? label : undefined}
                aria-current={active ? 'page' : undefined}
                className={`relative flex h-10 w-full items-center gap-3 overflow-hidden rounded-lg px-3 text-sm font-medium transition ${
                  active ? 'bg-cyan-500/15 text-cyan-300' : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-100'
                }`}
              >
                {active && <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-cyan-400" />}
                <Icon size={18} className="shrink-0" />
                <span className={`whitespace-nowrap transition-opacity duration-200 ${collapsed ? 'opacity-0' : 'opacity-100'}`}>
                  {label}
                </span>
                {!!badge && (
                  <span
                    className={`grid h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white ${
                      collapsed ? 'absolute right-1.5 top-1' : 'ml-auto'
                    }`}
                  >
                    {badge}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="space-y-1 border-t border-slate-800 p-2">
        {user && (
          <div className="flex h-11 items-center gap-3 overflow-hidden px-1.5" title={collapsed ? `${user.name} · ${ROLE_META[user.role].label}` : undefined}>
            <UserAvatar user={user} size="h-8 w-8" />
            <div className={`min-w-0 leading-tight transition-opacity duration-200 ${collapsed ? 'opacity-0' : 'opacity-100'}`}>
              <p className="truncate text-xs font-semibold text-slate-100">{user.name}</p>
              <p className="truncate text-[11px]" style={{ color: ROLE_META[user.role].color }}>
                {ROLE_META[user.role].label}
              </p>
            </div>
          </div>
        )}
        <SidebarAction icon={KeyRound} label="Alterar senha" collapsed={collapsed} onClick={() => setPasswordDialogOpen(true)} />
        <SidebarAction icon={LogOut} label="Sair" collapsed={collapsed} onClick={logout} />
      </div>

      <div className="space-y-1 border-t border-slate-800 p-2">
        {canReset && (
          <SidebarAction
            icon={RotateCcw}
            label="Restaurar demonstração"
            collapsed={collapsed}
            onClick={resetDemo}
          />
        )}
        <SidebarAction
          icon={collapsed ? ChevronsRight : ChevronsLeft}
          label="Recolher menu"
          hint="Ctrl+B"
          collapsed={collapsed}
          onClick={toggleSidebar}
        />
      </div>
    </nav>
  );
}

interface SidebarActionProps {
  icon: LucideIcon;
  label: string;
  hint?: string;
  collapsed: boolean;
  onClick: () => void;
}

function SidebarAction({ icon: Icon, label, hint, collapsed, onClick }: SidebarActionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={collapsed ? [label, hint].filter(Boolean).join(' · ') : hint}
      className="flex h-9 w-full items-center gap-3 overflow-hidden rounded-lg px-3 text-xs text-slate-400 transition hover:bg-slate-800/80 hover:text-slate-100"
    >
      <Icon size={16} className="shrink-0" />
      <span className={`whitespace-nowrap transition-opacity duration-200 ${collapsed ? 'opacity-0' : 'opacity-100'}`}>
        {label}
      </span>
    </button>
  );
}
