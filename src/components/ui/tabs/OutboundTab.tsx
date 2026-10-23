import { useEffect, useState } from 'react';
import { ArrowUpFromLine, MousePointerClick, PackageMinus } from 'lucide-react';
import { useStockStore } from '../../../store/useStockStore';
import { STATUS_META, addressCode, getStatus } from '../../../lib/warehouseLayout';
import { InventoryList } from '../InventoryList';
import { MovementList } from '../MovementList';
import { Panel, inputClass, labelClass } from '../Panel';

export function OutboundTab() {
  return (
    <>
      <OutboundForm />
      <MovementList type="out" title="Últimas saídas" className="max-h-56 shrink-0" />
      <InventoryList />
    </>
  );
}

/** Baixa parcial ou retirada do palete inteiro do item selecionado. */
function OutboundForm() {
  const selectedId = useStockStore((s) => s.selectedId);
  const item = useStockStore((s) => s.items.find((i) => i.id === s.selectedId && i.phase !== 'leaving'));
  const rack = useStockStore((s) => (item ? s.racks.find((r) => r.id === item.location.rackId) : undefined));
  const adjustQuantity = useStockStore((s) => s.adjustQuantity);
  const removeItem = useStockStore((s) => s.removeItem);
  const [amount, setAmount] = useState('1');
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);

  // Mensagem de um item não deve aparecer ao selecionar outro (mas sobrevive à retirada, que limpa a seleção).
  useEffect(() => {
    if (selectedId) setFeedback(null);
  }, [selectedId]);

  const quantity = Math.floor(Number(amount));
  const validAmount = Number.isFinite(quantity) && quantity > 0;

  const withdraw = () => {
    if (!item) return;
    if (!validAmount) return setFeedback({ type: 'error', text: 'Informe uma quantidade maior que zero.' });
    if (quantity > item.quantity)
      return setFeedback({ type: 'error', text: `Saldo insuficiente: há ${item.quantity} unidades no nicho.` });
    const applied = adjustQuantity(item.id, -quantity);
    setFeedback({ type: 'ok', text: `Baixa de ${Math.abs(applied)} unidade(s) registrada.` });
  };

  const removePallet = () => {
    if (!item) return;
    removeItem(item.id);
    setFeedback({ type: 'ok', text: `Palete ${item.sku} retirado do nicho.` });
  };

  return (
    <Panel title="Saída de mercadoria" icon={<ArrowUpFromLine size={16} className="text-orange-400" />}>
      {!item || !rack ? (
        <div className="space-y-2">
          <div className="flex items-start gap-2 rounded-md bg-slate-950/60 px-3 py-3 text-xs text-slate-400 ring-1 ring-slate-800">
            <MousePointerClick size={15} className="mt-0.5 shrink-0 text-cyan-400" />
            Selecione um item no inventário abaixo ou clique em uma caixa na cena 3D.
          </div>
          {feedback && !selectedId && (
            <p className={`text-xs ${feedback.type === 'ok' ? 'text-emerald-400' : 'text-red-400'}`}>{feedback.text}</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                {item.sku} · {addressCode(rack, item.location)}
              </p>
              <p className="truncate text-sm font-semibold text-slate-50">{item.name}</p>
            </div>
            <span className="shrink-0 text-right text-sm font-semibold tabular-nums text-slate-100">
              {item.quantity}
              <span className="font-normal text-slate-500">/{item.capacity}</span>
              <span className="block text-[10px] font-medium" style={{ color: STATUS_META[getStatus(item)].color }}>
                {STATUS_META[getStatus(item)].label}
              </span>
            </span>
          </div>

          <div>
            <label className={labelClass}>Quantidade a baixar</label>
            <div className="flex gap-2">
              <input
                type="number"
                min={1}
                max={item.quantity}
                className={inputClass}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setAmount(String(item.quantity))}
                className="shrink-0 rounded-md border border-slate-700 px-2.5 text-xs text-slate-300 transition hover:bg-slate-800"
              >
                Tudo
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={withdraw}
              disabled={item.quantity === 0}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-orange-500 py-2 text-sm font-semibold text-slate-950 transition hover:bg-orange-400 disabled:opacity-40"
            >
              <ArrowUpFromLine size={15} />
              Registrar baixa
            </button>
            <button
              type="button"
              onClick={removePallet}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-red-500/50 bg-red-500/10 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-500/20"
            >
              <PackageMinus size={15} />
              Retirar palete
            </button>
          </div>

          {feedback && (
            <p className={`text-xs ${feedback.type === 'ok' ? 'text-emerald-400' : 'text-red-400'}`}>{feedback.text}</p>
          )}
        </div>
      )}
    </Panel>
  );
}
