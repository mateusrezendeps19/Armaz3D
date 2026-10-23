import { useMemo, useState } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import { Edges, Html } from '@react-three/drei';
import { useStockStore } from '../../store/useStockStore';
import {
  BOX_SIZE,
  RACK_DEPTH,
  SHELF_THICKNESS,
  rackHeight,
  rackLabel,
  rackWidth,
  sameSlot,
  shelfY,
  slotWorldPosition,
} from '../../lib/warehouseLayout';
import type { Rack, SlotAddress } from '../../types/stock';

const UPRIGHT_COLOR = '#1d4ed8';
const BEAM_COLOR = '#f97316';
const DECK_COLOR = '#64748b';

interface Rack3DProps {
  rack: Rack;
}

/** Estante porta-paletes: montantes, longarinas, decks e nichos endereçáveis. */
export function Rack3D({ rack }: Rack3DProps) {
  const width = rackWidth(rack) + 0.1;
  const height = rackHeight(rack) + 0.2;
  const halfW = width / 2;
  const halfD = RACK_DEPTH / 2;
  const [rx, rz] = rack.position;

  const posts: Array<[number, number]> = [
    [-halfW, -halfD],
    [-halfW, halfD],
    [halfW, -halfD],
    [halfW, halfD],
    [0, -halfD],
    [0, halfD],
  ];
  const levels = Array.from({ length: rack.levels }, (_, i) => i);

  return (
    <group>
      <group position={[rx, 0, rz]}>
        {posts.map(([x, z]) => (
          <mesh key={`${x}:${z}`} position={[x, height / 2, z]} castShadow receiveShadow>
            <boxGeometry args={[0.08, height, 0.08]} />
            <meshStandardMaterial color={UPRIGHT_COLOR} metalness={0.6} roughness={0.35} />
          </mesh>
        ))}

        {levels.map((level) => {
          const y = shelfY(level);
          return (
            <group key={level}>
              <mesh position={[0, y, 0]} castShadow receiveShadow>
                <boxGeometry args={[width, SHELF_THICKNESS, RACK_DEPTH]} />
                <meshStandardMaterial color={DECK_COLOR} metalness={0.4} roughness={0.6} />
              </mesh>
              {[-halfD, halfD].map((z) => (
                <mesh key={z} position={[0, y - 0.07, z]} castShadow>
                  <boxGeometry args={[width, 0.1, 0.05]} />
                  <meshStandardMaterial color={BEAM_COLOR} metalness={0.5} roughness={0.4} />
                </mesh>
              ))}
            </group>
          );
        })}

        {/* Longarina superior */}
        {[-halfD, halfD].map((z) => (
          <mesh key={`top-${z}`} position={[0, height, z]}>
            <boxGeometry args={[width, 0.08, 0.05]} />
            <meshStandardMaterial color={BEAM_COLOR} metalness={0.5} roughness={0.4} />
          </mesh>
        ))}

        <Html position={[0, height + 0.45, 0]} center distanceFactor={14} zIndexRange={[5, 0]}>
          <div className="pointer-events-none select-none whitespace-nowrap rounded-md bg-slate-900/85 px-2.5 py-1 text-sm font-semibold text-slate-100 ring-1 ring-slate-600">
            {rackLabel(rack)}
          </div>
        </Html>
      </group>

      <SlotMarkers rack={rack} />
    </group>
  );
}

/** Destaque do nicho alvo e, no modo de posicionamento, nichos vazios clicáveis. */
function SlotMarkers({ rack }: { rack: Rack }) {
  const items = useStockStore((s) => s.items);
  const targetSlot = useStockStore((s) => s.targetSlot);
  const placementMode = useStockStore((s) => s.placementMode);
  const setTargetSlot = useStockStore((s) => s.setTargetSlot);
  const setPlacementMode = useStockStore((s) => s.setPlacementMode);
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  const emptySlots = useMemo(() => {
    const slots: SlotAddress[] = [];
    for (let level = 0; level < rack.levels; level++) {
      for (let slot = 0; slot < rack.slotsPerLevel; slot++) {
        const addr = { rackId: rack.id, level, slot };
        if (!items.some((i) => i.phase !== 'leaving' && sameSlot(i.location, addr))) slots.push(addr);
      }
    }
    return slots;
  }, [items, rack]);

  const visible = emptySlots.filter((addr) => placementMode || (targetSlot && sameSlot(targetSlot, addr)));

  return (
    <>
      {visible.map((addr) => {
        const key = `${addr.level}:${addr.slot}`;
        const isTarget = !!targetSlot && sameSlot(targetSlot, addr);
        const isHovered = hoveredKey === key;
        const color = isTarget ? '#22d3ee' : isHovered ? '#a5f3fc' : '#475569';

        const onOver = (e: ThreeEvent<PointerEvent>) => {
          if (!placementMode) return;
          e.stopPropagation();
          setHoveredKey(key);
          document.body.style.cursor = 'copy';
        };
        const onOut = () => {
          setHoveredKey((k) => (k === key ? null : k));
          document.body.style.cursor = 'auto';
        };
        const onClick = (e: ThreeEvent<MouseEvent>) => {
          if (!placementMode) return;
          e.stopPropagation();
          setTargetSlot(addr);
          setPlacementMode(false);
          document.body.style.cursor = 'auto';
        };

        return (
          <mesh
            key={key}
            position={slotWorldPosition(rack, addr.level, addr.slot)}
            onPointerOver={onOver}
            onPointerOut={onOut}
            onClick={onClick}
          >
            <boxGeometry args={BOX_SIZE} />
            <meshBasicMaterial color={color} transparent opacity={isTarget || isHovered ? 0.25 : 0.06} depthWrite={false} />
            <Edges color={color} />
          </mesh>
        );
      })}
    </>
  );
}
