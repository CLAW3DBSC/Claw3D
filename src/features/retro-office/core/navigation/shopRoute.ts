import type {
  FacingPoint,
  FurnitureItem,
  ShopRoute,
} from "@/features/retro-office/core/types";

const GROCERY_ROOM_BOUNDS = {
  minX: 260,
  maxX: 438,
  minY: 40,
  maxY: 270,
};

export const SHOP_ENTRY_TARGET: FacingPoint = {
  x: 395,
  y: 150,
  facing: Math.PI,
};

export const SHOP_AISLE_TARGET: FacingPoint = {
  x: 360,
  y: 150,
  facing: Math.PI,
};

export const SHOP_CHECKOUT_TARGET: FacingPoint = {
  x: 338,
  y: 150,
  facing: 0,
};

export const SHOP_TARGET = SHOP_CHECKOUT_TARGET;

export const resolveShopRoute = (
  item: FurnitureItem | null | undefined,
  x: number,
  y: number,
): ShopRoute => {
  if (!item) {
    return {
      stage: "checkout",
      targetX: SHOP_CHECKOUT_TARGET.x,
      targetY: SHOP_CHECKOUT_TARGET.y,
      facing: SHOP_CHECKOUT_TARGET.facing,
    };
  }
  const closeToCheckout =
    Math.hypot(x - SHOP_CHECKOUT_TARGET.x, y - SHOP_CHECKOUT_TARGET.y) < 44;
  if (closeToCheckout) {
    return {
      stage: "checkout",
      targetX: SHOP_CHECKOUT_TARGET.x,
      targetY: SHOP_CHECKOUT_TARGET.y,
      facing: SHOP_CHECKOUT_TARGET.facing,
    };
  }

  const closeToAisle = Math.hypot(x - SHOP_AISLE_TARGET.x, y - SHOP_AISLE_TARGET.y) < 80;
  if (closeToAisle) {
    return {
      stage: "checkout",
      targetX: SHOP_CHECKOUT_TARGET.x,
      targetY: SHOP_CHECKOUT_TARGET.y,
      facing: SHOP_CHECKOUT_TARGET.facing,
    };
  }

  const enteredStore =
    (x >= GROCERY_ROOM_BOUNDS.minX &&
      x <= GROCERY_ROOM_BOUNDS.maxX &&
      y >= GROCERY_ROOM_BOUNDS.minY &&
      y <= GROCERY_ROOM_BOUNDS.maxY) ||
    Math.hypot(x - SHOP_ENTRY_TARGET.x, y - SHOP_ENTRY_TARGET.y) < 80;
  if (enteredStore) {
    return {
      stage: "aisle",
      targetX: SHOP_AISLE_TARGET.x,
      targetY: SHOP_AISLE_TARGET.y,
      facing: SHOP_AISLE_TARGET.facing,
    };
  }

  return {
    stage: "entrance",
    targetX: SHOP_ENTRY_TARGET.x,
    targetY: SHOP_ENTRY_TARGET.y,
    facing: SHOP_ENTRY_TARGET.facing,
  };
};
