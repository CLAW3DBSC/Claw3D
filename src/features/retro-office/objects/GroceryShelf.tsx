"use client";

import { useMemo } from "react";
import { SCALE } from "@/features/retro-office/core/constants";
import {
  getItemBaseSize,
  getItemRotationRadians,
  toWorld,
} from "@/features/retro-office/core/geometry";
import type { InteractiveFurnitureModelProps } from "@/features/retro-office/objects/types";

type ShelfProduct = {
  id: string;
  type: "box" | "cylinder" | "tall-cylinder";
  color: string;
  position: [number, number, number];
};

const PRODUCT_COLORS = [
  "#ef4444",
  "#3b82f6",
  "#22c55e",
  "#eab308",
  "#a855f7",
  "#ec4899",
  "#14b8a6",
  "#f97316",
];

const PRODUCT_TYPES: ShelfProduct["type"][] = ["box", "cylinder", "tall-cylinder"];

const generateShelfProducts = (seed: number): ShelfProduct[] => {
  let currentSeed = seed;
  const random = () => {
    const x = Math.sin(currentSeed++) * 10000;
    return x - Math.floor(x);
  };

  const products: ShelfProduct[] = [];
  const shelves = [0.24, 0.54, 0.84, 1.14];
  const columns = 5;

  shelves.forEach((shelfY, shelfIndex) => {
    for (let column = 0; column < columns; column += 1) {
      if (random() > 0.9) continue;
      const type = PRODUCT_TYPES[Math.floor(random() * PRODUCT_TYPES.length)] ?? "box";
      const color = PRODUCT_COLORS[Math.floor(random() * PRODUCT_COLORS.length)] ?? "#ef4444";
      const offsetX = -0.32 + column * 0.16 + (random() * 0.04 - 0.02);
      const offsetZ = random() * 0.05 - 0.01;
      products.push({
        id: `shelf-product-${shelfIndex}-${column}`,
        type,
        color,
        position: [offsetX, shelfY, offsetZ],
      });
    }
  });

  return products;
};

const ProductMesh = ({ product }: { product: ShelfProduct }) => {
  if (product.type === "box") {
    return (
      <mesh
        position={[product.position[0], product.position[1] + 0.08, product.position[2]]}
        castShadow
      >
        <boxGeometry args={[0.11, 0.16, 0.09]} />
        <meshStandardMaterial color={product.color} roughness={0.62} metalness={0.06} />
      </mesh>
    );
  }

  if (product.type === "tall-cylinder") {
    return (
      <mesh
        position={[product.position[0], product.position[1] + 0.1, product.position[2]]}
        castShadow
      >
        <cylinderGeometry args={[0.04, 0.04, 0.2, 14]} />
        <meshStandardMaterial color={product.color} roughness={0.34} metalness={0.18} />
      </mesh>
    );
  }

  return (
    <mesh position={[product.position[0], product.position[1] + 0.07, product.position[2]]} castShadow>
      <cylinderGeometry args={[0.05, 0.05, 0.14, 14]} />
      <meshStandardMaterial color={product.color} roughness={0.42} metalness={0.2} />
    </mesh>
  );
};

export function GroceryShelfModel({
  item,
  isSelected,
  isHovered,
  editMode,
  onPointerDown,
  onPointerOver,
  onPointerOut,
  onClick,
}: InteractiveFurnitureModelProps) {
  const [wx, , wz] = toWorld(item.x, item.y);
  const { width, height } = getItemBaseSize(item);
  const widthWorld = width * SCALE;
  const depthWorld = height * SCALE;
  const rotY = getItemRotationRadians(item);
  const highlightColor = isSelected
    ? "#fbbf24"
    : isHovered && editMode
      ? "#69f0da"
      : "#000000";
  const highlightIntensity = isSelected ? 0.34 : isHovered && editMode ? 0.18 : 0;
  const products = useMemo(
    () => generateShelfProducts(item.x * 17 + item.y * 13 + (item.facing ?? 0) * 5),
    [item.facing, item.x, item.y],
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
        onPointerOver(item._uid);
      }}
      onPointerOut={(event) => {
        event.stopPropagation();
        onPointerOut();
      }}
      onClick={(event) => {
        event.stopPropagation();
        onClick?.(item._uid);
      }}
    >
      <group position={[widthWorld / 2, 0, depthWorld / 2]} rotation={[0, rotY, 0]}>
        <mesh position={[0, 0.03, 0.08]} receiveShadow>
          <boxGeometry args={[widthWorld * 0.92, 0.06, depthWorld * 0.78]} />
          <meshStandardMaterial color="#4b5563" roughness={0.92} />
        </mesh>
        <mesh position={[-widthWorld * 0.42, 0.72, -depthWorld * 0.21]} castShadow receiveShadow>
          <boxGeometry args={[0.035, 1.34, 0.035]} />
          <meshStandardMaterial
            color="#f8fafc"
            roughness={0.9}
            metalness={0.04}
            emissive={highlightColor}
            emissiveIntensity={highlightIntensity}
          />
        </mesh>
        <mesh position={[widthWorld * 0.42, 0.72, -depthWorld * 0.21]} castShadow receiveShadow>
          <boxGeometry args={[0.035, 1.34, 0.035]} />
          <meshStandardMaterial
            color="#f8fafc"
            roughness={0.9}
            metalness={0.04}
            emissive={highlightColor}
            emissiveIntensity={highlightIntensity}
          />
        </mesh>
        {[0.2, 0.5, 0.8, 1.1].map((y) => (
          <mesh
            key={`grocery-shelf-board-${item._uid}-${y}`}
            position={[0, y, -depthWorld * 0.04]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[widthWorld * 0.92, 0.035, depthWorld * 0.42]} />
            <meshStandardMaterial color="#eceff1" roughness={0.82} metalness={0.04} />
          </mesh>
        ))}
        <mesh position={[-widthWorld * 0.46, 0.72, -depthWorld * 0.05]} castShadow receiveShadow>
          <boxGeometry args={[0.04, 1.34, depthWorld * 0.46]} />
          <meshStandardMaterial color="#e5e7eb" roughness={0.86} metalness={0.04} />
        </mesh>
        <mesh position={[widthWorld * 0.46, 0.72, -depthWorld * 0.05]} castShadow receiveShadow>
          <boxGeometry args={[0.04, 1.34, depthWorld * 0.46]} />
          <meshStandardMaterial color="#e5e7eb" roughness={0.86} metalness={0.04} />
        </mesh>
        {products.map((product) => (
          <ProductMesh key={`${item._uid}-${product.id}`} product={product} />
        ))}
      </group>
    </group>
  );
}
