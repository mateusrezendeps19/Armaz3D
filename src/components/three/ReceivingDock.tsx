import { Html } from '@react-three/drei';
import { RECEIVING_DOCK, TRANSIT_LANE_X } from '../../lib/warehouseLayout';

const DOCK_W = 4;
const DOCK_D = 3;
const LANE_START_Z = -8;

/** Doca de recebimento (spawn das caixas) e faixa do corredor central de transporte. */
export function ReceivingDock() {
  const [dx, , dz] = RECEIVING_DOCK;
  const laneLength = dz - DOCK_D / 2 - LANE_START_Z;

  const borders: Array<{ pos: [number, number, number]; size: [number, number, number] }> = [
    { pos: [0, 0.01, -DOCK_D / 2], size: [DOCK_W, 0.02, 0.1] },
    { pos: [0, 0.01, DOCK_D / 2], size: [DOCK_W, 0.02, 0.1] },
    { pos: [-DOCK_W / 2, 0.01, 0], size: [0.1, 0.02, DOCK_D] },
    { pos: [DOCK_W / 2, 0.01, 0], size: [0.1, 0.02, DOCK_D] },
  ];

  return (
    <>
      <group position={[dx, 0, dz]}>
        <mesh rotation-x={-Math.PI / 2} position-y={0.004} receiveShadow>
          <planeGeometry args={[DOCK_W, DOCK_D]} />
          <meshStandardMaterial color="#facc15" transparent opacity={0.16} />
        </mesh>
        {borders.map(({ pos, size }, i) => (
          <mesh key={i} position={pos}>
            <boxGeometry args={size} />
            <meshStandardMaterial color="#facc15" emissive="#facc15" emissiveIntensity={0.25} />
          </mesh>
        ))}
        <Html position={[0, 0.05, DOCK_D / 2 + 0.5]} center distanceFactor={14} zIndexRange={[5, 0]}>
          <div className="pointer-events-none select-none whitespace-nowrap rounded-md bg-yellow-400/90 px-2.5 py-1 text-sm font-bold uppercase tracking-wide text-slate-900">
            Doca de recebimento
          </div>
        </Html>
      </group>

      <mesh
        rotation-x={-Math.PI / 2}
        position={[TRANSIT_LANE_X, 0.003, LANE_START_Z + laneLength / 2]}
        receiveShadow
      >
        <planeGeometry args={[1.6, laneLength]} />
        <meshStandardMaterial color="#334155" transparent opacity={0.55} />
      </mesh>
    </>
  );
}
