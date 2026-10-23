import type { ReactNode } from 'react';
import { AlertTriangle, Boxes, Gauge, Package } from 'lucide-react';
import { useStockStore } from '../../../store/useStockStore';
import { useStockStats } from '../../../hooks/useStockStats';
import { STATUS_META, getOccupancy, getStatus } from '../../../lib/warehouseLayout';
import type { StockStatus } from '../../../types/stock';
import { InventoryList } from '../InventoryList';
import { Panel } from '../Panel';

const numberFormat = new Intl.NumberFormat('pt-BR');

export function DashboardTab() {
  const stats = useStockStats();
  const selectItem = useStockStore((s) => s.selectItem);
  const statuses = Object.keys(STATUS_META) as StockStatus[];
  const activeCount = stats.activeItems.length;

  return (
    <>
      <Panel title="Visão geral" icon={<Gauge size={16} className="text-cyan-400" />}>
        <div className="grid grid-cols-2 gap-2">
          <Kpi icon={<Package size={14} />} label="Paletes" value={numberFormat.format(activeCount)} />
          <Kpi icon={<Boxes size={14} />} label="Unidades" value={numberFormat.format(stats.totalUnits)} />
          <Kpi
            icon={<Gauge size={14} />}
            label="Ocupação"
            value={`${stats.occupancyPct}%`}
            hint={`${stats.occupiedSlots}/${stats.totalSlots} nichos`}
          />
          <Kpi
            icon={<AlertTriangle size={14} />}
            label="Alertas"
            value={String(stats.alerts.length)}
            tone={stats.alerts.length ? 'text-red-400' : undefined}
          />
        </div>

        <div className="mt-4">
          <div className="flex h-2.5 overflow-hidden rounded-full bg-slate-800">
            {statuses.map((s) => (
              <div
                key={s}
                className="h-full transition-all duration-500"
                style={{
                  width: activeCount ? `${(stats.byStatus[s] / activeCount) * 100}%` : 0,
                  background: STATUS_META[s].color,
                }}
              />
            ))}
          </div>
          <div className="mt-2 flex justify-between text-[11px] text-slate-400">
            {statuses.map((s) => (
              <span key={s} className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ background: STATUS_META[s].color }} />
                {STATUS_META[s].label}: <b className="text-slate-200">{stats.byStatus[s]}</b>
              </span>
            ))}
          </div>
        </div>
      </Panel>

      <Panel
        title="Alertas de reposição"
        icon={<AlertTriangle size={16} className="text-yellow-400" />}
        className="[&>div]:max-h-44 [&>div]:overflow-y-auto"
      >
        {stats.alerts.length === 0 ? (
          <p className="py-2 text-center text-xs text-slate-500">Nenhum item abaixo do mínimo.</p>
        ) : (
          <ul className="-mx-1 space-y-0.5">
            {stats.alerts.map((item) => {
              const meta = STATUS_META[getStatus(item)];
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => selectItem(item.id)}
                    className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition hover:bg-slate-800"
                  >
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: meta.color }} />
                    <span className="min-w-0 flex-1 truncate text-xs text-slate-100">{item.name}</span>
                    <span className="text-[11px] tabular-nums text-slate-400">
                      {item.quantity}/{item.minQuantity} mín.
                    </span>
                    <span className="w-9 text-right text-[11px] font-semibold tabular-nums" style={{ color: meta.color }}>
                      {Math.round(getOccupancy(item) * 100)}%
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <InventoryList />
    </>
  );
}

function Kpi({ icon, label, value, hint, tone }: { icon: ReactNode; label: string; value: string; hint?: string; tone?: string }) {
  return (
    <div className="rounded-lg bg-slate-950/60 px-3 py-2 ring-1 ring-slate-800">
      <p className="flex items-center gap-1.5 text-[11px] text-slate-400">
        {icon}
        {label}
      </p>
      <p className={`text-lg font-semibold tabular-nums ${tone ?? 'text-slate-100'}`}>{value}</p>
      {hint && <p className="text-[10px] text-slate-500">{hint}</p>}
    </div>
  );
}
