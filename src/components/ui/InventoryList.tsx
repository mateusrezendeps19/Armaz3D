import { useMemo, useState } from 'react';
import { ListChecks, Search } from 'lucide-react';
import { useStockStore } from '../../store/useStockStore';
import { STATUS_META, addressCode, getStatus } from '../../lib/warehouseLayout';
import { Panel, inputClass } from './Panel';

/** Lista do inventário; hover/click sincronizam com o destaque na cena 3D. */
export function InventoryList() {
  const items = useStockStore((s) => s.items);
  const racks = useStockStore((s) => s.racks);
  const selectedId = useStockStore((s) => s.selectedId);
  const hoveredId = useStockStore((s) => s.hoveredId);
  const selectItem = useStockStore((s) => s.selectItem);
  const hoverItem = useStockStore((s) => s.hoverItem);
  const [query, setQuery] = useState('');

  const rows = useMemo(() => {
    const rackById = new Map(racks.map((r) => [r.id, r]));
    const q = query.trim().toLowerCase();
    return items
      .filter((i) => i.phase !== 'leaving')
      .map((item) => {
        const rack = rackById.get(item.location.rackId);
        return { item, code: rack ? addressCode(rack, item.location) : '?' };
      })
      .filter(({ item, code }) => !q || [item.sku, item.name, item.category, code].some((v) => v.toLowerCase().includes(q)))
      .sort((a, b) => a.code.localeCompare(b.code));
  }, [items, racks, query]);

  return (
    <Panel
      title="Inventário"
      icon={<ListChecks size={16} className="text-cyan-400" />}
      actions={<span className="text-[11px] text-slate-400">{rows.length} itens</span>}
      className="flex min-h-0 flex-1 flex-col [&>div]:flex [&>div]:min-h-0 [&>div]:flex-1 [&>div]:flex-col"
    >
      <div className="relative mb-2">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          className={`${inputClass} pl-8`}
          placeholder="Buscar SKU, nome ou endereço"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <ul className="scrollbar-thin -mx-1 min-h-0 flex-1 space-y-0.5 overflow-y-auto px-1">
        {rows.map(({ item, code }) => {
          const active = item.id === selectedId;
          const hovered = item.id === hoveredId;
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => selectItem(item.id)}
                onMouseEnter={() => hoverItem(item.id)}
                onMouseLeave={() => hoverItem(null)}
                className={`flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition ${
                  active ? 'bg-cyan-500/15 ring-1 ring-cyan-500/50' : hovered ? 'bg-slate-800' : 'hover:bg-slate-800'
                }`}
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: STATUS_META[getStatus(item)].color }}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-medium text-slate-100">{item.name}</span>
                  <span className="block text-[11px] text-slate-400">
                    {item.sku} · {code}
                  </span>
                </span>
                <span className="text-right text-[11px] tabular-nums text-slate-300">
                  {item.quantity}
                  <span className="text-slate-500">/{item.capacity}</span>
                </span>
              </button>
            </li>
          );
        })}
        {rows.length === 0 && <li className="py-6 text-center text-xs text-slate-500">Nenhum item encontrado.</li>}
      </ul>
    </Panel>
  );
}
