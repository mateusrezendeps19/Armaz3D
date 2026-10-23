import { Color } from 'three';
import type { Rack, SlotAddress, StockItem, StockStatus, Vec3 } from '../types/stock';

// Dimensões em metros (unidades da cena)
export const SLOT_WIDTH = 1.25;
export const LEVEL_HEIGHT = 1.15;
export const RACK_DEPTH = 1.1;
export const SHELF_THICKNESS = 0.06;
export const FIRST_LEVEL_HEIGHT = 0.12;
export const BOX_SIZE: Vec3 = [0.95, 0.75, 0.85];

/** Distância à frente da estante onde a caixa "estaciona" antes de subir ao nível. */
export const AISLE_CLEARANCE = 1.7;
/** Corredor central livre (x = 0) por onde as caixas trafegam da doca até a rua. */
export const TRANSIT_LANE_X = 0;
export const RECEIVING_DOCK: Vec3 = [TRANSIT_LANE_X, BOX_SIZE[1] / 2, 9.5];

export const rackWidth = (rack: Rack) => rack.slotsPerLevel * SLOT_WIDTH;
export const rackHeight = (rack: Rack) => FIRST_LEVEL_HEIGHT + rack.levels * LEVEL_HEIGHT;
export const shelfY = (level: number) => FIRST_LEVEL_HEIGHT + level * LEVEL_HEIGHT;

/** Centro (coordenadas de mundo) da caixa apoiada no nicho informado. */
export function slotWorldPosition(rack: Rack, level: number, slot: number): Vec3 {
  const [rx, rz] = rack.position;
  const x = rx + (slot - (rack.slotsPerLevel - 1) / 2) * SLOT_WIDTH;
  const y = shelfY(level) + SHELF_THICKNESS / 2 + BOX_SIZE[1] / 2;
  return [x, y, rz];
}

export const sameSlot = (a: SlotAddress, b: SlotAddress) =>
  a.rackId === b.rackId && a.level === b.level && a.slot === b.slot;

const pad2 = (n: number) => String(n).padStart(2, '0');

/** Ex.: "Rua A · Estante 02 · Nível 3 · Posição 1". */
export function formatAddress(rack: Rack, loc: SlotAddress): string {
  return `Rua ${rack.aisle} · Estante ${pad2(rack.number)} · Nível ${loc.level + 1} · Posição ${loc.slot + 1}`;
}

/** Ex.: "A-02-3-1". */
export function addressCode(rack: Rack, loc: SlotAddress): string {
  return `${rack.aisle}-${pad2(rack.number)}-${loc.level + 1}-${loc.slot + 1}`;
}

export const rackLabel = (rack: Rack) => `Rua ${rack.aisle} · E${pad2(rack.number)}`;

// ---------- Status / cores ----------

export const getOccupancy = (item: Pick<StockItem, 'quantity' | 'capacity'>) =>
  item.capacity > 0 ? Math.min(Math.max(item.quantity / item.capacity, 0), 1) : 0;

export function getStatus(item: Pick<StockItem, 'quantity' | 'minQuantity'>): StockStatus {
  if (item.quantity <= 0 || item.quantity <= item.minQuantity / 2) return 'critical';
  if (item.quantity <= item.minQuantity) return 'low';
  return 'ok';
}

export const STATUS_META: Record<StockStatus, { label: string; color: string }> = {
  ok: { label: 'Disponível', color: '#22c55e' },
  low: { label: 'Estoque baixo', color: '#eab308' },
  critical: { label: 'Crítico / vazio', color: '#ef4444' },
};

/** Paleta do heatmap: frio (nicho vazio) → quente (nicho cheio). */
export const HEATMAP_STOPS: ReadonlyArray<readonly [number, string]> = [
  [0, '#1d4ed8'],
  [0.35, '#06b6d4'],
  [0.6, '#facc15'],
  [0.8, '#f97316'],
  [1, '#dc2626'],
];

const heatmapColors = HEATMAP_STOPS.map(([stop, hex]) => [stop, new Color(hex)] as const);
const scratch = new Color();

export function heatmapColor(ratio: number): string {
  const t = Math.min(Math.max(ratio, 0), 1);
  for (let i = 1; i < heatmapColors.length; i++) {
    const [stopB, colorB] = heatmapColors[i];
    if (t <= stopB) {
      const [stopA, colorA] = heatmapColors[i - 1];
      return `#${scratch.lerpColors(colorA, colorB, (t - stopA) / (stopB - stopA)).getHexString()}`;
    }
  }
  return HEATMAP_STOPS[HEATMAP_STOPS.length - 1][1];
}

export const heatmapGradientCss = () =>
  `linear-gradient(to right, ${HEATMAP_STOPS.map(([s, c]) => `${c} ${s * 100}%`).join(', ')})`;
