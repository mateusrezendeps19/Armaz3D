import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { SEED_RACKS, createSeedItems, createSeedUsers } from '../data/seed';
import { MIN_PASSWORD_LENGTH, USERNAME_PATTERN, can, canOpenTab, hashPassword, verifyPassword } from '../lib/auth';
import { addressCode, sameSlot } from '../lib/warehouseLayout';
import type {
  AppTab,
  ItemPatch,
  Movement,
  MovementReason,
  MovementType,
  MutationResult,
  NewItemInput,
  NewUserInput,
  Permission,
  Rack,
  SlotAddress,
  StockItem,
  User,
  UserPatch,
  ViewMode,
} from '../types/stock';

interface PersistedState {
  racks: Rack[];
  items: StockItem[];
  /** Histórico de entradas/saídas, mais recente primeiro. */
  movements: Movement[];
  users: User[];
  viewMode: ViewMode;
  activeTab: AppTab;
  sidebarCollapsed: boolean;
}

export interface StockState extends PersistedState {
  /** Sessão atual. Não é persistida: o app sempre abre na tela de login. */
  currentUserId: string | null;
  passwordDialogOpen: boolean;
  selectedId: string | null;
  hoveredId: string | null;
  /** Nicho escolhido para a próxima entrada (null = automático). */
  targetSlot: SlotAddress | null;
  /** Quando ativo, nichos vazios ficam clicáveis na cena 3D. */
  placementMode: boolean;

  // ----- CRUD -----
  /** Cria o item na fase 'entering' (dispara a animação de entrada). */
  addItem: (input: NewItemInput) => MutationResult;
  updateItem: (id: string, patch: ItemPatch) => MutationResult;
  /** Reposição (delta > 0) ou baixa (delta < 0), limitada a [0, capacidade]. Retorna o delta aplicado. */
  adjustQuantity: (id: string, delta: number) => number;
  /** Marca o item como 'leaving'; a cena chama finalizeRemoval ao fim da animação. */
  removeItem: (id: string) => void;
  finalizeRemoval: (id: string) => void;
  markIdle: (id: string) => void;

  // ----- Usuários e sessão -----
  login: (username: string, password: string) => Promise<MutationResult>;
  logout: () => void;
  /** Troca a senha do usuário logado (exige a senha atual). */
  changeOwnPassword: (current: string, next: string) => Promise<MutationResult>;
  createUser: (input: NewUserInput) => Promise<MutationResult>;
  updateUser: (id: string, patch: UserPatch) => MutationResult;
  /** Define uma senha provisória; o usuário deverá trocá-la no próximo acesso. */
  resetUserPassword: (id: string, password: string) => Promise<MutationResult>;
  /** Só é possível excluir quem nunca movimentou estoque; os demais devem ser desativados. */
  deleteUser: (id: string) => MutationResult;
  getCurrentUser: () => User | undefined;
  setPasswordDialogOpen: (open: boolean) => void;

  // ----- Consultas -----
  getItem: (id: string) => StockItem | undefined;
  getRack: (id: string) => Rack | undefined;
  isSlotFree: (addr: SlotAddress) => boolean;
  findFreeSlot: () => SlotAddress | null;

  // ----- UI -----
  selectItem: (id: string | null) => void;
  hoverItem: (id: string | null) => void;
  setTargetSlot: (addr: SlotAddress | null) => void;
  setPlacementMode: (on: boolean) => void;
  setViewMode: (mode: ViewMode) => void;
  setActiveTab: (tab: AppTab) => void;
  toggleSidebar: () => void;
  resetDemo: () => void;
}

const newId = () => crypto.randomUUID();

/** Limite do histórico/auditoria no localStorage (~250 bytes por registro). */
const MAX_MOVEMENTS = 5000;

const DENIED: MutationResult = { ok: false, error: 'Seu perfil não tem permissão para esta ação.' };

function logMovement(
  movements: Movement[],
  racks: Rack[],
  actor: User,
  item: StockItem,
  type: MovementType,
  reason: MovementReason,
  quantity: number,
): Movement[] {
  const rack = racks.find((r) => r.id === item.location.rackId);
  const entry: Movement = {
    id: newId(),
    type,
    reason,
    itemId: item.id,
    sku: item.sku,
    name: item.name,
    quantity,
    address: rack ? addressCode(rack, item.location) : '?',
    at: Date.now(),
    userId: actor.id,
    userName: actor.name,
  };
  return [entry, ...movements].slice(0, MAX_MOVEMENTS);
}

