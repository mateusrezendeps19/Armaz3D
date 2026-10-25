import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Ban,
  Check,
  ChevronDown,
  ChevronRight,
  Minus,
  Plus,
  RotateCcw,
  Trash2,
  TriangleAlert,
  Warehouse,
} from 'lucide-react';
import { useStockStore } from '../../../store/useStockStore';
import { useWarehouseLayout } from '../../../hooks/useWarehouseLayout';
import {
  addAisle,
  addRack,
  applyAisleDefaults,
  moveAisle,
  removeAisle,
  removeRack,
  updateAisle,
  updateRack,
} from '../../../lib/layoutEditor';
import type { AislePatch, RackPatch } from '../../../lib/layoutEditor';
import {
  AISLE_COLORS,
  MAX_AISLES,
  MAX_AISLE_NAME,
  MAX_LEVELS,
  MAX_RACKS_PER_SIDE,
  MAX_SLOTS,
  RACK_SIDE_LABEL,
  rackUsage,
  validateLayout,
} from '../../../lib/warehouseLayout';
import type { Aisle, Rack, RackSide } from '../../../types/stock';
import { Panel, inputClass, labelClass } from '../Panel';

type Usage = ReturnType<typeof rackUsage>;

const pad2 = (n: number) => String(n).padStart(2, '0');
const slotCount = (racks: Rack[]) => racks.reduce((sum, r) => sum + r.levels * r.slotsPerLevel, 0);

/** Personalização da estrutura do galpão: ruas, estantes, níveis e posições. Edita um rascunho visto ao vivo na cena. */
export function LayoutTab() {
  const layout = useWarehouseLayout();
  const items = useStockStore((s) => s.items);
  const editLayout = useStockStore((s) => s.editLayout);
  const [expandedId, setExpandedId] = useState<string | null>(() => layout.aisles[0]?.id ?? null);

  const usage = useMemo(() => {
    const map = new Map<string, Usage>();
    layout.racks.forEach((r) => map.set(r.id, rackUsage(items, r.id)));
    return map;
  }, [layout.racks, items]);

  const add = () => {
    editLayout(addAisle);
    setExpandedId(useStockStore.getState().layoutDraft?.aisles.at(-1)?.id ?? null);
  };

  return (
    <>
      <DraftBar />
      <Panel
        title="Ruas do galpão"
        icon={<Warehouse size={16} className="text-cyan-400" />}
        actions={
          <button
            type="button"
            onClick={add}
            disabled={layout.aisles.length >= MAX_AISLES}
            className="flex items-center gap-1 rounded-md bg-cyan-500 px-2 py-1 text-[11px] font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-40"
          >
            <Plus size={12} />
            Nova rua
          </button>
        }
        className="flex min-h-0 flex-1 flex-col [&>div]:flex [&>div]:min-h-0 [&>div]:flex-1 [&>div]:flex-col"
      >
        <p className="mb-2 text-[11px] text-slate-500">
          A primeira rua fica ao fundo e a última junto à doca. Ruas novas entram ao lado da doca.
        </p>
        <ul className="scrollbar-thin -mx-1 min-h-0 flex-1 space-y-2 overflow-y-auto px-1">
          {layout.aisles.map((aisle, index) => (
            <AisleCard
              key={aisle.id}
              aisle={aisle}
              racks={layout.racks.filter((r) => r.aisleId === aisle.id)}
              usage={usage}
              isFirst={index === 0}
              isLast={index === layout.aisles.length - 1}
              canRemove={layout.aisles.length > 1}
              expanded={expandedId === aisle.id}
              onToggle={() => setExpandedId((id) => (id === aisle.id ? null : aisle.id))}
            />
          ))}
        </ul>
      </Panel>
    </>
  );
}

