import { Suspense, useEffect, useMemo } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import gsap from 'gsap';
import type { Vector3 } from 'three';
import { useStockStore } from '../../store/useStockStore';
import { aisleZ, floorBounds, laneStartZ, slotWorldPosition } from '../../lib/warehouseLayout';
import { useWarehouseLayout } from '../../hooks/useWarehouseLayout';
import type { Vec3 } from '../../types/stock';
import { AisleMarking } from './AisleMarking';
import { Rack3D } from './Rack3D';
import { RackItem3D } from './RackItem3D';
import { ReceivingDock } from './ReceivingDock';

const BACKGROUND = '#0b1120';
const INITIAL_CAMERA: Vec3 = [7, 13, 21];
// Alvo deslocado à esquerda para compensar o menu e painel lateral do overlay
const INITIAL_TARGET: Vec3 = [-4.5, 1, 1.5];

/** Canvas principal: luzes com sombra, piso industrial, câmera orbital e o conteúdo do estoque. */
export function WarehouseScene() {
  const selectItem = useStockStore((s) => s.selectItem);
  const setPlacementMode = useStockStore((s) => s.setPlacementMode);
  const layout = useWarehouseLayout();
  const floor = useMemo(() => floorBounds(layout), [layout]);

  return (
    <Canvas
      className="!absolute inset-0"
      shadows
      dpr={[1, 2]}
      camera={{ position: INITIAL_CAMERA, fov: 45, near: 0.1, far: 200 }}
      onPointerMissed={() => {
        selectItem(null);
        setPlacementMode(false);
      }}
    >
      <color attach="background" args={[BACKGROUND]} />
      <fog attach="fog" args={[BACKGROUND, Math.max(35, floor.size * 0.9), Math.max(75, floor.size * 1.9)]} />

      <Lights floorSize={floor.size} />
      <Floor size={floor.size} centerZ={floor.centerZ} />

      <Suspense fallback={null}>
        <ReceivingDock laneStartZ={laneStartZ(layout.aisles.length)} />
        <Racks />
        <StockItems />
      </Suspense>

      <OrbitControls
        makeDefault
        target={INITIAL_TARGET}
        enableDamping
        dampingFactor={0.08}
        minDistance={6}
        maxDistance={Math.max(42, floor.size * 1.05)}
        minPolarAngle={0.15}
        maxPolarAngle={Math.PI / 2.15}
      />
      <CameraFocus />
    </Canvas>
  );
}

function Lights({ floorSize }: { floorSize: number }) {
  // A câmera de sombra cobre o piso; a key remonta a luz quando o galpão muda de tamanho.
  const extent = Math.max(18, floorSize / 2);
  return (
    <>
      <ambientLight intensity={0.45} />
      <hemisphereLight args={['#cbd5e1', '#1e293b', 0.5]} />
      <directionalLight
        key={extent}
        position={[12, 20, 10]}
        intensity={1.6}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-camera-left={-extent}
        shadow-camera-right={extent}
        shadow-camera-top={extent}
        shadow-camera-bottom={-extent}
        shadow-camera-near={1}
        shadow-camera-far={Math.max(60, extent * 3.5)}
      />
      <pointLight position={[0, 8, 9]} intensity={20} distance={18} color="#fde68a" />
    </>
  );
}

function Floor({ size, centerZ }: { size: number; centerZ: number }) {
  return (
    <group position-z={centerZ}>
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[size, size]} />
        <meshStandardMaterial color="#1e293b" roughness={0.95} metalness={0.05} />
      </mesh>
      <gridHelper args={[size, size, '#475569', '#283548']} position-y={0.002} />
    </group>
  );
}

function Racks() {
  const { aisles, racks } = useWarehouseLayout();
  return (
    <>
      {aisles.map((aisle, index) => {
        const own = racks.filter((r) => r.aisleId === aisle.id);
        return (
          <group key={aisle.id}>
            <AisleMarking aisle={aisle} racks={own} z={aisleZ(index, aisles.length)} />
            {own.map((rack) => (
              <Rack3D key={rack.id} rack={rack} aisle={aisle} />
            ))}
          </group>
        );
      })}
    </>
  );
}

function StockItems() {
  const items = useStockStore((s) => s.items);
  const { racks } = useWarehouseLayout();
  const rackById = useMemo(() => new Map(racks.map((r) => [r.id, r])), [racks]);

  return (
    <>
      {items.map((item) => {
        const rack = rackById.get(item.location.rackId);
        return rack ? <RackItem3D key={item.id} item={item} rack={rack} /> : null;
      })}
    </>
  );
}

type OrbitLike = { target: Vector3; update: () => void };

/** Ao selecionar uma caixa, desliza o alvo da câmera orbital até ela. */
function CameraFocus() {
  const controls = useThree((s) => s.controls) as unknown as OrbitLike | null;
  const selectedId = useStockStore((s) => s.selectedId);

  useEffect(() => {
    if (!controls || !selectedId) return;
    const { getItem, getRack } = useStockStore.getState();
    const item = getItem(selectedId);
    const rack = item && getRack(item.location.rackId);
    if (!item || !rack) return;

    const [x, y, z] = slotWorldPosition(rack, item.location.level, item.location.slot);
    const tween = gsap.to(controls.target, {
      x,
      y,
      z,
      duration: 0.9,
      ease: 'power2.inOut',
      onUpdate: () => controls.update(),
    });
    return () => {
      tween.kill();
    };
  }, [controls, selectedId]);

  return null;
}
