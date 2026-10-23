import { useMemo } from 'react';
import { useStockStore } from '../store/useStockStore';
import { getOccupancy, getStatus } from '../lib/warehouseLayout';
import type { StockItem, StockStatus } from '../types/stock';

export interface StockStats {
  /** Itens fisicamente no galpão (exclui os que estão sendo retirados). */
  activeItems: StockItem[];
  totalSlots: number;
  occupiedSlots: number;
  occupancyPct: number;
  totalUnits: number;
  byStatus: Record<StockStatus, number>;
  /** Itens em estoque baixo ou crítico, do mais vazio para o mais cheio. */
  alerts: StockItem[];
}

/** Indicadores derivados do estoque, compartilhados por sidebar, topo e dashboard. */
export function useStockStats(): StockStats {
  const items = useStockStore((s) => s.items);
  const racks = useStockStore((s) => s.racks);

  return useMemo(() => {
    const activeItems = items.filter((i) => i.phase !== 'leaving');
    const byStatus: Record<StockStatus, number> = { ok: 0, low: 0, critical: 0 };
    activeItems.forEach((i) => byStatus[getStatus(i)]++);
    const totalSlots = racks.reduce((sum, r) => sum + r.levels * r.slotsPerLevel, 0);
    const occupiedSlots = activeItems.length;
    const alerts = activeItems
      .filter((i) => getStatus(i) !== 'ok')
      .sort((a, b) => getOccupancy(a) - getOccupancy(b));

    return {
      activeItems,
      totalSlots,
      occupiedSlots,
      occupancyPct: totalSlots ? Math.round((occupiedSlots / totalSlots) * 100) : 0,
      totalUnits: activeItems.reduce((sum, i) => sum + i.quantity, 0),
      byStatus,
      alerts,
    };
  }, [items, racks]);
}
