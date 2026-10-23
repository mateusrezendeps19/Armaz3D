import { useMemo } from 'react';
import { ArrowDownToLine, ArrowUpFromLine, History } from 'lucide-react';
import { useStockStore } from '../../store/useStockStore';
import type { MovementReason, MovementType } from '../../types/stock';
import { Panel } from './Panel';

const REASON_LABEL: Record<MovementReason, string> = {
  receipt: 'Recebimento',
  restock: 'Reposição',
  withdrawal: 'Baixa parcial',
  removal: 'Retirada do palete',
};

const timeFormat = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

interface MovementListProps {
  type: MovementType;
  title: string;
  className?: string;
}

/** Histórico de movimentações de um tipo; clicar seleciona o item se ele ainda estiver no galpão. */
export function MovementList({ type, title, className = '' }: MovementListProps) {
  const movements = useStockStore((s) => s.movements);
  const items = useStockStore((s) => s.items);
  const selectItem = useStockStore((s) => s.selectItem);

  const rows = useMemo(() => movements.filter((m) => m.type === type), [movements, type]);
  const liveIds = useMemo(() => new Set(items.filter((i) => i.phase !== 'leaving').map((i) => i.id)), [items]);

  const isIn = type === 'in';
  const Icon = isIn ? ArrowDownToLine : ArrowUpFromLine;
  const accent = isIn ? 'text-emerald-400 bg-emerald-500/10' : 'text-orange-400 bg-orange-500/10';

  return (
    <Panel
      title={title}
      icon={<History size={16} className="text-cyan-400" />}
      actions={<span className="text-[11px] text-slate-400">{rows.length} {rows.length === 1 ? 'registro' : 'registros'}</span>}
      className={`flex min-h-0 flex-col [&>div]:flex [&>div]:min-h-0 [&>div]:flex-1 [&>div]:flex-col ${className}`}
    >
      <ul className="scrollbar-thin -mx-1 min-h-0 flex-1 space-y-0.5 overflow-y-auto px-1">
        {rows.map((m) => {
          const live = liveIds.has(m.itemId);
          return (
            <li key={m.id}>
              <button
                type="button"
                disabled={!live}
                onClick={() => selectItem(m.itemId)}
                className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition enabled:hover:bg-slate-800 disabled:cursor-default"
              >
                <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-md ${accent}`}>
                  <Icon size={14} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-medium text-slate-100">{m.name}</span>
                  <span className="block truncate text-[11px] text-slate-400">
                    {REASON_LABEL[m.reason]} · {m.sku} · {m.address}
                  </span>
                </span>
                <span className="text-right">
                  <span className={`block text-xs font-semibold tabular-nums ${isIn ? 'text-emerald-400' : 'text-orange-400'}`}>
                    {isIn ? '+' : '−'}
                    {m.quantity}
                  </span>
                  <span className="block text-[10px] tabular-nums text-slate-500">{timeFormat.format(m.at)}</span>
                </span>
              </button>
            </li>
          );
        })}
        {rows.length === 0 && (
          <li className="py-6 text-center text-xs text-slate-500">
            {isIn ? 'Nenhuma entrada registrada ainda.' : 'Nenhuma saída registrada ainda.'}
          </li>
        )}
      </ul>
    </Panel>
  );
}
