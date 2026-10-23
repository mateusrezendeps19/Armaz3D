import { AddItemForm } from './AddItemForm';
import { InventoryList } from './InventoryList';
import { ItemDetailsPanel } from './ItemDetailsPanel';
import { Legend } from './Legend';
import { TopBar } from './TopBar';

/**
 * Overlay 2D sobre o Canvas. A raiz ignora o ponteiro (a cena 3D continua recebendo
 * eventos); cada painel reativa os eventos com `pointer-events-auto`.
 */
export function DashboardUI() {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex flex-col gap-3 p-3">
      <TopBar />

      <div className="flex min-h-0 flex-1 gap-3">
        <aside className="flex min-h-0 w-[22rem] flex-col gap-3">
          <AddItemForm />
          <InventoryList />
        </aside>

        <div className="flex flex-1 flex-col items-end justify-between">
          <ItemDetailsPanel />
          <div className="mt-auto">
            <Legend />
          </div>
        </div>
      </div>
    </div>
  );
}