/** Resumo, problemas de validação e Aplicar/Descartar do rascunho. */
function DraftBar() {
  const layout = useWarehouseLayout();
  const dirty = useStockStore((s) => s.layoutDraft !== null);
  const items = useStockStore((s) => s.items);
  const applyLayout = useStockStore((s) => s.applyLayout);
  const discardLayout = useStockStore((s) => s.discardLayout);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);

  const issues = useMemo(() => (dirty ? validateLayout(layout, items) : []), [dirty, layout, items]);

  // A mensagem de sucesso some ao voltar a editar.
  useEffect(() => {
    if (dirty) setFeedback(null);
  }, [dirty]);

  const apply = () => {
    const result = applyLayout();
    setFeedback(result.ok ? { type: 'ok', text: 'Layout aplicado.' } : { type: 'error', text: result.error });
  };

  return (
    <Panel>
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs text-slate-300">
          <span className="font-semibold text-slate-100">{layout.aisles.length}</span> ruas ·{' '}
          <span className="font-semibold text-slate-100">{layout.racks.length}</span> estantes ·{' '}
          <span className="font-semibold text-slate-100">{slotCount(layout.racks)}</span> nichos
          <p className={`mt-0.5 text-[11px] ${dirty ? 'text-amber-300' : 'text-slate-500'}`}>
            {dirty ? 'Alterações não aplicadas · pré-visualização na cena' : 'Sem alterações pendentes'}
          </p>
        </div>
        {dirty && (
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={discardLayout}
              className="flex items-center gap-1.5 rounded-md border border-slate-700 px-3 py-1.5 text-xs text-slate-200 transition hover:bg-slate-800"
            >
              <RotateCcw size={13} />
              Descartar
            </button>
            <button
              type="button"
              onClick={apply}
              disabled={issues.length > 0}
              className="flex items-center gap-1.5 rounded-md bg-cyan-500 px-3 py-1.5 text-xs font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-40"
            >
              <Check size={13} />
              Aplicar
            </button>
          </div>
        )}
      </div>

      {issues.length > 0 && (
        <ul className="mt-3 space-y-1 rounded-md border border-red-500/40 bg-red-500/10 p-2">
          {issues.map((issue) => (
            <li key={issue} className="flex gap-1.5 text-[11px] text-red-300">
              <TriangleAlert size={12} className="mt-px shrink-0" />
              {issue}
            </li>
          ))}
        </ul>
      )}
      {feedback && (
        <p className={`mt-2 text-xs ${feedback.type === 'ok' ? 'text-emerald-400' : 'text-red-400'}`}>{feedback.text}</p>
      )}
    </Panel>
  );
}

interface AisleCardProps {
  aisle: Aisle;
  racks: Rack[];
  usage: Map<string, Usage>;
  isFirst: boolean;
  isLast: boolean;
  canRemove: boolean;
  expanded: boolean;
  onToggle: () => void;
}

