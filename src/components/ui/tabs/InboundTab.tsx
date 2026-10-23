import { AddItemForm } from '../AddItemForm';
import { MovementList } from '../MovementList';

export function InboundTab() {
  return (
    <>
      <AddItemForm />
      <MovementList type="in" title="Últimas entradas" className="flex-1" />
    </>
  );
}
