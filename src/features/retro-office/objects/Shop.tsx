"use client";

import { Billboard, Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef, useState, useMemo } from "react";
import * as THREE from "three";
import { SCALE } from "@/features/retro-office/core/constants";
import {
  getItemBaseSize,
  getItemRotationRadians,
  toWorld,
} from "@/features/retro-office/core/geometry";
import type { InteractiveFurnitureModelProps } from "@/features/retro-office/objects/types";

export type ShopModelProps = InteractiveFurnitureModelProps & {
  active?: boolean;
  enabled?: boolean;
};

// Generate random products for the shelves.
const generateProducts = (seed: number) => {
  const products = [];
  const random = () => {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  };

  const shelfCount = 4;
  const productsPerShelf = 16;
  const shelfWidth = 1.9;
  const startX = -shelfWidth / 2 + 0.05;
  const stepX = shelfWidth / productsPerShelf;
  
  const colors = ["#ef4444", "#3b82f6", "#22c55e", "#eab308", "#a855f7", "#ec4899", "#14b8a6", "#f97316"];
  const types = ["box", "cylinder", "tall-cylinder"];

  for (let s = 0; s < shelfCount; s++) {
    const shelfY = 0.2 + s * 0.35;
    
    // Sometimes leave a gap.
    for (let i = 0; i < productsPerShelf; i++) {
      if (random() > 0.9) continue;
      
      const type = types[Math.floor(random() * types.length)];
      const color = colors[Math.floor(random() * colors.length)];
      const px = startX + i * stepX + (random() * 0.04);
      const pz = 0.05 + (random() * 0.03);
      
      products.push({
        id: `prod_${s}_${i}`,
        type,
        color,
        position: [px, shelfY, pz] as [number, number, number]
      });
    }
  }
  return products;
};

