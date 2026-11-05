import { MousePointerClick } from 'lucide-react';
import { useStockStore } from '../../store/useStockStore';
import { addressCode, rackLabel } from '../../lib/warehouseLayout';
import type { SlotAddress } from '../../types/stock';
import { inputClass } from './Panel';

interface SlotPickerProps {
  value: SlotAddress | null;
  onChange: (addr: SlotAddress | null) => void;
  /** Rótulo da opção "sem estante" (ex.: "Automático"). */
  emptyLabel: string;
  /** Texto exibido enquanto nenhum nicho foi escolhido. */
  emptyHint: string;
  placementMode: boolean;
  onTogglePlacement: () => void;
}

/** Estante/nível/posição em listas, ou clique num nicho vazio da cena 3D. Ruas bloqueadas ficam indisponíveis. */
export function SlotPicker({ value, onChange, emptyLabel, emptyHint, placementMode, onTogglePlacement }: SlotPickerProps) {
  const racks = useStockStore((s) => s.racks);
  const aisles = useStockStore((s) => s.aisles);
  const isSlotFree = useStockStore((s) => s.isSlotFree);
  useStockStore((s) => s.items); // reavalia a ocupação do nicho quando o estoque muda

  const rack = value ? racks.find((r) => r.id === value.rackId) : undefined;
  const occupied = !!value && !isSlotFree(value);

  // Ao trocar de estante, já sugere o primeiro nicho livre dela.
  const pickRack = (rackId: string) => {
    const next = racks.find((r) => r.id === rackId);
    if (!next) return onChange(null);
    for (let level = 0; level < next.levels; level++) {
      for (let slot = 0; slot < next.slotsPerLevel; slot++) {
        const addr = { rackId, level, slot };
        if (isSlotFree(addr)) return onChange(addr);
      }
    }
    onChange({ rackId, level: 0, slot: 0 });
  };

  const setPart = (part: 'level' | 'slot', n: number) => value && onChange({ ...value, [part]: n });

  return (
    <>
      <div className="grid grid-cols-[1.4fr_1fr_1fr] gap-2">
        <select className={inputClass} value={value?.rackId ?? ''} onChange={(e) => pickRack(e.target.value)}>
          <option value="">{emptyLabel}</option>
          {racks.map((r) => {
            const blocked = !!aisles.find((a) => a.id === r.aisleId)?.blocked;
            return (
              <option key={r.id} value={r.id} disabled={blocked}>
                {rackLabel(r)}
                {blocked && ' (bloqueada)'}
              </option>
            );
          })}
        </select>
        <select
          className={inputClass}
          disabled={!rack}
          value={value?.level ?? 0}
          onChange={(e) => setPart('level', Number(e.target.value))}
        >
          {Array.from({ length: rack?.levels ?? 1 }, (_, i) => (
            <option key={i} value={i}>
              Nível {i + 1}
            </option>
          ))}
        </select>
        <select
          className={inputClass}
          disabled={!rack}
          value={value?.slot ?? 0}
          onChange={(e) => setPart('slot', Number(e.target.value))}
        >
          {Array.from({ length: rack?.slotsPerLevel ?? 1 }, (_, i) => (
            <option key={i} value={i}>
              Pos. {i + 1}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-2 flex items-center justify-between gap-2 text-[11px]">
        <span className={occupied ? 'text-red-400' : 'text-slate-400'}>
          {value && rack ? `${addressCode(rack, value)}${occupied ? ' — ocupado' : ' — livre'}` : emptyHint}
        </span>
        <button
          type="button"
          onClick={onTogglePlacement}
          className={`flex shrink-0 items-center gap-1 rounded-md px-2 py-1 transition ${
            placementMode ? 'bg-cyan-500 text-slate-950' : 'text-cyan-400 hover:bg-slate-800'
          }`}
        >
          <MousePointerClick size={12} />
          {placementMode ? 'Clique num nicho vazio…' : 'Escolher no 3D'}
        </button>
      </div>
    </>
  );
}
