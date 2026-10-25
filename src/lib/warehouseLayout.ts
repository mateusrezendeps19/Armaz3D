import { Color } from 'three';
import type { Aisle, Rack, SlotAddress, StockItem, StockStatus, Vec3, WarehouseLayout } from '../types/stock';

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

// Grade das ruas: cada rua é uma fileira ao longo de x, com estantes dos dois lados do corredor central.
/** Distância entre ruas consecutivas (eixo z). */
export const ROW_PITCH = 4.5;
/** z da rua mais próxima da doca; as demais se estendem para o fundo. */
export const FRONT_ROW_Z = 3;
/** Distância do eixo do corredor central até a face interna da primeira estante de cada lado. */
export const LANE_MARGIN = 1.1;
/** Vão entre estantes vizinhas do mesmo lado. */
export const RACK_GAP = 0.4;
const MIN_FLOOR_SIZE = 40;
const FLOOR_MARGIN = 4;

// Limites da personalização
export const MAX_AISLES = 20;
export const MAX_RACKS_PER_SIDE = 6;
export const MAX_LEVELS = 8;
export const MAX_SLOTS = 10;
export const MAX_AISLE_NAME = 40;
export const AISLE_CODE_PATTERN = /^[A-Z0-9]{1,3}$/;
export const AISLE_COLORS = ['#2563eb', '#0891b2', '#7c3aed', '#db2777', '#ea580c', '#16a34a', '#ca8a04', '#64748b'];

export const RACK_SIDE_LABEL = { left: 'Esquerda', right: 'Direita' } as const;

export const rackWidth = (rack: Pick<Rack, 'slotsPerLevel'>) => rack.slotsPerLevel * SLOT_WIDTH;
export const rackHeight = (rack: Rack) => FIRST_LEVEL_HEIGHT + rack.levels * LEVEL_HEIGHT;
export const shelfY = (level: number) => FIRST_LEVEL_HEIGHT + level * LEVEL_HEIGHT;

/** z da fileira de índice `index` num galpão com `count` ruas. */
export const aisleZ = (index: number, count: number) => FRONT_ROW_Z - (count - 1 - index) * ROW_PITCH;

/** Início (fundo) da faixa do corredor central. */
export const laneStartZ = (aisleCount: number) => aisleZ(0, Math.max(aisleCount, 1)) - 2;

/**
 * Recalcula os campos derivados das estantes (`position`, `aisle`) a partir da ordem das ruas.
 * De cada lado, as estantes são enfileiradas do corredor para fora, por número.
 * Estantes de ruas inexistentes são descartadas.
 */
export function buildLayout(aisles: Aisle[], racks: Rack[]): Rack[] {
  return aisles.flatMap((aisle, index) => {
    const z = aisleZ(index, aisles.length);
    const cursor = { left: LANE_MARGIN, right: LANE_MARGIN };
    return racks
      .filter((r) => r.aisleId === aisle.id)
      .sort((a, b) => a.number - b.number)
      .map((rack) => {
        const w = rackWidth(rack);
        const x = cursor[rack.side] + w / 2;
        cursor[rack.side] += w + RACK_GAP;
        return { ...rack, aisle: aisle.code, position: [rack.side === 'left' ? -x : x, z] as [number, number] };
      });
  });
}

/** Extensão de uma rua no eixo x [mín, máx], para a faixa no piso. */
export function aisleExtent(racks: Rack[]): [number, number] {
  if (!racks.length) return [-LANE_MARGIN, LANE_MARGIN];
  return [
    Math.min(-LANE_MARGIN, ...racks.map((r) => r.position[0] - rackWidth(r) / 2)),
    Math.max(LANE_MARGIN, ...racks.map((r) => r.position[0] + rackWidth(r) / 2)),
  ];
}

