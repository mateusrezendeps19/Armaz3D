import { WarehouseScene } from './components/three/WarehouseScene';
import { DashboardUI } from './components/ui/DashboardUI';

export default function App() {
  return (
    <div className="relative h-full w-full">
      <WarehouseScene />
      <DashboardUI />
    </div>
  );
}
