import type { NewItemInput, Rack, StockItem } from '../types/stock';

const AISLES = ['A', 'B', 'C'] as const;
const ROW_Z = [-6, -1.5, 3];
const RACK_X = [-3.6, 3.6];

export const SEED_RACKS: Rack[] = AISLES.flatMap((aisle, row) =>
  RACK_X.map((x, i) => ({
    id: `${aisle}-${String(i + 1).padStart(2, '0')}`,
    aisle,
    number: i + 1,
    position: [x, ROW_Z[row]] as [number, number],
    levels: 4,
    slotsPerLevel: 4,
  })),
);

type SeedRow = [
  sku: string,
  name: string,
  category: string,
  quantity: number,
  capacity: number,
  minQuantity: number,
  rackId: string,
  level: number,
  slot: number,
];

const ROWS: SeedRow[] = [
  ['FIX-0008', 'Parafuso sextavado M8', 'Fixação', 820, 1000, 200, 'A-01', 0, 0],
  ['FIX-0012', 'Porca autotravante M8', 'Fixação', 140, 1000, 200, 'A-01', 0, 1],
  ['FIX-0031', 'Abraçadeira de nylon 200mm', 'Fixação', 40, 500, 100, 'A-01', 1, 2],
  ['MEC-6204', 'Rolamento 6204-2RS', 'Mecânica', 64, 120, 30, 'A-02', 0, 0],
  ['MEC-0450', 'Correia dentada HTD 450', 'Mecânica', 22, 60, 15, 'A-02', 1, 1],
  ['MEC-0102', 'Acoplamento elástico', 'Mecânica', 0, 40, 10, 'A-02', 2, 3],
  ['LUB-0020', 'Óleo hidráulico ISO 68 20L', 'Lubrificantes', 18, 24, 6, 'B-01', 0, 0],
  ['LUB-0005', 'Graxa de lítio 5kg', 'Lubrificantes', 5, 30, 8, 'B-01', 1, 1],
  ['EPI-0100', 'Luva nitrílica (caixa)', 'EPI', 75, 100, 20, 'B-01', 2, 2],
  ['EPI-0210', 'Óculos de proteção incolor', 'EPI', 30, 150, 40, 'B-02', 0, 2],
  ['EMB-4030', 'Caixa de papelão 40x30', 'Embalagem', 380, 400, 100, 'B-02', 1, 0],
  ['EMB-0048', 'Fita adesiva 48mm', 'Embalagem', 95, 300, 60, 'B-02', 3, 1],
  ['ELE-0032', 'Disjuntor bipolar 32A', 'Elétrica', 48, 80, 20, 'C-01', 0, 1],
  ['ELE-2525', 'Cabo PP 3x2,5mm (rolo)', 'Elétrica', 9, 40, 10, 'C-01', 1, 3],
  ['ELE-0018', 'Lâmpada LED tubular 18W', 'Elétrica', 160, 200, 50, 'C-02', 0, 0],
  ['QUI-0036', 'Tinta epóxi 3,6L', 'Químicos', 12, 50, 15, 'C-02', 2, 2],
];

export function createSeedItems(): StockItem[] {
  const now = Date.now();
  return ROWS.map(([sku, name, category, quantity, capacity, minQuantity, rackId, level, slot], i) => ({
    id: `seed-${i}`,
    sku,
    name,
    category,
    quantity,
    capacity,
    minQuantity,
    location: { rackId, level, slot },
    phase: 'idle',
    createdAt: now,
  }));
}

const DEMO_PRODUCTS: Array<Omit<NewItemInput, 'quantity' | 'location'>> = [
  { sku: 'FIX-0010', name: 'Arruela lisa M10', category: 'Fixação', capacity: 800, minQuantity: 150 },
  { sku: 'MEC-6305', name: 'Rolamento 6305-ZZ', category: 'Mecânica', capacity: 100, minQuantity: 25 },
  { sku: 'EPI-0330', name: 'Protetor auricular plug', category: 'EPI', capacity: 400, minQuantity: 80 },
  { sku: 'EMB-0500', name: 'Filme stretch 500mm', category: 'Embalagem', capacity: 60, minQuantity: 12 },
  { sku: 'ELE-0010', name: 'Tomada 2P+T 10A', category: 'Elétrica', capacity: 250, minQuantity: 50 },
  { sku: 'LUB-0400', name: 'Desengripante spray 300ml', category: 'Lubrificantes', capacity: 120, minQuantity: 30 },
];

/** Produto aleatório para a "entrada rápida" de demonstração. */
export function randomDemoProduct(): NewItemInput {
  const base = DEMO_PRODUCTS[Math.floor(Math.random() * DEMO_PRODUCTS.length)];
  return { ...base, quantity: Math.round(base.capacity * (0.1 + Math.random() * 0.9)) };
}
