import { Html } from '@react-three/drei';
import { AISLE_CLEARANCE, RACK_DEPTH, aisleExtent } from '../../lib/warehouseLayout';
import type { Aisle, Rack } from '../../types/stock';

const STRIPE_DEPTH = 0.12;
const BLOCKED_COLOR = '#ef4444';

interface AisleMarkingProps {
  aisle: Aisle;
  /** Estantes da rua, já posicionadas por buildLayout. */
  racks: Rack[];
  /** Eixo da fileira (aisleZ). */
  z: number;
}

/** Sinalização da rua no piso: faixa na cor da rua à frente das estantes, placa no corredor e área de bloqueio. */
export function AisleMarking({ aisle, racks, z }: AisleMarkingProps) {
  const [minX, maxX] = aisleExtent(racks);
  const width = maxX - minX;
  const centerX = (minX + maxX) / 2;
  const frontZ = z + RACK_DEPTH / 2;

  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[centerX, 0.006, frontZ + 0.25]}>
        <planeGeometry args={[width, STRIPE_DEPTH]} />
        <meshBasicMaterial color={aisle.color} transparent opacity={0.85} />
      </mesh>

      {aisle.blocked && (
        <mesh rotation-x={-Math.PI / 2} position={[centerX, 0.005, frontZ + AISLE_CLEARANCE / 2]}>
          <planeGeometry args={[width, AISLE_CLEARANCE]} />
          <meshBasicMaterial color={BLOCKED_COLOR} transparent opacity={0.14} depthWrite={false} />
        </mesh>
      )}

      <Html position={[0, 0.05, z]} center distanceFactor={14} zIndexRange={[5, 0]}>
        <div
          className="pointer-events-none flex select-none items-center gap-1.5 whitespace-nowrap rounded-md bg-slate-900/85 px-2 py-0.5 text-xs font-semibold text-slate-100 ring-1"
          style={{ ['--tw-ring-color' as string]: aisle.blocked ? BLOCKED_COLOR : aisle.color }}
        >
          <span className="rounded px-1 text-[11px] font-bold text-white" style={{ background: aisle.color }}>
            {aisle.code}
          </span>
          {aisle.name && <span className="text-slate-300">{aisle.name}</span>}
          {aisle.blocked && <span className="text-[10px] font-bold uppercase text-red-400">Bloqueada</span>}
        </div>
      </Html>
    </group>
  );
}