function AisleCard({ aisle, racks, usage, isFirst, isLast, canRemove, expanded, onToggle }: AisleCardProps) {
  const editLayout = useStockStore((s) => s.editLayout);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // A confirmação de exclusão expira se não houver segundo clique.
  useEffect(() => {
    if (!confirmDelete) return;
    const t = setTimeout(() => setConfirmDelete(false), 4000);
    return () => clearTimeout(t);
  }, [confirmDelete]);

  const patch = (p: AislePatch) => editLayout((l) => updateAisle(l, aisle.id, p));
  const occupied = racks.reduce((sum, r) => sum + (usage.get(r.id)?.count ?? 0), 0);
  const sideCount = (side: RackSide) => racks.filter((r) => r.side === side).length;

  const remove = () => {
    if (!confirmDelete) return setConfirmDelete(true);
    editLayout((l) => removeAisle(l, aisle.id));
  };

  return (
    <li className={`rounded-lg border bg-slate-950/40 ${expanded ? 'border-slate-600' : 'border-slate-800'}`}>
      <div className="flex items-center gap-2 px-2 py-1.5">
        <button type="button" onClick={onToggle} className="flex min-w-0 flex-1 items-center gap-2 text-left">
          {expanded ? <ChevronDown size={14} className="shrink-0 text-slate-400" /> : <ChevronRight size={14} className="shrink-0 text-slate-400" />}
          <span className="grid h-6 min-w-6 place-items-center rounded px-1 text-[11px] font-bold text-white" style={{ background: aisle.color }}>
            {aisle.code || '?'}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-xs font-medium text-slate-100">{aisle.name || `Rua ${aisle.code}`}</span>
            <span className="block text-[11px] text-slate-400">
              {racks.length} estantes · {occupied}/{slotCount(racks)} nichos ocupados
            </span>
          </span>
          {aisle.blocked && (
            <span className="ml-auto flex shrink-0 items-center gap-1 rounded bg-red-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-red-300">
              <Ban size={10} />
              Bloqueada
            </span>
          )}
        </button>
        <div className="flex shrink-0 items-center">
          <IconButton title="Mover para o fundo" disabled={isFirst} onClick={() => editLayout((l) => moveAisle(l, aisle.id, -1))}>
            <ArrowUp size={13} />
          </IconButton>
          <IconButton title="Mover para a doca" disabled={isLast} onClick={() => editLayout((l) => moveAisle(l, aisle.id, 1))}>
            <ArrowDown size={13} />
          </IconButton>
          <IconButton
            title={
              occupied ? 'Retire os itens da rua antes de removê-la' : !canRemove ? 'O galpão precisa de ao menos uma rua' : confirmDelete ? 'Clique de novo para confirmar' : 'Remover rua'
            }
            disabled={occupied > 0 || !canRemove}
            danger={confirmDelete}
            onClick={remove}
          >
            <Trash2 size={13} />
          </IconButton>
        </div>
      </div>

      {expanded && (
        <div className="space-y-3 border-t border-slate-800 p-3">
          <div className="grid grid-cols-[5rem_1fr] gap-2">
            <div>
              <label className={labelClass}>Código</label>
              <input
                className={`${inputClass} font-mono uppercase`}
                maxLength={3}
                value={aisle.code}
                onChange={(e) => patch({ code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') })}
              />
            </div>
            <div>
              <label className={labelClass}>Nome</label>
              <input
                className={inputClass}
                maxLength={MAX_AISLE_NAME}
                placeholder={`Rua ${aisle.code}`}
                value={aisle.name}
                onChange={(e) => patch({ name: e.target.value })}
              />
            </div>
          </div>
          <p className="-mt-2 text-[11px] text-slate-500">
            O código entra no endereço (ex.: {aisle.code || '?'}-01-1-1). Registros antigos mantêm o endereço da época.
          </p>

          <div className="flex items-end justify-between gap-3">
            <div>
              <label className={labelClass}>Cor</label>
              <div className="flex items-center gap-1.5">
                {AISLE_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    title={c}
                    onClick={() => patch({ color: c })}
                    className={`h-5 w-5 rounded-full transition ${aisle.color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900' : 'hover:scale-110'}`}
                    style={{ background: c }}
                  />
                ))}
                <input
                  type="color"
                  title="Outra cor"
                  value={aisle.color}
                  onChange={(e) => patch({ color: e.target.value })}
                  className="h-5 w-6 cursor-pointer rounded border-0 bg-transparent p-0"
                />
              </div>
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-200" title="Não recebe novas entradas; saídas continuam permitidas">
              <input
                type="checkbox"
                checked={aisle.blocked}
                onChange={(e) => patch({ blocked: e.target.checked })}
                className="h-3.5 w-3.5 accent-red-500"
              />
              Bloquear entradas
            </label>
          </div>

          <div>
            <label className={labelClass}>Padrão para novas estantes</label>
            <div className="flex items-center gap-3">
              <Stepper label="Níveis" value={aisle.defaultLevels} min={1} max={MAX_LEVELS} onChange={(v) => patch({ defaultLevels: v })} />
              <Stepper label="Posições" value={aisle.defaultSlots} min={1} max={MAX_SLOTS} onChange={(v) => patch({ defaultSlots: v })} />
              <button
                type="button"
                onClick={() => editLayout((l) => applyAisleDefaults(l, aisle.id))}
                disabled={!racks.length}
                className="ml-auto rounded-md border border-slate-700 px-2 py-1 text-[11px] text-slate-200 transition hover:bg-slate-800 disabled:opacity-40"
              >
                Aplicar a todas
              </button>
            </div>
          </div>

          <div>
            <div className="mb-1 grid grid-cols-[3rem_6.5rem_1fr_1fr_3.5rem_1.75rem] items-center gap-2 px-1 text-[10px] font-medium uppercase tracking-wide text-slate-500">
              <span>Est.</span>
              <span>Lado</span>
              <span>Níveis</span>
              <span>Posições</span>
              <span className="text-right">Ocup.</span>
              <span />
            </div>
            <ul className="space-y-1">
              {racks.map((rack) => (
                <RackRow
                  key={rack.id}
                  rack={rack}
                  usage={usage.get(rack.id)}
                  sideFull={(side) => side !== rack.side && sideCount(side) >= MAX_RACKS_PER_SIDE}
                />
              ))}
              {!racks.length && <li className="px-1 text-[11px] text-slate-500">Nenhuma estante nesta rua.</li>}
            </ul>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {(['left', 'right'] as const).map((side) => (
                <button
                  key={side}
                  type="button"
                  onClick={() => editLayout((l) => addRack(l, aisle.id, side))}
                  disabled={sideCount(side) >= MAX_RACKS_PER_SIDE}
                  className="flex items-center justify-center gap-1 rounded-md border border-dashed border-slate-700 py-1.5 text-[11px] text-slate-300 transition hover:border-cyan-500/60 hover:text-cyan-300 disabled:opacity-40"
                >
                  <Plus size={12} />
                  Estante à {RACK_SIDE_LABEL[side].toLowerCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </li>
  );
}

interface RackRowProps {
  rack: Rack;
  usage: Usage | undefined;
  /** Lado sem espaço para receber esta estante. */
  sideFull: (side: RackSide) => boolean;
}

function RackRow({ rack, usage, sideFull }: RackRowProps) {
  const editLayout = useStockStore((s) => s.editLayout);
  const patch = (p: RackPatch) => editLayout((l) => updateRack(l, rack.id, p));
  const count = usage?.count ?? 0;

  return (
    <li className="grid grid-cols-[3rem_6.5rem_1fr_1fr_3.5rem_1.75rem] items-center gap-2 rounded-md px-1 py-0.5 hover:bg-slate-800/50">
      <span className="font-mono text-xs text-slate-200">E{pad2(rack.number)}</span>
      <select
        className={`${inputClass} !py-1 text-xs`}
        value={rack.side}
        onChange={(e) => patch({ side: e.target.value as RackSide })}
      >
        {(['left', 'right'] as const).map((side) => (
          <option key={side} value={side} disabled={sideFull(side)}>
            {RACK_SIDE_LABEL[side]}
          </option>
        ))}
      </select>
      {/* O mínimo protege os nichos ocupados: não dá para encolher abaixo do maior nível/posição em uso. */}
      <Stepper value={rack.levels} min={Math.max(1, (usage?.maxLevel ?? -1) + 1)} max={MAX_LEVELS} onChange={(v) => patch({ levels: v })} />
      <Stepper value={rack.slotsPerLevel} min={Math.max(1, (usage?.maxSlot ?? -1) + 1)} max={MAX_SLOTS} onChange={(v) => patch({ slotsPerLevel: v })} />
      <span className="text-right text-[11px] tabular-nums text-slate-400">
        {count}/{rack.levels * rack.slotsPerLevel}
      </span>
      <IconButton
        title={count ? 'Retire os itens da estante antes de removê-la' : 'Remover estante'}
        disabled={count > 0}
        onClick={() => editLayout((l) => removeRack(l, rack.id))}
      >
        <Trash2 size={12} />
      </IconButton>
    </li>
  );
}

interface StepperProps {
  label?: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}

function Stepper({ label, value, min, max, onChange }: StepperProps) {
  return (
    <div className="flex items-center gap-1.5">
      {label && <span className="text-[11px] text-slate-400">{label}</span>}
      <div className="flex items-center rounded-md border border-slate-700 bg-slate-950/70">
        <button
          type="button"
          onClick={() => onChange(value - 1)}
          disabled={value <= min}
          className="grid h-6 w-6 place-items-center text-slate-300 transition hover:text-cyan-300 disabled:opacity-30"
        >
          <Minus size={11} />
        </button>
        <span className="w-5 text-center text-xs tabular-nums text-slate-100">{value}</span>
        <button
          type="button"
          onClick={() => onChange(value + 1)}
          disabled={value >= max}
          className="grid h-6 w-6 place-items-center text-slate-300 transition hover:text-cyan-300 disabled:opacity-30"
        >
          <Plus size={11} />
        </button>
      </div>
    </div>
  );
}

interface IconButtonProps {
  title: string;
  disabled?: boolean;
  danger?: boolean;
  onClick: () => void;
  children: ReactNode;
}

function IconButton({ title, disabled, danger, onClick, children }: IconButtonProps) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`grid h-6 w-6 place-items-center rounded-md transition disabled:opacity-30 ${
        danger ? 'bg-red-500 text-slate-950 hover:bg-red-400' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
      }`}
    >
      {children}
    </button>
  );
}
