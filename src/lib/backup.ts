import { ROLE_META } from './auth';
import { TYPE_LABEL, REASON_LABEL } from './exportLog';
import { buildLayout, sameSlot, validateLayout } from './warehouseLayout';
import type { Aisle, Movement, Rack, StockItem, User } from '../types/stock';

/** Identificador do arquivo e versão do formato dos dados (a mesma do `persist` do store). */
export const BACKUP_APP = 'armaz3d-backup';
export const DATA_VERSION = 2;
/** Arquivos maiores que isso nem são lidos (o localStorage não comportaria). */
export const MAX_BACKUP_BYTES = 20 * 1024 * 1024;

export interface BackupData {
  aisles: Aisle[];
  racks: Rack[];
  items: StockItem[];
  movements: Movement[];
  users: User[];
}

export interface BackupFile {
  app: typeof BACKUP_APP;
  version: number;
  exportedAt: string;
  /** Snapshot de quem gerou o backup. */
  exportedBy: string;
  data: BackupData;
}

export type ParseResult = { ok: true; backup: BackupFile } | { ok: false; error: string };

export function createBackup(data: BackupData, exportedBy: string): BackupFile {
  return {
    app: BACKUP_APP,
    version: DATA_VERSION,
    exportedAt: new Date().toISOString(),
    exportedBy,
    data: {
      aisles: data.aisles,
      racks: data.racks,
      // Animações em andamento não fazem sentido no arquivo: entrando vira parado, saindo já saiu.
      items: data.items.filter((i) => i.phase !== 'leaving').map((i) => ({ ...i, phase: 'idle' })),
      movements: data.movements,
      users: data.users,
    },
  };
}

// ---------- Validação ----------

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === 'string';
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isInt = (v: unknown): v is number => Number.isInteger(v);
const isBool = (v: unknown): v is boolean => typeof v === 'boolean';
const oneOf = <T extends string>(keys: readonly T[]) => (v: unknown): v is T => isStr(v) && keys.includes(v as T);

/** Campo → verificador. Valida o formato de cada registro sem confiar no conteúdo do arquivo. */
type Shape = Record<string, (v: unknown) => boolean>;

const AISLE: Shape = {
  id: isStr, code: isStr, name: isStr, color: isStr, blocked: isBool, defaultLevels: isInt, defaultSlots: isInt,
};
const RACK: Shape = {
  id: isStr, aisleId: isStr, number: isInt, side: oneOf(['left', 'right']), levels: isInt, slotsPerLevel: isInt,
};
const ITEM: Shape = {
  id: isStr, sku: isStr, name: isStr, category: isStr, quantity: isNum, capacity: isNum, minQuantity: isNum,
  createdAt: isNum,
  location: (v) => isObj(v) && isStr(v.rackId) && isInt(v.level) && isInt(v.slot),
};
const MOVEMENT: Shape = {
  id: isStr, itemId: isStr, sku: isStr, name: isStr, quantity: isNum, address: isStr, at: isNum, userName: isStr,
  type: oneOf(Object.keys(TYPE_LABEL)),
  reason: oneOf(Object.keys(REASON_LABEL)),
  userId: (v) => v === null || isStr(v),
  fromAddress: (v) => v === undefined || isStr(v),
};
const USER: Shape = {
  id: isStr, name: isStr, username: isStr, active: isBool, passwordHash: isStr, salt: isStr,
  mustChangePassword: isBool, createdAt: isNum,
  role: oneOf(Object.keys(ROLE_META)),
  lastLoginAt: (v) => v === null || isNum(v),
};

/** Erro do primeiro registro fora do formato, ex.: "itens nº 3: campo quantity inválido". */
function checkList(value: unknown, shape: Shape, label: string): string | null {
  if (!Array.isArray(value)) return `Lista de ${label} ausente.`;
  for (let i = 0; i < value.length; i++) {
    const row = value[i];
    if (!isObj(row)) return `${label} nº ${i + 1}: registro inválido.`;
    const bad = Object.keys(shape).find((key) => !shape[key](row[key]));
    if (bad) return `${label} nº ${i + 1}: campo "${bad}" inválido.`;
  }
  const ids = value.map((r) => (r as Obj).id);
  if (new Set(ids).size !== ids.length) return `Há ${label} com id repetido.`;
  return null;
}

/** Lê e valida o conteúdo de um arquivo de backup. Não altera nada no app. */
export function parseBackup(text: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: 'O arquivo não é um JSON válido.' };
  }
  if (!isObj(raw) || raw.app !== BACKUP_APP) return { ok: false, error: 'O arquivo não é um backup do Armaz3D.' };
  if (!isInt(raw.version) || raw.version > DATA_VERSION)
    return { ok: false, error: 'Backup gerado por uma versão mais nova do app. Atualize o app para restaurá-lo.' };
  if (raw.version < DATA_VERSION) return { ok: false, error: `Versão de backup não suportada (${raw.version}).` };
  if (!isStr(raw.exportedAt) || !isStr(raw.exportedBy) || !isObj(raw.data))
    return { ok: false, error: 'Cabeçalho do backup incompleto.' };

  const d = raw.data;
  const error =
    checkList(d.aisles, AISLE, 'ruas') ??
    checkList(d.racks, RACK, 'estantes') ??
    checkList(d.items, ITEM, 'itens') ??
    checkList(d.movements, MOVEMENT, 'movimentações') ??
    checkList(d.users, USER, 'usuários');
  if (error) return { ok: false, error };

  const aisles = d.aisles as Aisle[];
  // Posições e códigos derivados são recalculados, nunca lidos do arquivo.
  const racks = buildLayout(aisles, d.racks as Rack[]);
  if (racks.length !== (d.racks as Rack[]).length) return { ok: false, error: 'Há estantes ligadas a ruas inexistentes.' };
  const items = (d.items as StockItem[]).map((i) => ({ ...i, phase: 'idle' as const }));
  const users = d.users as User[];

  const badQty = items.find((i) => i.capacity <= 0 || i.quantity < 0 || i.minQuantity < 0 || i.quantity > i.capacity);
  if (badQty) return { ok: false, error: `Quantidades inválidas no item ${badQty.sku}.` };
  const rackById = new Map(racks.map((r) => [r.id, r]));
  const homeless = items.find((i) => {
    const rack = rackById.get(i.location.rackId);
    return !rack || i.location.level < 0 || i.location.slot < 0 || i.location.level >= rack.levels || i.location.slot >= rack.slotsPerLevel;
  });
  if (homeless) return { ok: false, error: `O item ${homeless.sku} aponta para um nicho que não existe no backup.` };
  const layoutIssues = validateLayout({ aisles, racks }, items);
  if (layoutIssues.length) return { ok: false, error: layoutIssues[0] };
  const clash = items.find((a, i) => items.some((b, j) => j > i && sameSlot(a.location, b.location)));
  if (clash) return { ok: false, error: `Dois itens no mesmo nicho (ex.: ${clash.sku}).` };
  if (new Set(users.map((u) => u.username)).size !== users.length) return { ok: false, error: 'Há logins repetidos.' };
  if (!users.some((u) => u.active && u.role === 'admin'))
    return { ok: false, error: 'O backup não tem nenhum administrador ativo.' };

  return {
    ok: true,
    backup: {
      app: BACKUP_APP,
      version: raw.version,
      exportedAt: raw.exportedAt,
      exportedBy: raw.exportedBy,
      data: { aisles, racks, items, movements: d.movements as Movement[], users },
    },
  };
}
