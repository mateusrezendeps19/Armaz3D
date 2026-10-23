import { useState } from 'react';
import type { FormEvent } from 'react';
import { MousePointerClick, PackagePlus, Shuffle } from 'lucide-react';
import { useStockStore } from '../../store/useStockStore';
import { randomDemoProduct } from '../../data/seed';
import { addressCode } from '../../lib/warehouseLayout';
import { Panel, inputClass, labelClass } from './Panel';

const CATEGORIES = ['Geral', 'Fixação', 'Mecânica', 'Elétrica', 'EPI', 'Embalagem', 'Lubrificantes', 'Químicos'];

interface FormState {
  sku: string;
  name: string;
  category: string;
  quantity: string;
  capacity: string;
  minQuantity: string;
}

const EMPTY_FORM: FormState = { sku: '', name: '', category: 'Geral', quantity: '50', capacity: '100', minQuantity: '20' };

/** Formulário de entrada de mercadoria — dispara a animação doca → prateleira. */
export function AddItemForm() {
  const racks = useStockStore((s) => s.racks);
  const targetSlot = useStockStore((s) => s.targetSlot);
  const placementMode = useStockStore((s) => s.placementMode);
  const addItem = useStockStore((s) => s.addItem);
  const setTargetSlot = useStockStore((s) => s.setTargetSlot);
  const setPlacementMode = useStockStore((s) => s.setPlacementMode);
  const isSlotFree = useStockStore((s) => s.isSlotFree);
  useStockStore((s) => s.items); // reavalia a ocupação do nicho alvo quando o estoque muda

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);

  const targetRack = targetSlot ? racks.find((r) => r.id === targetSlot.rackId) : undefined;
  const targetOccupied = !!targetSlot && !isSlotFree(targetSlot);

  const field = (key: keyof FormState) => ({
    value: form[key],
    onChange: (e: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: e.target.value })),
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const result = addItem({
      sku: form.sku,
      name: form.name,
      category: form.category,
      quantity: Number(form.quantity),
      capacity: Number(form.capacity),
      minQuantity: Number(form.minQuantity),
      location: targetSlot,
    });
    if (result.ok) {
      setForm(EMPTY_FORM);
      setTargetSlot(null);
      setFeedback({ type: 'ok', text: 'Entrada registrada — caixa a caminho do nicho.' });
    } else {
      setFeedback({ type: 'error', text: result.error });
    }
  };

  const quickEntry = () => {
    const result = addItem(randomDemoProduct());
    setFeedback(result.ok ? { type: 'ok', text: 'Entrada rápida registrada.' } : { type: 'error', text: result.error });
  };

  const setSlotPart = (part: 'level' | 'slot', value: number) =>
    targetSlot && setTargetSlot({ ...targetSlot, [part]: value });

  return (
    <Panel
      title="Entrada de mercadoria"
      icon={<PackagePlus size={16} className="text-cyan-400" />}
      actions={
        <button
          type="button"
          onClick={quickEntry}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-slate-300 transition hover:bg-slate-800"
          title="Adiciona um produto aleatório no primeiro nicho livre"
        >
          <Shuffle size={12} />
          Entrada rápida
        </button>
      }
    >
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-[1fr_1.6fr] gap-2">
          <div>
            <label className={labelClass}>SKU</label>
            <input className={inputClass} placeholder="ABC-0001" {...field('sku')} />
          </div>
          <div>
            <label className={labelClass}>Produto</label>
            <input className={inputClass} placeholder="Nome do produto" {...field('name')} />
          </div>
        </div>

        <div>
          <label className={labelClass}>Categoria</label>
          <select className={inputClass} {...field('category')}>
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className={labelClass}>Qtd.</label>
            <input type="number" min={0} className={inputClass} {...field('quantity')} />
          </div>
          <div>
            <label className={labelClass}>Capacidade</label>
            <input type="number" min={1} className={inputClass} {...field('capacity')} />
          </div>
          <div>
            <label className={labelClass}>Mínimo</label>
            <input type="number" min={0} className={inputClass} {...field('minQuantity')} />
          </div>
        </div>

        <div>
          <label className={labelClass}>Endereço de destino</label>
          <div className="grid grid-cols-[1.4fr_1fr_1fr] gap-2">
            <select
              className={inputClass}
              value={targetSlot?.rackId ?? ''}
              onChange={(e) => setTargetSlot(e.target.value ? { rackId: e.target.value, level: 0, slot: 0 } : null)}
            >
              <option value="">Automático</option>
              {racks.map((r) => (
                <option key={r.id} value={r.id}>
                  Rua {r.aisle} · E{String(r.number).padStart(2, '0')}
                </option>
              ))}
            </select>
            <select
              className={inputClass}
              disabled={!targetRack}
              value={targetSlot?.level ?? 0}
              onChange={(e) => setSlotPart('level', Number(e.target.value))}
            >
              {Array.from({ length: targetRack?.levels ?? 1 }, (_, i) => (
                <option key={i} value={i}>
                  Nível {i + 1}
                </option>
              ))}
            </select>
            <select
              className={inputClass}
              disabled={!targetRack}
              value={targetSlot?.slot ?? 0}
              onChange={(e) => setSlotPart('slot', Number(e.target.value))}
            >
              {Array.from({ length: targetRack?.slotsPerLevel ?? 1 }, (_, i) => (
                <option key={i} value={i}>
                  Pos. {i + 1}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-2 flex items-center justify-between gap-2 text-[11px]">
            <span className={targetOccupied ? 'text-red-400' : 'text-slate-400'}>
              {targetSlot && targetRack
                ? `${addressCode(targetRack, targetSlot)}${targetOccupied ? ' — ocupado' : ' — livre'}`
                : 'Primeiro nicho livre será usado'}
            </span>
            <button
              type="button"
              onClick={() => setPlacementMode(!placementMode)}
              className={`flex items-center gap-1 rounded-md px-2 py-1 transition ${
                placementMode ? 'bg-cyan-500 text-slate-950' : 'text-cyan-400 hover:bg-slate-800'
              }`}
            >
              <MousePointerClick size={12} />
              {placementMode ? 'Clique num nicho vazio…' : 'Escolher no 3D'}
            </button>
          </div>
        </div>

        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-500 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
        >
          <PackagePlus size={16} />
          Registrar entrada
        </button>

        {feedback && (
          <p className={`text-xs ${feedback.type === 'ok' ? 'text-emerald-400' : 'text-red-400'}`}>{feedback.text}</p>
        )}
      </form>
    </Panel>
  );
}
