import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { Boxes, Flame, LayoutGrid, RotateCcw, Warehouse } from 'lucide-react';
import { useStockStore } from '../../store/useStockStore';
import { STATUS_META, getStatus } from '../../lib/warehouseLayout';
import type { StockStatus, ViewMode } from '../../types/stock';

const VIEW_OPTIONS: Array<{ mode: ViewMode; label: string; icon: typeof Flame }> = [
  { mode: 'status', label: 'Status', icon: LayoutGrid },
  { mode: 'heatmap', label: 'Heatmap', icon: Flame },
];

export function TopBar() {
  const items = useStockStore((s) => s.items);
  const racks = useStockStore((s) => s.racks);
  const viewMode = useStockStore((s) => s.viewMode);
  const setViewMode = useStockStore((s) => s.setViewMode);
  const resetDemo = useStockStore((s) => s.resetDemo);

  const stats = useMemo(() => {
    const active = items.filter((i) => i.phase !== 'leaving');
    const byStatus: Record<StockStatus, number> = { ok: 0, low: 0, critical: 0 };
    active.forEach((i) => byStatus[getStatus(i)]++);
    const totalSlots = racks.reduce((sum, r) => sum + r.levels * r.slotsPerLevel, 0);
    return { count: active.length, totalSlots, byStatus };
  }, [items, racks]);

  const occupancyPct = stats.totalSlots ? Math.round((stats.count / stats.totalSlots) * 100) : 0;

  return (
    <div className="pointer-events-auto flex items-center gap-4 rounded-xl border border-slate-700/60 bg-slate-900/80 px-4 py-2.5 shadow-2xl shadow-black/40 backdrop-blur-md">
      <div className="flex items-center gap-2 pr-2">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-cyan-500/15 text-cyan-400">
          <Warehouse size={18} />
        </span>
        <div className="leading-tight">
          <h1 className="text-sm font-bold text-slate-100">Estoque 3D</h1>
          <p className="text-[11px] text-slate-400">Galpão principal</p>
        </div>
      </div>

      <div className="h-8 w-px bg-slate-700" />

      <Stat icon={<Boxes size={14} />} label="Nichos ocupados" value={`${stats.count}/${stats.totalSlots}`} hint={`${occupancyPct}%`} />
      {(Object.keys(STATUS_META) as StockStatus[]).map((status) => (
        <Stat
          key={status}
          icon={<span className="h-2.5 w-2.5 rounded-full" style={{ background: STATUS_META[status].color }} />}
          label={STATUS_META[status].label}
          value={String(stats.byStatus[status])}
        />
      ))}

      <div className="ml-auto flex items-center gap-2">
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
        <button
          type="button"
          onClick={resetDemo}
          title="Restaurar dados de demonstração"
          className="grid h-8 w-8 place-items-center rounded-lg border border-slate-700 text-slate-400 transition hover:bg-slate-800 hover:text-slate-100"
        >
          <RotateCcw size={15} />
        </button>
      </div>
    </div>
  );
}

function Stat({ icon, label, value, hint }: { icon: ReactNode; label: string; value: string; hint?: string }) {
  return (
    <div className="leading-tight">
      <p className="flex items-center gap-1.5 text-[11px] text-slate-400">
        {icon}
        {label}
      </p>
      <p className="text-sm font-semibold text-slate-100">
        {value}
        {hint && <span className="ml-1 text-xs font-normal text-slate-400">{hint}</span>}
      </p>
    </div>
  );
}
