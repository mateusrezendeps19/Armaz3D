import type { Aisle, Rack, RackSide, WarehouseLayout } from '../types/stock';
import { AISLE_COLORS } from './warehouseLayout';

// Operações puras sobre o rascunho do layout. Posições são recalculadas pelo store (buildLayout);
// a validação completa fica em validateLayout, executada antes de aplicar.

const newId = () => crypto.randomUUID();

export type AislePatch = Partial<Pick<Aisle, 'code' | 'name' | 'color' | 'blocked' | 'defaultLevels' | 'defaultSlots'>>;
export type RackPatch = Partial<Pick<Rack, 'side' | 'levels' | 'slotsPerLevel'>>;

/** Primeiro código livre: A…Z, depois A1…Z1, A2… */
function nextAisleCode(aisles: Aisle[]): string {
  const used = new Set(aisles.map((a) => a.code));
  for (let round = 0; ; round++) {
    for (let c = 65; c <= 90; c++) {
      const code = String.fromCharCode(c) + (round ? round : '');
      if (!used.has(code)) return code;
    }
  }
}

function newRack(aisle: Aisle, number: number, side: RackSide): Rack {
  return {
    id: newId(),
    aisleId: aisle.id,
    aisle: aisle.code,
    number,
    side,
    position: [0, 0],
    levels: aisle.defaultLevels,
    slotsPerLevel: aisle.defaultSlots,
  };
}

/** Nova rua no fim (junto à doca), com uma estante de cada lado. */
export function addAisle(layout: WarehouseLayout): WarehouseLayout {
  const last = layout.aisles[layout.aisles.length - 1];
  const aisle: Aisle = {
    id: newId(),
    code: nextAisleCode(layout.aisles),
    name: '',
    color: AISLE_COLORS[layout.aisles.length % AISLE_COLORS.length],
    blocked: false,
    defaultLevels: last?.defaultLevels ?? 4,
    defaultSlots: last?.defaultSlots ?? 4,
  };
  return {
    aisles: [...layout.aisles, aisle],
    racks: [...layout.racks, newRack(aisle, 1, 'left'), newRack(aisle, 2, 'right')],
  };
}

export function updateAisle(layout: WarehouseLayout, id: string, patch: AislePatch): WarehouseLayout {
  return { ...layout, aisles: layout.aisles.map((a) => (a.id === id ? { ...a, ...patch } : a)) };
}

/** Move a rua uma posição para o fundo (-1) ou para a doca (+1). */
export function moveAisle(layout: WarehouseLayout, id: string, dir: -1 | 1): WarehouseLayout {
  const from = layout.aisles.findIndex((a) => a.id === id);
  const to = from + dir;
  if (from < 0 || to < 0 || to >= layout.aisles.length) return layout;
  const aisles = [...layout.aisles];
  [aisles[from], aisles[to]] = [aisles[to], aisles[from]];
  return { ...layout, aisles };
}

export function removeAisle(layout: WarehouseLayout, id: string): WarehouseLayout {
  return { aisles: layout.aisles.filter((a) => a.id !== id), racks: layout.racks.filter((r) => r.aisleId !== id) };
}

/** Nova estante na ponta externa do lado escolhido, com o próximo número livre da rua. */
export function addRack(layout: WarehouseLayout, aisleId: string, side: RackSide): WarehouseLayout {
  const aisle = layout.aisles.find((a) => a.id === aisleId);
  if (!aisle) return layout;
  const number = Math.max(0, ...layout.racks.filter((r) => r.aisleId === aisleId).map((r) => r.number)) + 1;
  return { ...layout, racks: [...layout.racks, newRack(aisle, number, side)] };
}

export function updateRack(layout: WarehouseLayout, id: string, patch: RackPatch): WarehouseLayout {
  return { ...layout, racks: layout.racks.map((r) => (r.id === id ? { ...r, ...patch } : r)) };
}

export function removeRack(layout: WarehouseLayout, id: string): WarehouseLayout {
  return { ...layout, racks: layout.racks.filter((r) => r.id !== id) };
}

/** Aplica os níveis/posições padrão da rua a todas as suas estantes. */
export function applyAisleDefaults(layout: WarehouseLayout, aisleId: string): WarehouseLayout {
  const aisle = layout.aisles.find((a) => a.id === aisleId);
  if (!aisle) return layout;
  return {
    ...layout,
    racks: layout.racks.map((r) =>
      r.aisleId === aisleId ? { ...r, levels: aisle.defaultLevels, slotsPerLevel: aisle.defaultSlots } : r,
    ),
  };
}
