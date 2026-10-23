import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import { Outlines } from '@react-three/drei';
import gsap from 'gsap';
import { Color, Vector3 } from 'three';
import type { Group, Mesh, MeshStandardMaterial } from 'three';
import { useStockStore } from '../../store/useStockStore';
import {
  AISLE_CLEARANCE,
  BOX_SIZE,
  RECEIVING_DOCK,
  STATUS_META,
  TRANSIT_LANE_X,
  getOccupancy,
  getStatus,
  heatmapColor,
  slotWorldPosition,
} from '../../lib/warehouseLayout';
import type { Rack, StockItem } from '../../types/stock';

interface RackItem3DProps {
  item: StockItem;
  rack: Rack;
}

const [BOX_W, BOX_H, BOX_D] = BOX_SIZE;
const FILL_BAR_W = BOX_W * 0.8;
const TINY = 0.001;

/**
 * Caixa/palete de um nicho. Cor por status ou heatmap, brilho + contorno no hover/seleção,
 * e animações GSAP de entrada (doca → corredor → nível) e saída (eleva e encolhe).
 */
export function RackItem3D({ item, rack }: RackItem3DProps) {
  const groupRef = useRef<Group>(null);
  const materialRef = useRef<MeshStandardMaterial>(null);
  const fillRef = useRef<Mesh>(null);
  const hasPlacedRef = useRef(false);

  const viewMode = useStockStore((s) => s.viewMode);
  const isHovered = useStockStore((s) => s.hoveredId === item.id);
  const isSelected = useStockStore((s) => s.selectedId === item.id);
  const hoverItem = useStockStore((s) => s.hoverItem);
  const selectItem = useStockStore((s) => s.selectItem);
  const markIdle = useStockStore((s) => s.markIdle);
  const finalizeRemoval = useStockStore((s) => s.finalizeRemoval);

  const { level, slot } = item.location;
  const target = useMemo(() => slotWorldPosition(rack, level, slot), [rack, level, slot]);

  const occupancy = getOccupancy(item);
  const colorHex = viewMode === 'heatmap' ? heatmapColor(occupancy) : STATUS_META[getStatus(item)].color;
  // Cor inicial aplicada só na montagem; mudanças posteriores são interpoladas pelo GSAP.
  const initialColor = useRef(colorHex).current;

  // ----- Transição gradual de cor (status ↔ heatmap, mudança de quantidade) -----
  useEffect(() => {
    const mat = materialRef.current;
    if (!mat) return;
    const c = new Color(colorHex);
    const tweens = [mat.color, mat.emissive].map((channel) =>
      gsap.to(channel, { r: c.r, g: c.g, b: c.b, duration: 0.8, ease: 'power2.out' }),
    );
    return () => tweens.forEach((t) => t.kill());
  }, [colorHex]);

  // ----- Barra de preenchimento na face frontal -----
  useEffect(() => {
    const bar = fillRef.current;
    if (!bar) return;
    const ratio = Math.max(occupancy, TINY);
    const tween = gsap.to(bar.scale, { x: ratio, duration: 0.6, ease: 'power2.out' });
    const pos = gsap.to(bar.position, { x: (-FILL_BAR_W + FILL_BAR_W * ratio) / 2, duration: 0.6, ease: 'power2.out' });
    return () => {
      tween.kill();
      pos.kill();
    };
  }, [occupancy]);

  // ----- Brilho no hover/seleção -----
  useEffect(() => {
    const mat = materialRef.current;
    if (!mat) return;
    const intensity = isSelected ? 0.55 : isHovered ? 0.3 : 0;
    const tween = gsap.to(mat, { emissiveIntensity: intensity, duration: 0.25, ease: 'power1.out' });
    return () => {
      tween.kill();
    };
  }, [isHovered, isSelected]);

  // ----- Animações de entrada / saída / reposicionamento -----
  useLayoutEffect(() => {
    const group = groupRef.current;
    const mat = materialRef.current;
    if (!group || !mat) return;
    const [tx, ty, tz] = target;

    if (item.phase === 'entering') {
      const [dx, dy, dz] = RECEIVING_DOCK;
      const approachZ = tz + AISLE_CLEARANCE;
      group.position.set(dx, dy, dz);
      group.scale.setScalar(TINY);

      const tl = gsap.timeline({ onComplete: () => markIdle(item.id) });
      tl.to(group.scale, { x: 1, y: 1, z: 1, duration: 0.45, ease: 'back.out(2.2)' })
        // percorre o corredor central até a rua de destino
        .to(group.position, { x: TRANSIT_LANE_X, z: approachZ, duration: 1.1, ease: 'power2.inOut' }, '+=0.15')
        // desliza lateralmente até a frente do nicho
        .to(group.position, { x: tx, duration: 0.7, ease: 'power2.inOut' })
        // sobe até o nível
        .to(group.position, { y: ty, duration: 0.55, ease: 'power2.out' })
        // encaixa na prateleira
        .to(group.position, { z: tz, duration: 0.45, ease: 'power1.out' });
      hasPlacedRef.current = true;
      return () => {
        tl.kill();
      };
    }

    if (item.phase === 'leaving') {
      mat.transparent = true;
      mat.needsUpdate = true;
      const tl = gsap.timeline({ onComplete: () => finalizeRemoval(item.id) });
      tl.to(group.position, { z: tz + 0.6, duration: 0.3, ease: 'power1.inOut' })
        .to(group.position, { y: ty + 2.4, duration: 0.9, ease: 'power2.in' })
        .to(group.scale, { x: TINY, y: TINY, z: TINY, duration: 0.9, ease: 'power2.in' }, '<')
        .to(mat, { opacity: 0, duration: 0.6 }, '<0.3');
      return () => {
        tl.kill();
      };
    }

    // idle: na primeira montagem posiciona direto; depois anima se o endereço mudar
    if (!hasPlacedRef.current) {
      group.position.set(tx, ty, tz);
      group.scale.setScalar(1);
      hasPlacedRef.current = true;
      return;
    }
    if (group.position.distanceTo(new Vector3(tx, ty, tz)) > 0.01) {
      const tween = gsap.to(group.position, { x: tx, y: ty, z: tz, duration: 0.8, ease: 'power2.inOut' });
      return () => {
        tween.kill();
      };
    }
  }, [item.phase, item.id, target, markIdle, finalizeRemoval]);

  // Garante que o cursor volte ao normal se a caixa sumir sob o mouse.
  useEffect(
    () => () => {
      if (useStockStore.getState().hoveredId === item.id) {
        hoverItem(null);
        document.body.style.cursor = 'auto';
      }
    },
    [item.id, hoverItem],
  );

  const interactive = item.phase !== 'leaving';

  const handleOver = (e: ThreeEvent<PointerEvent>) => {
    if (!interactive) return;
    e.stopPropagation();
    hoverItem(item.id);
    document.body.style.cursor = 'pointer';
  };
  const handleOut = () => {
    if (useStockStore.getState().hoveredId === item.id) hoverItem(null);
    document.body.style.cursor = 'auto';
  };
  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    if (!interactive) return;
    e.stopPropagation();
    selectItem(item.id);
  };

  const highlighted = interactive && (isHovered || isSelected);

  return (
    <group ref={groupRef}>
      <mesh castShadow receiveShadow onPointerOver={handleOver} onPointerOut={handleOut} onClick={handleClick}>
        <boxGeometry args={BOX_SIZE} />
        <meshStandardMaterial
          ref={materialRef}
          color={initialColor}
          emissive={initialColor}
          emissiveIntensity={0}
          roughness={0.55}
          metalness={0.05}
        />
        {highlighted && <Outlines thickness={isSelected ? 0.045 : 0.03} color={isSelected ? '#ffffff' : '#e2e8f0'} />}
      </mesh>

      {/* "Fita" de palete na base */}
      <mesh position={[0, -BOX_H / 2 + 0.04, 0]} castShadow>
        <boxGeometry args={[BOX_W + 0.04, 0.08, BOX_D + 0.04]} />
        <meshStandardMaterial color="#78350f" roughness={0.9} />
      </mesh>

      {/* Indicador de ocupação na face frontal */}
      <group position={[0, BOX_H / 2 - 0.12, BOX_D / 2 + 0.002]}>
        <mesh>
          <planeGeometry args={[FILL_BAR_W, 0.07]} />
          <meshBasicMaterial color="#0f172a" transparent opacity={0.65} />
        </mesh>
        <mesh ref={fillRef} position={[0, 0, 0.001]} scale={[TINY, 1, 1]}>
          <planeGeometry args={[FILL_BAR_W, 0.07]} />
          <meshBasicMaterial color="#f8fafc" />
        </mesh>
      </group>
    </group>
  );
}