function validate(fields: Pick<StockItem, 'sku' | 'name' | 'quantity' | 'capacity' | 'minQuantity'>): string | null {
  if (!fields.sku.trim()) return 'Informe o SKU.';
  if (!fields.name.trim()) return 'Informe o nome do produto.';
  if (![fields.quantity, fields.capacity, fields.minQuantity].every(Number.isFinite)) return 'Valores numéricos inválidos.';
  if (fields.capacity <= 0) return 'A capacidade deve ser maior que zero.';
  if (fields.quantity < 0 || fields.minQuantity < 0) return 'Quantidades não podem ser negativas.';
  if (fields.quantity > fields.capacity) return 'A quantidade excede a capacidade do nicho.';
  return null;
}

function validatePassword(password: string): string | null {
  return password.length < MIN_PASSWORD_LENGTH ? `A senha deve ter ao menos ${MIN_PASSWORD_LENGTH} caracteres.` : null;
}

const isActiveAdmin = (u: User) => u.active && u.role === 'admin';

export const useStockStore = create<StockState>()(
  persist(
    (set, get) => {
      /** Usuário logado, se tiver a permissão. As ações conferem aqui, não só a UI. */
      const actor = (permission: Permission) => {
        const user = get().getCurrentUser();
        return user && can(user, permission) ? user : null;
      };
      const patchUser = (id: string, patch: Partial<User>) =>
        set((s) => ({ users: s.users.map((u) => (u.id === id ? { ...u, ...patch } : u)) }));
      const usernameTaken = (username: string) => get().users.some((u) => u.username === username);

      return {
        racks: SEED_RACKS,
        items: createSeedItems(),
        movements: [],
        users: createSeedUsers(),
        viewMode: 'status',
        activeTab: 'dashboard',
        sidebarCollapsed: false,
        currentUserId: null,
        passwordDialogOpen: false,
        selectedId: null,
        hoveredId: null,
        targetSlot: null,
        placementMode: false,

        addItem: (input) => {
          const user = actor('stock:write');
          if (!user) return DENIED;
          const error = validate(input);
          if (error) return { ok: false, error };

          const location = input.location ?? get().findFreeSlot();
          if (!location) return { ok: false, error: 'Não há nichos livres no galpão.' };
          if (!get().getRack(location.rackId)) return { ok: false, error: 'Estante inexistente.' };
          if (!get().isSlotFree(location)) return { ok: false, error: 'O nicho escolhido já está ocupado.' };

          const item: StockItem = {
            id: newId(),
            sku: input.sku.trim().toUpperCase(),
            name: input.name.trim(),
            category: input.category.trim() || 'Geral',
            quantity: input.quantity,
            capacity: input.capacity,
            minQuantity: input.minQuantity,
            location,
            phase: 'entering',
            createdAt: Date.now(),
          };
          set((s) => ({
            items: [...s.items, item],
            movements: logMovement(s.movements, s.racks, user, item, 'in', 'receipt', item.quantity),
            selectedId: item.id,
          }));
          return { ok: true, id: item.id };
        },

        updateItem: (id, patch) => {
          if (!actor('stock:write')) return DENIED;
          const current = get().getItem(id);
          if (!current) return { ok: false, error: 'Item não encontrado.' };
          const next = { ...current, ...patch };
          const error = validate(next);
          if (error) return { ok: false, error };
          set((s) => ({ items: s.items.map((i) => (i.id === id ? next : i)) }));
          return { ok: true, id };
        },

        adjustQuantity: (id, delta) => {
          const user = actor('stock:write');
          const item = get().getItem(id);
          if (!user || !item || item.phase === 'leaving') return 0;
          const quantity = Math.min(Math.max(item.quantity + delta, 0), item.capacity);
          const applied = quantity - item.quantity;
          if (applied === 0) return 0;
          set((s) => ({
            items: s.items.map((i) => (i.id === id ? { ...i, quantity } : i)),
            movements: logMovement(
              s.movements,
              s.racks,
              user,
              item,
              applied > 0 ? 'in' : 'out',
              applied > 0 ? 'restock' : 'withdrawal',
              Math.abs(applied),
            ),
          }));
          return applied;
        },

        removeItem: (id) => {
          const user = actor('stock:write');
          const item = get().getItem(id);
          if (!user || !item || item.phase === 'leaving') return;
          set((s) => ({
            items: s.items.map((i) => (i.id === id ? { ...i, phase: 'leaving' } : i)),
            movements: logMovement(s.movements, s.racks, user, item, 'out', 'removal', item.quantity),
            selectedId: s.selectedId === id ? null : s.selectedId,
            hoveredId: s.hoveredId === id ? null : s.hoveredId,
          }));
        },

        finalizeRemoval: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),

        markIdle: (id) =>
          set((s) => ({
            items: s.items.map((i) => (i.id === id && i.phase === 'entering' ? { ...i, phase: 'idle' } : i)),
          })),

        login: async (username, password) => {
          const user = get().users.find((u) => u.username === username.trim().toLowerCase());
          // Mesma mensagem para usuário inexistente e senha errada.
          if (!user || !(await verifyPassword(user, password))) return { ok: false, error: 'Usuário ou senha inválidos.' };
          if (!user.active) return { ok: false, error: 'Usuário desativado. Procure um administrador.' };
          patchUser(user.id, { lastLoginAt: Date.now() });
          set((s) => ({
            currentUserId: user.id,
            activeTab: canOpenTab(user, s.activeTab) ? s.activeTab : 'dashboard',
          }));
          return { ok: true, id: user.id };
        },

        logout: () =>
          set({
            currentUserId: null,
            selectedId: null,
            hoveredId: null,
            targetSlot: null,
            placementMode: false,
            passwordDialogOpen: false,
          }),

        changeOwnPassword: async (current, next) => {
          const user = get().getCurrentUser();
          if (!user) return { ok: false, error: 'Sessão encerrada.' };
          if (!(await verifyPassword(user, current))) return { ok: false, error: 'Senha atual incorreta.' };
          const error = validatePassword(next);
          if (error) return { ok: false, error };
          if (current === next) return { ok: false, error: 'A nova senha deve ser diferente da atual.' };
          const { hash, salt } = await hashPassword(next);
          patchUser(user.id, { passwordHash: hash, salt, mustChangePassword: false });
          return { ok: true, id: user.id };
        },

        createUser: async (input) => {
          if (!actor('users:manage')) return DENIED;
          const name = input.name.trim();
          const username = input.username.trim().toLowerCase();
          if (!name) return { ok: false, error: 'Informe o nome.' };
          if (!USERNAME_PATTERN.test(username))
            return { ok: false, error: 'Login inválido: 3 a 32 caracteres entre letras minúsculas, números, ".", "_" e "-".' };
          if (usernameTaken(username)) return { ok: false, error: 'Este login já está em uso.' };
          const error = validatePassword(input.password);
          if (error) return { ok: false, error };
          const { hash, salt } = await hashPassword(input.password);
          // Revalida após o await: outro cadastro pode ter usado o login nesse meio-tempo.
          if (usernameTaken(username)) return { ok: false, error: 'Este login já está em uso.' };
          const user: User = {
            id: newId(),
            name,
            username,
            role: input.role,
            active: true,
            passwordHash: hash,
            salt,
            mustChangePassword: true,
            createdAt: Date.now(),
            lastLoginAt: null,
          };
          set((s) => ({ users: [...s.users, user] }));
          return { ok: true, id: user.id };
        },

        updateUser: (id, patch) => {
          const me = actor('users:manage');
          if (!me) return DENIED;
          const current = get().users.find((u) => u.id === id);
          if (!current) return { ok: false, error: 'Usuário não encontrado.' };
          const next: User = { ...current, ...patch, name: (patch.name ?? current.name).trim() };
          if (!next.name) return { ok: false, error: 'Informe o nome.' };
          if (id === me.id && !next.active) return { ok: false, error: 'Você não pode desativar o próprio usuário.' };
          if (isActiveAdmin(current) && !isActiveAdmin(next) && get().users.filter(isActiveAdmin).length <= 1)
            return { ok: false, error: 'É preciso manter ao menos um administrador ativo.' };
          patchUser(id, next);
          return { ok: true, id };
        },

        resetUserPassword: async (id, password) => {
          if (!actor('users:manage')) return DENIED;
          if (!get().users.some((u) => u.id === id)) return { ok: false, error: 'Usuário não encontrado.' };
          const error = validatePassword(password);
          if (error) return { ok: false, error };
          const { hash, salt } = await hashPassword(password);
          patchUser(id, { passwordHash: hash, salt, mustChangePassword: true });
          return { ok: true, id };
        },

        deleteUser: (id) => {
          const me = actor('users:manage');
          if (!me) return DENIED;
          if (id === me.id) return { ok: false, error: 'Você não pode excluir o próprio usuário.' };
          const user = get().users.find((u) => u.id === id);
          if (!user) return { ok: false, error: 'Usuário não encontrado.' };
          if (get().movements.some((m) => m.userId === id))
            return { ok: false, error: 'Usuário com movimentações registradas: desative-o em vez de excluir.' };
          if (isActiveAdmin(user) && get().users.filter(isActiveAdmin).length <= 1)
            return { ok: false, error: 'É preciso manter ao menos um administrador ativo.' };
          set((s) => ({ users: s.users.filter((u) => u.id !== id) }));
          return { ok: true, id };
        },

        getCurrentUser: () => {
          const { users, currentUserId } = get();
          return currentUserId ? users.find((u) => u.id === currentUserId) : undefined;
        },
        setPasswordDialogOpen: (open) => set({ passwordDialogOpen: open }),

        getItem: (id) => get().items.find((i) => i.id === id),
        getRack: (id) => get().racks.find((r) => r.id === id),

        // Itens saindo já liberam o nicho: a caixa está sendo retirada.
        isSlotFree: (addr) => !get().items.some((i) => i.phase !== 'leaving' && sameSlot(i.location, addr)),

        findFreeSlot: () => {
          const { racks, isSlotFree } = get();
          for (const rack of racks) {
            for (let level = 0; level < rack.levels; level++) {
              for (let slot = 0; slot < rack.slotsPerLevel; slot++) {
                const addr = { rackId: rack.id, level, slot };
                if (isSlotFree(addr)) return addr;
              }
            }
          }
          return null;
        },

        selectItem: (id) => set({ selectedId: id }),
        hoverItem: (id) => set({ hoveredId: id }),
        setTargetSlot: (addr) => set({ targetSlot: addr }),
        setPlacementMode: (on) => set({ placementMode: on }),
        setViewMode: (mode) => set({ viewMode: mode }),
        // O modo de posicionamento só faz sentido na aba de entradas.
        setActiveTab: (tab) => {
          if (!canOpenTab(get().getCurrentUser(), tab)) return;
          set({ activeTab: tab, placementMode: false });
        },
        toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

        // Usuários são preservados; estoque e histórico voltam ao estado de demonstração.
        resetDemo: () => {
          if (!actor('system:reset')) return;
          set({
            racks: SEED_RACKS,
            items: createSeedItems(),
            movements: [],
            selectedId: null,
            hoveredId: null,
            targetSlot: null,
            placementMode: false,
          });
        },
      };
    },
    {
      name: 'estoque-3d',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s): PersistedState => ({
        racks: s.racks,
        items: s.items,
        movements: s.movements,
        users: s.users,
        viewMode: s.viewMode,
        activeTab: s.activeTab,
        sidebarCollapsed: s.sidebarCollapsed,
      }),
      // Animações interrompidas pelo fechamento do app são concluídas ao reabrir.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<PersistedState>;
        const items = (p.items ?? current.items)
          .filter((i) => i.phase !== 'leaving')
          .map((i) => ({ ...i, phase: 'idle' as const }));
        // Registros anteriores ao controle de usuários ficam sem responsável.
        const movements = (p.movements ?? current.movements).map((m) => ({
          ...m,
          userId: m.userId ?? null,
          userName: m.userName ?? 'Não identificado',
        }));
        const users = p.users?.length ? p.users : current.users;
        return { ...current, ...p, items, movements, users };
      },
    },
  ),
);
