import { WarehouseScene } from './components/three/WarehouseScene';
import { DashboardUI } from './components/ui/DashboardUI';
import { LoginScreen } from './components/ui/LoginScreen';
import { useStockStore } from './store/useStockStore';

export default function App() {
  const loggedIn = useStockStore((s) => s.currentUserId !== null);
  return (
    <div className="relative h-full w-full">
      <WarehouseScene />
      {loggedIn ? <DashboardUI /> : <LoginScreen />}
    </div>
  );
}
