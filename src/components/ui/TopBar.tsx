import { Flame, LayoutGrid } from 'lucide-react';
import { useStockStore } from '../../store/useStockStore';
import { useStockStats } from '../../hooks/useStockStats';
import { useActiveTab } from '../../hooks/useAuth';
import type { ViewMode } from '../../types/stock';
import { TABS } from './Sidebar';

const VIEW_OPTIONS: Array<{ mode: ViewMode; label: string; icon: typeof Flame }> = [
  { mode: 'status', label: 'Status', icon: LayoutGrid },
  { mode: 'heatmap', label: 'Heatmap', icon: Flame },
];

/** Título da aba ativa, resumo de ocupação e alternância status/heatmap da cena 3D. */
export function TopBar() {
  const activeTab = useActiveTab();
  const viewMode = useStockStore((s) => s.viewMode);
  const setViewMode = useStockStore((s) => s.setViewMode);
  const { occupiedSlots, totalSlots, occupancyPct } = useStockStats();
  const tab = TABS.find((t) => t.id === activeTab) ?? TABS[0];
  const TabIcon = tab.icon;

  return (
    <div className="pointer-events-auto flex h-16 items-center gap-4 rounded-xl border border-slate-700/60 bg-slate-900/80 px-4 shadow-2xl shadow-black/40 backdrop-blur-md">
      <TabIcon size={18} className="text-cyan-400" />
      <div className="leading-tight">
        <h1 className="text-sm font-bold text-slate-100">{tab.label}</h1>
        <p className="text-[11px] text-slate-400">{tab.description}</p>
      </div>

      <div className="ml-auto flex items-center gap-4">
        <span className="text-xs text-slate-400">
          <b className="font-semibold text-slate-100">
            {occupiedSlots}/{totalSlots}
          </b>{' '}
          nichos · {occupancyPct}%
        </span>
        <div className="flex rounded-lg border border-slate-700 bg-slate-950/60 p-0.5">
          {VIEW_OPTIONS.map(({ mode, label, icon: Icon }) => (
            <button
              key={mode}
              type="button"
              onClick={() => setViewMode(mode)}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                viewMode === mode ? 'bg-cyan-500 text-slate-950' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
