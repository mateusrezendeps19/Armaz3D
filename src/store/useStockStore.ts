import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { SEED_RACKS, createSeedItems } from '../data/seed';
import { addressCode, sameSlot } from '../lib/warehouseLayout';
import type {
  AppTab,
  ItemPatch,
  Movement,
  MovementReason,
  MovementType,
  MutationResult,
  NewItemInput,
  Rack,
  SlotAddress,
  StockItem,
  ViewMode,
} from '../types/stock';

interface PersistedState {
  racks: Rack[];
  items: StockItem[];
  /** Histórico de entradas/saídas, mais recente primeiro. */
  movements: Movement[];
  viewMode: ViewMode;
  activeTab: AppTab;
  sidebarCollapsed: boolean;
}

export interface StockState extends PersistedState {
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

const MAX_MOVEMENTS = 200;

function logMovement(
  movements: Movement[],
  racks: Rack[],
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

export const useStockStore = create<StockState>()(
  persist(
    (set, get) => ({
      racks: SEED_RACKS,
      items: createSeedItems(),
      movements: [],
      viewMode: 'status',
      activeTab: 'dashboard',
      sidebarCollapsed: false,
      selectedId: null,
      hoveredId: null,
      targetSlot: null,
      placementMode: false,

      addItem: (input) => {
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
          movements: logMovement(s.movements, s.racks, item, 'in', 'receipt', item.quantity),
          selectedId: item.id,
        }));
        return { ok: true, id: item.id };
      },

      updateItem: (id, patch) => {
        const current = get().getItem(id);
        if (!current) return { ok: false, error: 'Item não encontrado.' };
        const next = { ...current, ...patch };
        const error = validate(next);
        if (error) return { ok: false, error };
        set((s) => ({ items: s.items.map((i) => (i.id === id ? next : i)) }));
        return { ok: true, id };
      },

      adjustQuantity: (id, delta) => {
        const item = get().getItem(id);
        if (!item || item.phase === 'leaving') return 0;
        const quantity = Math.min(Math.max(item.quantity + delta, 0), item.capacity);
        const applied = quantity - item.quantity;
        if (applied === 0) return 0;
        set((s) => ({
          items: s.items.map((i) => (i.id === id ? { ...i, quantity } : i)),
          movements: logMovement(
            s.movements,
            s.racks,
            item,
            applied > 0 ? 'in' : 'out',
            applied > 0 ? 'restock' : 'withdrawal',
            Math.abs(applied),
          ),
        }));
        return applied;
      },

      removeItem: (id) => {
        const item = get().getItem(id);
        if (!item || item.phase === 'leaving') return;
        set((s) => ({
          items: s.items.map((i) => (i.id === id ? { ...i, phase: 'leaving' } : i)),
          movements: logMovement(s.movements, s.racks, item, 'out', 'removal', item.quantity),
          selectedId: s.selectedId === id ? null : s.selectedId,
          hoveredId: s.hoveredId === id ? null : s.hoveredId,
        }));
      },

      finalizeRemoval: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),

      markIdle: (id) =>
        set((s) => ({
          items: s.items.map((i) => (i.id === id && i.phase === 'entering' ? { ...i, phase: 'idle' } : i)),
        })),

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
      setActiveTab: (tab) => set({ activeTab: tab, placementMode: false }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

      resetDemo: () =>
        set({
          racks: SEED_RACKS,
          items: createSeedItems(),
          movements: [],
          selectedId: null,
          hoveredId: null,
          targetSlot: null,
          placementMode: false,
        }),
    }),
    {
      name: 'estoque-3d',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s): PersistedState => ({
        racks: s.racks,
        items: s.items,
        movements: s.movements,
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
        return { ...current, ...p, items };
      },
    },
  ),
);