/** Piso quadrado que cobre todas as estantes, o corredor e a doca (lado par e centro inteiro, alinhados à grade). */
export function floorBounds(layout: WarehouseLayout): { size: number; centerZ: number } {
  const halfX = Math.max(0, ...layout.racks.map((r) => Math.abs(r.position[0]) + rackWidth(r) / 2)) + FLOOR_MARGIN;
  const zMin = laneStartZ(layout.aisles.length) - FLOOR_MARGIN;
  const zMax = RECEIVING_DOCK[2] + FLOOR_MARGIN;
  const size = Math.max(MIN_FLOOR_SIZE, Math.ceil(Math.max(2 * halfX, zMax - zMin) / 2) * 2);
  return { size, centerZ: Math.round((zMin + zMax) / 2) };
}

/** Itens fisicamente no nicho (os que estão saindo já não ocupam). */
const occupying = (items: StockItem[]) => items.filter((i) => i.phase !== 'leaving');

/** Ocupação de uma estante: quantos nichos e o maior nível/posição em uso (-1 se vazia). */
export function rackUsage(items: StockItem[], rackId: string) {
  const inRack = occupying(items).filter((i) => i.location.rackId === rackId);
  return {
    count: inRack.length,
    maxLevel: Math.max(-1, ...inRack.map((i) => i.location.level)),
    maxSlot: Math.max(-1, ...inRack.map((i) => i.location.slot)),
  };
}

/** Problemas que impedem aplicar o layout. Lista vazia = válido. */
export function validateLayout(layout: WarehouseLayout, items: StockItem[]): string[] {
  const issues: string[] = [];
  const { aisles, racks } = layout;
  if (!aisles.length) issues.push('O galpão precisa de ao menos uma rua.');
  if (aisles.length > MAX_AISLES) issues.push(`Máximo de ${MAX_AISLES} ruas.`);

  const codes = new Set<string>();
  aisles.forEach((aisle, i) => {
    const label = aisle.code || `#${i + 1}`;
    if (!AISLE_CODE_PATTERN.test(aisle.code)) issues.push(`Rua ${label}: código deve ter de 1 a 3 letras ou números.`);
    else if (codes.has(aisle.code)) issues.push(`Código de rua repetido: ${aisle.code}.`);
    codes.add(aisle.code);
    if (aisle.name.length > MAX_AISLE_NAME) issues.push(`Rua ${label}: nome com mais de ${MAX_AISLE_NAME} caracteres.`);
    const own = racks.filter((r) => r.aisleId === aisle.id);
    (['left', 'right'] as const).forEach((side) => {
      if (own.filter((r) => r.side === side).length > MAX_RACKS_PER_SIDE)
        issues.push(`Rua ${label}: máximo de ${MAX_RACKS_PER_SIDE} estantes por lado.`);
    });
    if (new Set(own.map((r) => r.number)).size !== own.length) issues.push(`Rua ${label}: números de estante repetidos.`);
  });

  racks.forEach((r) => {
    if (r.levels < 1 || r.levels > MAX_LEVELS || r.slotsPerLevel < 1 || r.slotsPerLevel > MAX_SLOTS)
      issues.push(`${rackLabel(r)}: níveis (1 a ${MAX_LEVELS}) ou posições (1 a ${MAX_SLOTS}) fora do limite.`);
  });

  const rackById = new Map(racks.map((r) => [r.id, r]));
  const orphans = occupying(items).filter((i) => {
    const rack = rackById.get(i.location.rackId);
    return !rack || i.location.level >= rack.levels || i.location.slot >= rack.slotsPerLevel;
  });
  if (orphans.length)
    issues.push(`${orphans.length} item(ns) ficariam sem nicho (ex.: ${orphans[0].sku}). Retire-os antes de reduzir ou remover a estrutura.`);

  return issues;
}

/** Centro (coordenadas de mundo) da caixa apoiada no nicho informado. */
export function slotWorldPosition(rack: Pick<Rack, 'position' | 'slotsPerLevel'>, level: number, slot: number): Vec3 {
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
