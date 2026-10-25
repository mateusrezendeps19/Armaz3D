import { useShallow } from 'zustand/react/shallow';
import { useStockStore } from '../store/useStockStore';
import type { WarehouseLayout } from '../types/stock';

/** Layout exibido na cena: o rascunho da aba Armazém, se houver, senão o layout aplicado. */
export function useWarehouseLayout(): WarehouseLayout {
  return useStockStore(
    useShallow((s) => ({
      aisles: s.layoutDraft?.aisles ?? s.aisles,
      racks: s.layoutDraft?.racks ?? s.racks,
    })),
  );
}
