import {
  CANVAS_H,
  CANVAS_W,
  DOOR_LENGTH,
  DOOR_THICKNESS,
  MIN_WALL_LENGTH,
  SCALE,
  SNAP_GRID,
  WALL_THICKNESS,
} from "@/features/retro-office/core/constants";
import type {
  CanvasPoint,
  FurnitureItem,
} from "@/features/retro-office/core/types";

export const toWorld = (cx: number, cy: number): [number, number, number] => [
  cx * SCALE - CANVAS_W * SCALE * 0.5,
  0,
  cy * SCALE - CANVAS_H * SCALE * 0.5,
];

export const snap = (value: number) =>
  Math.round(value / SNAP_GRID) * SNAP_GRID;

let uidCounter = 0;

export const nextUid = () => `fi_${Date.now()}_${uidCounter++}`;

export const normalizeDegrees = (value: number) => {
  const normalized = value % 360;
  return normalized < 0 ? normalized + 360 : normalized;
};

export const resolveItemTypeKey = (item: FurnitureItem) =>
  item.type === "couch" && item.vertical ? "couch_v" : item.type;

export const ITEM_FOOTPRINT: Record<string, [number, number]> = {
  wall: [80, WALL_THICKNESS],
  door: [DOOR_LENGTH, DOOR_THICKNESS],
  desk_cubicle: [100, 55],
  chair: [24, 24],
  round_table: [120, 120],
  executive_desk: [130, 65],
  couch: [100, 40],
  couch_v: [40, 80],
  bookshelf: [80, 120],
  plant: [24, 24],
  beanbag: [40, 40],
  pingpong: [100, 60],
  table_rect: [80, 40],
  coffee_machine: [32, 34],
  fridge: [40, 80],
  water_cooler: [20, 54],
  atm: [42, 38],
  sms_booth: [58, 54],
  phone_booth: [78, 72],
  whiteboard: [10, 60],
  cabinet: [200, 40],
  computer: [30, 20],
  lamp: [30, 30],
  printer: [40, 35],
  stove: [40, 40],
  microwave: [30, 20],
  wall_cabinet: [80, 20],
  sink: [40, 40],
  vending: [40, 60],
  server_rack: [45, 90],
  server_terminal: [42, 34],
  qa_terminal: [54, 38],
  device_rack: [70, 36],
  test_bench: [90, 42],
  treadmill: [70, 35],
  weight_bench: [90, 45],
  dumbbell_rack: [80, 28],
  exercise_bike: [45, 65],
  punching_bag: [28, 28],
  rowing_machine: [90, 34],
  kettlebell_rack: [70, 26],
  yoga_mat: [70, 30],
  keyboard: [30, 14],
  mouse: [16, 10],
  trash: [20, 20],
  mug: [14, 14],
  clock: [20, 20],
};

export const getItemBaseSize = (item: FurnitureItem) => {
  if (item.r !== undefined) {
    return { width: item.r * 2, height: item.r * 2 };
  }
  const [defaultWidth, defaultHeight] = ITEM_FOOTPRINT[
    resolveItemTypeKey(item)
  ] ?? [item.w ?? 40, item.h ?? 40];
  return {
    width: item.w ?? defaultWidth,
    height: item.h ?? defaultHeight,
  };
};

export const FURNITURE_ROTATION: Record<string, number> = {
  couch: Math.PI,
  couch_v: Math.PI / 2,
  executive_desk: -Math.PI / 2,
  whiteboard: Math.PI / 2,
};

export const getItemRotationRadians = (item: FurnitureItem) =>
  ((item.facing ?? 0) * Math.PI) / 180 +
  (FURNITURE_ROTATION[resolveItemTypeKey(item)] ?? 0);

export const getItemBounds = (item: FurnitureItem) => {
  const { width, height } = getItemBaseSize(item);
  const rotation = getItemRotationRadians(item);
  const absCos = Math.abs(Math.cos(rotation));
  const absSin = Math.abs(Math.sin(rotation));
  const boundsWidth = width * absCos + height * absSin;
  const boundsHeight = width * absSin + height * absCos;
  const centerX = item.x + width / 2;
  const centerY = item.y + height / 2;
  return {
    x: centerX - boundsWidth / 2,
    y: centerY - boundsHeight / 2,
    w: boundsWidth,
    h: boundsHeight,
    width,
    height,
  };
};

export const createWallItem = (
  start: CanvasPoint,
  end: CanvasPoint,
  uid: string,
): FurnitureItem => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const horizontal = Math.abs(dx) >= Math.abs(dy);
  if (horizontal) {
    const minX = Math.min(start.x, end.x);
    const maxX = Math.max(start.x, end.x);
    return {
      _uid: uid,
      type: "wall",
      x: snap(minX),
      y: snap(start.y) - WALL_THICKNESS / 2,
      w: Math.max(MIN_WALL_LENGTH, snap(maxX - minX) + WALL_THICKNESS),
      h: WALL_THICKNESS,
      facing: 0,
    };
  }

  const minY = Math.min(start.y, end.y);
  const maxY = Math.max(start.y, end.y);
  return {
    _uid: uid,
    type: "wall",
    x: snap(start.x) - WALL_THICKNESS / 2,
    y: snap(minY),
    w: WALL_THICKNESS,
    h: Math.max(MIN_WALL_LENGTH, snap(maxY - minY) + WALL_THICKNESS),
    facing: 0,
  };
};
