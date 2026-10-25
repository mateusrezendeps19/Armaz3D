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

/** Lado do corredor central em que a estante fica. */
export type RackSide = 'left' | 'right';

/** Rua (fileira de estantes). A ordem no array define a posição no galpão (primeira = fundo). */
export interface Aisle {
  id: string;
  /** Código curto usado nos endereços — ex.: "A" em "A-02-3-1". */
  code: string;
  /** Nome descritivo opcional — ex.: "Ferragens". */
  name: string;
  /** Cor de identificação na cena (montantes e faixa no piso). */
  color: string;
  /** Rua bloqueada não recebe entradas; saídas continuam permitidas. */
  blocked: boolean;
  /** Níveis e posições usados ao criar novas estantes nesta rua. */
  defaultLevels: number;
  defaultSlots: number;
}

export interface Rack {
  id: string;
  aisleId: string;
  /** Código da rua. Derivado de `Aisle.code` por `buildLayout`. */
  aisle: string;
  /** Número da estante dentro da rua — ex.: 2 → "Estante 02". Estável: não é renumerado ao remover outras. */
  number: number;
  side: RackSide;
  /** Centro da estante no piso [x, z]. Derivado por `buildLayout`. */
  position: [number, number];
  levels: number;
  slotsPerLevel: number;
}

/** Estrutura física do galpão (o que a aba Armazém edita). */
export interface WarehouseLayout {
  aisles: Aisle[];
  racks: Rack[];
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

export type MovementType = 'in' | 'out';

/** receipt = entrada de palete novo · restock = reposição · withdrawal = baixa parcial · removal = retirada do palete. */
export type MovementReason = 'receipt' | 'restock' | 'withdrawal' | 'removal';

/** Registro do histórico de entradas e saídas (snapshot do item no momento da movimentação). */
export interface Movement {
  id: string;
  type: MovementType;
  reason: MovementReason;
  itemId: string;
  sku: string;
  name: string;
  quantity: number;
  /** Código do endereço, ex.: "A-02-3-1". */
  address: string;
  at: number;
  /** Responsável pela movimentação (null em registros anteriores ao controle de usuários). */
  userId: string | null;
  /** Snapshot do nome do responsável, mantido mesmo se o usuário for renomeado. */
  userName: string;
}

export type AppTab = 'dashboard' | 'inbound' | 'outbound' | 'audit' | 'users' | 'layout';

/** admin = acesso total · operator = movimenta estoque · viewer = somente consulta. */
export type UserRole = 'admin' | 'operator' | 'viewer';

/**
 * stock:write = entradas/saídas · users:manage = gestão de usuários · audit:all = registros de todos ·
 * layout:manage = estrutura do galpão · system:reset = restaurar demo.
 */
export type Permission = 'stock:write' | 'users:manage' | 'audit:all' | 'layout:manage' | 'system:reset';

export interface User {
  id: string;
  /** Nome exibido. */
  name: string;
  /** Login, minúsculo e único. */
  username: string;
  role: UserRole;
  active: boolean;
  /** PBKDF2-SHA256 em hex. */
  passwordHash: string;
  salt: string;
  /** Força a troca de senha no próximo acesso (usuário inicial ou senha redefinida). */
  mustChangePassword: boolean;
  createdAt: number;
  lastLoginAt: number | null;
}

export interface NewUserInput {
  name: string;
  username: string;
  role: UserRole;
  password: string;
}

export type UserPatch = Partial<Pick<User, 'name' | 'role' | 'active'>>;
