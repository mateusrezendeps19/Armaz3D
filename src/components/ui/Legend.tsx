import { useStockStore } from '../../store/useStockStore';
import { STATUS_META, heatmapGradientCss } from '../../lib/warehouseLayout';
import type { StockStatus } from '../../types/stock';

export function Legend() {
  const viewMode = useStockStore((s) => s.viewMode);

  return (
    <div className="pointer-events-auto rounded-xl border border-slate-700/60 bg-slate-900/80 px-4 py-3 text-xs text-slate-300 shadow-2xl shadow-black/40 backdrop-blur-md">
      {viewMode === 'status' ? (
        <div className="flex items-center gap-4">
          {(Object.keys(STATUS_META) as StockStatus[]).map((s) => (
            <span key={s} className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-sm" style={{ background: STATUS_META[s].color }} />
              {STATUS_META[s].label}
            </span>
          ))}
        </div>
      ) : (
        <div className="w-64">
          <p className="mb-1.5 font-medium text-slate-200">Ocupação do nicho</p>
          <div className="h-2.5 rounded-full" style={{ background: heatmapGradientCss() }} />
          <div className="mt-1 flex justify-between text-[11px] text-slate-400">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>
      )}
      <p className="mt-2 text-[11px] text-slate-500">Arraste para orbitar · scroll para zoom · clique numa caixa para detalhes</p>
    </div>
  );
}
