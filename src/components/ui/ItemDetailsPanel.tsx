import { useState } from 'react';
import { Minus, PackageMinus, Plus, X } from 'lucide-react';
import { useStockStore } from '../../store/useStockStore';
import { usePermission } from '../../hooks/useAuth';
import { STATUS_META, formatAddress, getOccupancy, getStatus } from '../../lib/warehouseLayout';
import { Panel, inputClass } from './Panel';

/** Detalhes do item selecionado (ou pré-visualização do item sob o mouse). */
export function ItemDetailsPanel() {
  const selectedId = useStockStore((s) => s.selectedId);
  const hoveredId = useStockStore((s) => s.hoveredId);
  const item = useStockStore((s) => s.items.find((i) => i.id === (selectedId ?? hoveredId)));
  const rack = useStockStore((s) => (item ? s.racks.find((r) => r.id === item.location.rackId) : undefined));
  const adjustQuantity = useStockStore((s) => s.adjustQuantity);
  const removeItem = useStockStore((s) => s.removeItem);
  const selectItem = useStockStore((s) => s.selectItem);
  const canWrite = usePermission('stock:write');
  const [amount, setAmount] = useState('10');

  if (!item || !rack || item.phase === 'leaving') return null;

  const isPreview = item.id !== selectedId;
  const status = getStatus(item);
  const occupancy = getOccupancy(item);
  const step = Math.max(1, Math.floor(Number(amount)) || 1);

  return (
    <Panel
      title={isPreview ? 'Pré-visualização' : 'Detalhes do item'}
      actions={
        !isPreview && (
          <button
            type="button"
            onClick={() => selectItem(null)}
            className="rounded-md p-1 text-slate-400 transition hover:bg-slate-800 hover:text-slate-100"
          >
            <X size={15} />
          </button>
        )
      }
      className="w-80"
    >
      <div className="space-y-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{item.sku}</p>
          <h3 className="text-base font-semibold text-slate-50">{item.name}</h3>
          <p className="text-xs text-slate-400">{item.category}</p>
        </div>

        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
          style={{ background: `${STATUS_META[status].color}22`, color: STATUS_META[status].color }}
        >
          <span className="h-2 w-2 rounded-full" style={{ background: STATUS_META[status].color }} />
          {STATUS_META[status].label}
          {item.phase === 'entering' && <span className="text-slate-400">· em movimentação</span>}
        </span>

        <div>
          <div className="mb-1 flex items-baseline justify-between">
            <span className="text-xs text-slate-400">Quantidade</span>
            <span className="text-sm font-semibold tabular-nums text-slate-100">
              {item.quantity} <span className="font-normal text-slate-500">/ {item.capacity}</span>
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${occupancy * 100}%`, background: STATUS_META[status].color }}
            />
          </div>
          <div className="mt-1 flex justify-between text-[11px] text-slate-500">
            <span>Mínimo: {item.minQuantity}</span>
            <span>Ocupação do nicho: {Math.round(occupancy * 100)}%</span>
          </div>
        </div>

        <div className="rounded-md bg-slate-950/60 px-3 py-2 text-xs text-slate-300 ring-1 ring-slate-800">
          {formatAddress(rack, item.location)}
        </div>

        {!isPreview && canWrite && (
          <>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => adjustQuantity(item.id, -step)}
                className="grid h-8 w-10 place-items-center rounded-md border border-slate-700 text-slate-200 transition hover:bg-slate-800"
                title="Baixa (saída parcial)"
              >
                <Minus size={15} />
              </button>
              <input
                type="number"
                min={1}
                className={`${inputClass} text-center`}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <button
                type="button"
                onClick={() => adjustQuantity(item.id, step)}
                className="grid h-8 w-10 place-items-center rounded-md border border-slate-700 text-slate-200 transition hover:bg-slate-800"
                title="Reposição (entrada parcial)"
              >
                <Plus size={15} />
              </button>
            </div>

            <button
              type="button"
              onClick={() => removeItem(item.id)}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-500/50 bg-red-500/10 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-500/20"
            >
              <PackageMinus size={16} />
              Retirar do estoque
            </button>
          </>
        )}
      </div>
    </Panel>
  );
}
