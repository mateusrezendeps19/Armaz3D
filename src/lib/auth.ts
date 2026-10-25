import type { AppTab, Permission, User, UserRole } from '../types/stock';

const PBKDF2_ITERATIONS = 120_000;
const SALT_BYTES = 16;

export const MIN_PASSWORD_LENGTH = 6;
export const USERNAME_PATTERN = /^[a-z0-9._-]{3,32}$/;

export const ROLE_META: Record<UserRole, { label: string; description: string; color: string; permissions: Permission[] }> = {
  admin: {
    label: 'Administrador',
    description: 'Acesso total, inclusive gestão de usuários',
    color: '#22d3ee',
    permissions: ['stock:write', 'users:manage', 'audit:all', 'layout:manage', 'system:reset'],
  },
  operator: {
    label: 'Operador',
    description: 'Registra entradas e saídas',
    color: '#34d399',
    permissions: ['stock:write'],
  },
  viewer: {
    label: 'Consulta',
    description: 'Somente visualização',
    color: '#94a3b8',
    permissions: [],
  },
};

/** Permissão exigida para abrir cada aba (abas ausentes são livres para qualquer usuário logado). */
export const TAB_PERMISSIONS: Partial<Record<AppTab, Permission>> = {
  inbound: 'stock:write',
  outbound: 'stock:write',
  users: 'users:manage',
  layout: 'layout:manage',
};

export function can(user: Pick<User, 'role' | 'active'> | null | undefined, permission: Permission): boolean {
  return !!user && user.active && ROLE_META[user.role].permissions.includes(permission);
}

export function canOpenTab(user: Pick<User, 'role' | 'active'> | null | undefined, tab: AppTab): boolean {
  const permission = TAB_PERMISSIONS[tab];
  return !!user && user.active && (!permission || can(user, permission));
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '?') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

const toHex = (bytes: ArrayBuffer | Uint8Array) =>
  Array.from(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes), (b) => b.toString(16).padStart(2, '0')).join('');

const fromHex = (hex: string) => new Uint8Array(hex.match(/.{2}/g)?.map((h) => parseInt(h, 16)) ?? []);

/** Deriva o hash PBKDF2-SHA256 da senha. Sem `salt`, gera um novo. */
export async function hashPassword(password: string, salt?: string): Promise<{ hash: string; salt: string }> {
  const saltHex = salt ?? toHex(crypto.getRandomValues(new Uint8Array(SALT_BYTES)));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: fromHex(saltHex), iterations: PBKDF2_ITERATIONS },
    key,
    256,
  );
  return { hash: toHex(bits), salt: saltHex };
}

export async function verifyPassword(user: Pick<User, 'passwordHash' | 'salt'>, password: string): Promise<boolean> {
  const { hash } = await hashPassword(password, user.salt);
  // Comparação em tempo constante.
  let diff = hash.length ^ user.passwordHash.length;
  for (let i = 0; i < hash.length; i++) diff |= hash.charCodeAt(i) ^ (user.passwordHash.charCodeAt(i) || 0);
  return diff === 0;
}
