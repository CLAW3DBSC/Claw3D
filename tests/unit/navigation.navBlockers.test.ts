import { describe, expect, it } from "vitest";

import { buildNavGrid } from "@/features/retro-office/core/navigation";
import type { FurnitureItem } from "@/features/retro-office/core/types";

// Minimal helper: creates a FurnitureItem at a given position.
const makeItem = (type: string, x = 100, y = 100): FurnitureItem => ({
  _uid: `test_${type}`,
  type,
  x,
  y,
});

/**
 * Returns true if ANY cell in the grid that overlaps the given world-space
 * rectangle is marked as blocked (value === 1).
 */
const isBlocked = (
  grid: Uint8Array,
  wx: number,
  wy: number,
  ww = 30,
  wh = 30,
): boolean => {
  const GRID_CELL = 25;
  const CANVAS_W = 1800;
  const CANVAS_H = 720;
  const GRID_COLS = Math.ceil(CANVAS_W / GRID_CELL);
  const GRID_ROWS = Math.ceil(CANVAS_H / GRID_CELL);

  const c1 = Math.max(0, Math.floor(wx / GRID_CELL));
  const c2 = Math.min(GRID_COLS - 1, Math.floor((wx + ww) / GRID_CELL));
  const r1 = Math.max(0, Math.floor(wy / GRID_CELL));
  const r2 = Math.min(GRID_ROWS - 1, Math.floor((wy + wh) / GRID_CELL));

  for (let r = r1; r <= r2; r++) {
    for (let c = c1; c <= c2; c++) {
      if (grid[r * GRID_COLS + c] === 1) return true;
    }
  }
  return false;
};

describe("buildNavGrid – solid floor props block pathfinding (issue #4)", () => {
  const solidProps = [
    "water_cooler",
    "server_terminal",
    "dishwasher",
    "easel",
    "beanbag",
  ] as const;

  for (const propType of solidProps) {
    it(`marks cells occupied by '${propType}' as blocked`, () => {
      const item = makeItem(propType, 400, 300);
      const grid = buildNavGrid([item]);
      // The item is placed at (400, 300); any cell in that vicinity should be blocked.
      expect(isBlocked(grid, 400, 300)).toBe(true);
    });
  }

  it("does not block cells occupied by non-solid props (e.g. keyboard)", () => {
    // A keyboard is a desk decoration and should NOT block walking paths.
    const item = makeItem("keyboard", 400, 300);
    const grid = buildNavGrid([item]);
    // Centre cell of the item should remain free (border cells are always blocked, pick interior).
    expect(isBlocked(grid, 400, 300)).toBe(false);
  });
});
