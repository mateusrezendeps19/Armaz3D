export type Vec3 = [number, number, number];

/** ok = disponível, low = estoque baixo, critical = crítico/vazio. */
export type StockStatus = 'ok' | 'low' | 'critical';

/** Fase de animação da caixa na cena 3D. */
export type AnimPhase = 'entering' | 'idle' | 'leaving';

export type ViewMode = 'status' | 'heatmap';

/** Endereço de um nicho: estante + nível (0 = chão) + posição no nível (0 = esquerda). */
export interface SlotAddress {
  rackId: string;
  level: number;
  slot: number;
}

export interface Rack {
  id: string;
  /** Rua (corredor) — ex.: "A". */
  aisle: string;
  /** Número da estante dentro da rua — ex.: 2 → "Estante 02". */
  number: number;
  /** Posição do centro da estante no piso [x, z]. */
  position: [number, number];
  levels: number;
  slotsPerLevel: number;
}

export interface StockItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  quantity: number;
  /** Capacidade máxima do nicho para este item (base do heatmap). */
  capacity: number;
  /** Abaixo ou igual a este valor o item fica em "estoque baixo". */
  minQuantity: number;
  location: SlotAddress;
  phase: AnimPhase;
  createdAt: number;
}

export interface NewItemInput {
  sku: string;
  name: string;
  category: string;
  quantity: number;
  capacity: number;
  minQuantity: number;
  /** Se omitido, o primeiro nicho livre é escolhido automaticamente. */
  location?: SlotAddress | null;
}

export type ItemPatch = Partial<
  Pick<StockItem, 'sku' | 'name' | 'category' | 'quantity' | 'capacity' | 'minQuantity'>
>;

export type MutationResult = { ok: true; id: string } | { ok: false; error: string };