export function ShopModel({
  item,
  isSelected,
  isHovered,
  active = false,
  enabled = true,
  onPointerDown,
  onPointerOver,
  onPointerOut,
  onClick,
}: ShopModelProps) {
  const [localHovered, setLocalHovered] = useState(false);
  const glowRef = useRef<THREE.PointLight>(null);
  const [wx, , wz] = toWorld(item.x, item.y);
  const { width, height } = getItemBaseSize(item);
  const rotY = getItemRotationRadians(item);
  const widthWorld = width * SCALE;
  const depthWorld = height * SCALE;
  
  const highlighted = isSelected || isHovered;
  const open = active && enabled;
  
  const products1 = useMemo(() => generateProducts(123), []);
  const products2 = useMemo(() => generateProducts(456), []);

  useFrame((state) => {
    if (!glowRef.current || !open) return;
    glowRef.current.intensity =
      (Math.sin(state.clock.elapsedTime * 3.6) * 0.28 + 0.72) * 1.5;
  });

  const renderProduct = (p: { id: string; type: string; color: string; position: [number, number, number] }) => {
    if (p.type === "box") {
      return (
        <mesh key={p.id} position={[p.position[0], p.position[1] + 0.12, p.position[2]]} castShadow>
          <boxGeometry args={[0.12, 0.24, 0.12]} />
          <meshStandardMaterial color={p.color} roughness={0.7} />
        </mesh>
      );
    } else if (p.type === "tall-cylinder") {
      return (
        <mesh key={p.id} position={[p.position[0], p.position[1] + 0.14, p.position[2]]} castShadow>
          <cylinderGeometry args={[0.07, 0.07, 0.28, 12]} />
          <meshStandardMaterial color={p.color} roughness={0.3} metalness={0.2} />
        </mesh>
      );
    } else {
      return (
        <mesh key={p.id} position={[p.position[0], p.position[1] + 0.09, p.position[2]]} castShadow>
          <cylinderGeometry args={[0.08, 0.08, 0.18, 12]} />
          <meshStandardMaterial color={p.color} roughness={0.4} metalness={0.5} />
        </mesh>
      );
    }
  };

  const renderShelfUnit = (x: number, z: number, rotation: number, products: { id: string; type: string; color: string; position: [number, number, number] }[]) => (
    <group position={[x, 0, z]} rotation={[0, rotation, 0]}>
      {/* Back panel. */}
      <mesh position={[0, 0.8, -0.2]} castShadow receiveShadow>
        <boxGeometry args={[2.0, 1.6, 0.05]} />
        <meshStandardMaterial color={highlighted ? "#e2e8f0" : "#f8fafc"} roughness={0.9} />
      </mesh>
      {/* Base. */}
      <mesh position={[0, 0.1, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.0, 0.2, 0.4]} />
        <meshStandardMaterial color={highlighted ? "#cbd5e1" : "#e2e8f0"} roughness={0.8} />
      </mesh>
      {/* Shelves. */}
      {[0.5, 0.85, 1.2].map((y, i) => (
        <mesh key={`shelf-${i}`} position={[0, y, -0.05]} castShadow receiveShadow>
          <boxGeometry args={[2.0, 0.03, 0.3]} />
          <meshStandardMaterial color={highlighted ? "#cbd5e1" : "#e2e8f0"} roughness={0.8} />
        </mesh>
      ))}
      {/* Side panels. */}
      <mesh position={[-0.98, 0.8, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.04, 1.6, 0.4]} />
        <meshStandardMaterial color={highlighted ? "#cbd5e1" : "#e2e8f0"} roughness={0.8} />
      </mesh>
      <mesh position={[0.98, 0.8, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.04, 1.6, 0.4]} />
        <meshStandardMaterial color={highlighted ? "#cbd5e1" : "#e2e8f0"} roughness={0.8} />
      </mesh>
      
      {/* Products. */}
      {products.map(renderProduct)}
    </group>
  );

  return (
    <group
      position={[wx, 0, wz]}
      onPointerDown={(event) => {
        event.stopPropagation();
        onPointerDown(item._uid);
      }}
      onPointerOver={(event) => {
        event.stopPropagation();
        setLocalHovered(true);
        onPointerOver(item._uid);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={(event) => {
        event.stopPropagation();
        setLocalHovered(false);
        onPointerOut();
        document.body.style.cursor = "";
      }}
      onClick={(event) => {
        event.stopPropagation();
        onClick?.(item._uid);
      }}
    >
      <group
        position={[widthWorld / 2, 0, depthWorld / 2]}
        rotation={[0, rotY, 0]}
        scale={[widthWorld / 2.2, 1, depthWorld / 2.2]}
      >
        {/* Floor mat/base to tie it together. */}
        <mesh position={[0, 0.01, 0]} receiveShadow>
          <boxGeometry args={[2.4, 0.02, 2.4]} />
          <meshStandardMaterial
            color={enabled ? (highlighted ? "#3b82f6" : "#1e40af") : "#333333"}
            roughness={0.9}
          />
        </mesh>

        {/* Aisle 1. */}
        {renderShelfUnit(0, 0, 0, products1)}

        {/* Floating signs. */}
        <Billboard position={[0, 2.2, 0]}>
          <Text
            fontSize={0.15}
            color={enabled ? "#fcd34d" : "#facc15"}
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.015}
            outlineColor="#000000"
            renderOrder={100000}
            depthOffset={-10}
            material-depthTest={false}
            material-depthWrite={false}
          >
            {enabled ? "GROCERY" : "SHOP"}
          </Text>
        </Billboard>

        <Billboard position={[0, 1.9, 0]}>
          <Text
            fontSize={0.11}
            color={enabled ? "#ffffff" : "#b0b0b0"}
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.012}
            outlineColor="#000000"
            maxWidth={1.5}
            textAlign="center"
            renderOrder={100000}
            depthOffset={-10}
            material-depthTest={false}
            material-depthWrite={false}
          >
            {enabled ? (open ? "OPEN 24/7" : "AMAZON SHOP") : "NOT INSTALLED"}
          </Text>
        </Billboard>

        {!enabled && (localHovered || isHovered) ? (
          <Billboard position={[0, 1.7, 0]}>
            <Text
              fontSize={0.08}
              color="#facc15"
              anchorX="center"
              anchorY="middle"
              outlineWidth={0.01}
              outlineColor="#000000"
            >
              Click to install AMAZON
            </Text>
          </Billboard>
        ) : null}

        {open ? (
          <pointLight
            ref={glowRef}
            position={[0, 1.5, 0]}
            color="#60a5fa"
            intensity={1.5}
            distance={4}
          />
        ) : null}

        {isSelected ? (
          <mesh position={[0, 0.05, 0]}>
            <torusGeometry args={[1.3, 0.04, 16, 64]} />
            <meshStandardMaterial
              color="#fbbf24"
              emissive="#fbbf24"
              emissiveIntensity={1}
            />
          </mesh>
        ) : null}
      </group>
    </group>
  );
}
