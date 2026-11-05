import { useState } from 'react';
import type { FormEvent } from 'react';
import { PackagePlus, Shuffle } from 'lucide-react';
import { useStockStore } from '../../store/useStockStore';
import { randomDemoProduct } from '../../data/seed';
import { Panel, inputClass, labelClass } from './Panel';
import { SlotPicker } from './SlotPicker';

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
  const targetSlot = useStockStore((s) => s.targetSlot);
  const placementMode = useStockStore((s) => s.placementMode);
  const addItem = useStockStore((s) => s.addItem);
  const setTargetSlot = useStockStore((s) => s.setTargetSlot);
  const setPlacementMode = useStockStore((s) => s.setPlacementMode);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);

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
          <SlotPicker
            value={targetSlot}
            onChange={setTargetSlot}
            emptyLabel="Automático"
            emptyHint="Primeiro nicho livre será usado"
            placementMode={placementMode}
            onTogglePlacement={() => setPlacementMode(!placementMode)}
          />
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
