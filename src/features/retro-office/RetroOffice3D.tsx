"use client";

import {
  Pencil,
  Check,
  Map as MapIcon,
  Maximize,
  Monitor,
  Armchair,
  Settings2,
  Camera,
  ChevronDown,
  X,
} from "lucide-react";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { SettingsPanel } from "@/features/office/components/panels/SettingsPanel";
import { AtmImmersiveScreen } from "@/features/office/screens/AtmImmersiveScreen";
import { GithubImmersiveScreen } from "@/features/office/screens/GithubImmersiveScreen";
import {
  PhoneBoothImmersiveScreen,
  type PhoneCallStep,
} from "@/features/office/screens/PhoneBoothImmersiveScreen";
import {
  SmsBoothImmersiveScreen,
  type TextMessageStep,
} from "@/features/office/screens/SmsBoothImmersiveScreen";
import { StandupImmersiveScreen } from "@/features/office/screens/StandupImmersiveScreen";
import type { OfficeUsageAnalyticsParams } from "@/features/office/hooks/useOfficeUsageAnalyticsViewModel";
import { buildMockPhoneCallScenario } from "@/lib/office/call/mock";
import type { MockPhoneCallScenario } from "@/lib/office/call/types";
import { buildMockTextMessageScenario } from "@/lib/office/text/mock";
import type { MockTextMessageScenario } from "@/lib/office/text/types";
import type { OfficeDeskMonitor } from "@/lib/office/deskMonitor";
import type { OfficeAnimationState } from "@/lib/office/eventTriggers";
import type { StandupMeeting } from "@/lib/office/standup/types";
import type { SkillStatusEntry } from "@/lib/skills/types";
import { extractSpeechImage } from "@/lib/text/speech-image";
import { MonitorImmersiveContent as MonitorImmersiveOverlay } from "@/features/retro-office/overlays/MonitorImmersiveContent";
import {
  AGENT_RADIUS,
  BUMP_FREEZE_MS,
  BUMP_RECOVERY_MS,
  CANVAS_H,
  CANVAS_W,
  DESK_STICKY_MS,
  DOOR_LENGTH,
  DOOR_THICKNESS,
  ELEVATION_STEP,
  PING_PONG_APPROACH_SPEED,
  PING_PONG_SESSION_MS,
  ROTATION_STEP_DEG,
  SCALE,
  SEPARATION_STRENGTH,
  SNAP_GRID,
  WALK_SPEED,
  WALL_THICKNESS,
  WORKING_WALK_SPEED_MULTIPLIER,
} from "@/features/retro-office/core/constants";
import {
  ensureOfficeAtm,
  ensureOfficeGymRoom,
  ensureOfficePhoneBooth,
  ensureOfficePingPongTable,
  ensureOfficeQaLab,
  ensureOfficeSmsBooth,
  ensureOfficeServerRoom,
  isRetiredPingPongLamp,
  materializeDefaults,
} from "@/features/retro-office/core/furnitureDefaults";
import {
  buildJanitorActorsForCue,
  pruneExpiredJanitorActors,
} from "@/features/retro-office/core/janitors";
import {
  createWallItem,
  getItemBaseSize,
  getItemRotationRadians,
  nextUid,
  normalizeDegrees,
  resolveItemTypeKey,
  snap,
  toWorld,
} from "@/features/retro-office/core/geometry";
import {
  astar,
  buildNavGrid,
  getDeskLocations,
  getGymWorkoutLocations,
  getJanitorCleaningStops,
  getMeetingSeatLocations,
  getQaLabStations,
  GYM_DEFAULT_TARGET,
  MEETING_OVERFLOW_LOCATIONS,
  QA_LAB_DEFAULT_TARGET,
  resolveDeskIndexForItem,
  resolveGymRoute,
  resolvePhoneBoothRoute,
  resolvePingPongTargets,
  resolveQaLabRoute,
  resolveSmsBoothRoute,
  resolveServerRoomRoute,
  ROAM_POINTS,
  SERVER_ROOM_TARGET,
} from "@/features/retro-office/core/navigation";
import {
  loadFurniture,
  markAtmMigrationApplied,
  markGymRoomMigrationApplied,
  markPhoneBoothMigrationApplied,
  markQaLabMigrationApplied,
  markSmsBoothMigrationApplied,
  markServerRoomMigrationApplied,
  saveFurniture,
} from "@/features/retro-office/core/persistence";
import type {
  FurnitureItem,
  JanitorActor,
  OfficeAgent,
  QaLabStationLocation,
  RenderAgent,
  SceneActor,
} from "@/features/retro-office/core/types";
import type { NavGrid } from "@/features/retro-office/core/navigation";
import { AgentModel as AgentObjectModel } from "@/features/retro-office/objects/agents";
import {
  FurnitureModel as GenericFurnitureModel,
  InstancedFurnitureItems as InstancedFurnitureItemsModel,
  PlacementGhost as FurniturePlacementGhost,
} from "@/features/retro-office/objects/furniture";
import {
  DishwasherModel as KitchenDishwasherModel,
  MicrowaveModel as KitchenMicrowaveModel,
  SinkModel as KitchenSinkModel,
  StoveModel as KitchenStoveModel,
  VendingMachineModel as KitchenVendingMachineModel,
  WallCabinetModel as KitchenWallCabinetModel,
} from "@/features/retro-office/objects/kitchen";
import {
  AtmMachineModel as InteractiveAtmMachineModel,
  DeviceRackModel as InteractiveDeviceRackModel,
  DumbbellRackModel as InteractiveDumbbellRackModel,
  ExerciseBikeModel as InteractiveExerciseBikeModel,
  KettlebellRackModel as InteractiveKettlebellRackModel,
  PingPongTableModel as MachinePingPongTableModel,
  PhoneBoothModel as InteractivePhoneBoothModel,
  PunchingBagModel as InteractivePunchingBagModel,
  QaTerminalModel as InteractiveQaTerminalModel,
  RowingMachineModel as InteractiveRowingMachineModel,
  ServerRackModel as InteractiveServerRackModel,
  ServerTerminalModel as InteractiveServerTerminalModel,
  SmsBoothModel as InteractiveSmsBoothModel,
  TestBenchModel as InteractiveTestBenchModel,
  TreadmillModel as InteractiveTreadmillModel,
  WeightBenchModel as InteractiveWeightBenchModel,
  YogaMatModel as InteractiveYogaMatModel,
} from "@/features/retro-office/objects/machines";
import {
  ClockModel as PrimitiveClockModel,
  DoorModel as PrimitiveDoorModel,
  InstancedWallSegmentsModel as PrimitiveInstancedWallSegmentsModel,
  KeyboardModel as PrimitiveKeyboardModel,
  MouseModel as PrimitiveMouseModel,
  MugModel as PrimitiveMugModel,
  RoundTableModel as PrimitiveRoundTableModel,
  TrashCanModel as PrimitiveTrashCanModel,
  WallSegmentModel as PrimitiveWallSegmentModel,
} from "@/features/retro-office/objects/primitives";
import {
  FloorAndWalls as SceneFloorAndWalls,
  MemorialWallPictures as SceneMemorialWallPictures,
  type MemorialWallPortrait,
  WallPictures as SceneWallPictures,
} from "@/features/retro-office/scene/environment";
import {
  CAMERA_PRESETS as CAMERA_PRESET_MAP,
  CameraAnimator as CameraPresetAnimator,
  DayNightCycle as DayNightLighting,
  FollowCamController as FollowCamSystem,
} from "@/features/retro-office/systems/cameraLighting";
import {
  FloorRaycaster as SceneFloorRaycaster,
  GameLoop as SceneGameLoop,
  PingPongBall as ScenePingPongBall,
  SpotlightEffect as SceneSpotlightEffect,
} from "@/features/retro-office/systems/sceneRuntime";
import {
  DeskNameplates as DeskNameplateOverlay,
  HeatmapSystem as AgentHeatmapSystem,
  TrailSystem as AgentTrailSystem,
  WeatherOverlay as WeatherAmbientOverlay,
} from "@/features/retro-office/systems/visualSystems";
import type { OfficeCleaningCue } from "@/lib/office/janitorReset";
import { getZooSpeciesMeta } from "@/lib/office/catColony";
import {
  GARFIELD_COMPANION,
  GARFIELD_MEOW_LINES,
  GARFIELD_PET_AGENT_LINES,
  GARFIELD_PET_LINES,
  randomGarfieldIntervalMs,
  randomGarfieldMeowBurstCount,
  randomGarfieldMeowPauseMs,
  randomGarfieldPettingMeowIntervalMs,
  randomGarfieldSittingMeowIntervalMs,
} from "@/lib/office/garfield";
import {
  CAT_TOPIA_DEFAULT_SETTINGS,
  CAT_TOPIA_MAX_SPAWN_RATE_PER_HOUR,
  CAT_TOPIA_MAX_SESSION_CAT_CAP,
  CAT_TOPIA_MIN_SPAWN_RATE_PER_HOUR,
  CAT_TOPIA_MAIN_NAME_MAX_CHARS,
  CAT_TOPIA_MIN_SESSION_CAT_CAP,
  CAT_TOPIA_NAMING_CONVENTION_MAX_CHARS,
  CAT_TOPIA_NAMING_PRESETS,
  ZOO_SPECIES_OPTIONS,
  normalizeCatTopiaSettings,
  resolveCatCuddleProfile,
  type CatTopiaSettings,
  type ZooSpecies,
} from "@/lib/office/catTopia";

type OfficeDeskMonitorMap = Record<string, OfficeDeskMonitor>;
type RenderAgentUiSnapshot = Pick<RenderAgent, "state" | "status">;

type DragState =
  | { kind: "idle" }
  | { kind: "moving"; uid: string }
  | { kind: "placing"; itemType: string };

const SMS_CONTACT_SEED_NAMES = [
  "Avery",
  "Maya",
  "Theo",
  "Lena",
  "Miles",
  "Nina",
  "Owen",
  "Priya",
  "Marco",
  "Sofia",
  "Daniel",
  "Chloe",
  "Gabriel",
  "Zoe",
] as const;

const SPEECH_BUBBLE_TEXT_MAX_CHARS = 140;
const STATUS_FEED_TEXT_MAX_CHARS = 120;

const INTERNAL_SUBAGENT_EVENT_RE =
  /\[internal task completion event\]|\bsource:\s*subagent\b/i;

const extractRuntimeContextField = (value: string, field: string): string => {
  const escapedField = field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = value.match(new RegExp(`(?:^|\\n)${escapedField}:\\s*(.+)$`, "im"));
  return match?.[1]?.trim() ?? "";
};

const clampWithSentenceBoundary = (value: string, maxChars: number): string => {
  if (value.length <= maxChars) return value;
  const hardLimit = value.slice(0, maxChars - 1).trimEnd();
  const sentenceCut = Math.max(
    hardLimit.lastIndexOf(". "),
    hardLimit.lastIndexOf("! "),
    hardLimit.lastIndexOf("? "),
  );
  if (sentenceCut >= Math.floor(maxChars * 0.45)) {
    return `${hardLimit.slice(0, sentenceCut + 1).trimEnd()}…`;
  }
  const clauseCut = hardLimit.lastIndexOf("; ");
  if (clauseCut >= Math.floor(maxChars * 0.5)) {
    return `${hardLimit.slice(0, clauseCut + 1).trimEnd()}…`;
  }
  return `${hardLimit}…`;
};

const summarizeOrchestrationText = (value: string): string | null => {
  if (!INTERNAL_SUBAGENT_EVENT_RE.test(value)) return null;
  const status = extractRuntimeContextField(value, "status");
  const cleanTask =
    extractRuntimeContextField(value, "Clean Task") ||
    extractRuntimeContextField(value, "task");
  const sessionKey = extractRuntimeContextField(value, "session_key");
  const sourceAgentMatch = sessionKey.match(/^agent:([^:]+):/i);
  const sourceAgent = sourceAgentMatch?.[1]?.trim() ?? "";
  const statusLabel = status || "update received";
  const prefix = sourceAgent ? `Sub-agent ${sourceAgent}` : "Sub-agent";
  const summary = cleanTask
    ? `${prefix} ${statusLabel}. ${cleanTask}`
    : `${prefix} ${statusLabel}.`;
  return summary.replace(/\s+/g, " ").trim();
};

const clampOverlayText = (value: string, maxChars: number): string => {
  const orchestratedSummary = summarizeOrchestrationText(value);
  const compact = (orchestratedSummary ?? value).replace(/\s+/g, " ").trim();
  if (!compact) return "";
  return clampWithSentenceBoundary(compact, maxChars);
};

const normalizeSmsContactName = (value: string): string =>
  value.replace(/\s+/g, " ").trim() || "Joseph";

const buildSmsContactList = (
  recipient: string,
): { contacts: string[]; targetIndex: number } => {
  const normalizedRecipient = normalizeSmsContactName(recipient);
  const availableNames = SMS_CONTACT_SEED_NAMES.filter(
    (name) => name.toLowerCase() !== normalizedRecipient.toLowerCase(),
  );
  const recipientHash = [...normalizedRecipient].reduce(
    (total, character) => total + character.charCodeAt(0),
    0,
  );
  const beforeCount = 2 + (recipientHash % 3);
  const afterCount = 4;
  const contacts = [
    ...availableNames.slice(0, beforeCount),
    normalizedRecipient,
    ...availableNames.slice(beforeCount, beforeCount + afterCount),
  ];

  return {
    contacts,
    targetIndex: beforeCount,
  };
};

const GARFIELD_INTERACTION_DISTANCE = 36;
const CAT_TO_CAT_MIN_DISTANCE = AGENT_RADIUS * 1.45;
const CAT_TO_HUMAN_MIN_DISTANCE = AGENT_RADIUS * 1.7;
const CAT_COLLISION_NUDGE_DISTANCE = AGENT_RADIUS * 0.9;
const CAT_STALL_DISTANCE_THRESHOLD = 2.5;
const CAT_STALL_TIMEOUT_MS = 10_000;
const ANIMAL_PROXIMITY_LIMIT_MS = 9_000;
const ANIMAL_PROXIMITY_STILL_AFTER_MS = 10_000;
const ANIMAL_PROXIMITY_FORCE_SEPARATE_AFTER_MS = 14_000;
const ANIMAL_PAIR_PROXIMITY_COOLDOWN_MS = 16_000;
const ANIMAL_SEPARATION_COOLDOWN_MS = 20_000;
const ANIMAL_FORCE_APART_DISTANCE = AGENT_RADIUS * 6;
const SYNTHETIC_CAT_ID_PREFIX = "garfield-cat-";
const SYNTHETIC_ANIMAL_ID_PREFIX = "zootopia-animal-";
const GARFIELD_HOME_TARGET = {
  x: GARFIELD_COMPANION.home.x,
  y: GARFIELD_COMPANION.home.y,
  facing: GARFIELD_COMPANION.home.facing,
};
const GARFIELD_HOME_ROUTE = {
  key: "home",
  approachX: GARFIELD_HOME_TARGET.x,
  approachY: GARFIELD_HOME_TARGET.y,
  targetX: GARFIELD_HOME_TARGET.x,
  targetY: GARFIELD_HOME_TARGET.y,
  facing: GARFIELD_HOME_TARGET.facing,
  elevation: 0,
};
const CAT_PERCHABLE_ITEM_TYPES = new Set([
  "couch",
  "couch_v",
  "round_table",
  "table_rect",
  "pingpong",
]);
const GARFIELD_PERCH_ELEVATION_BY_TYPE: Record<string, number> = {
  couch: 0.08,
  couch_v: 0.08,
  round_table: 0.12,
  table_rect: 0.1,
  pingpong: 0.14,
};
const GARFIELD_PERCH_LOCAL_OFFSET_BY_TYPE: Record<
  string,
  { x: number; y: number }
> = {
  // Bias toward cushion center instead of strict geometric center.
  couch: { x: 0, y: 4 },
  couch_v: { x: 0, y: 6 },
  pingpong: { x: 0, y: 0 },
  round_table: { x: 0, y: 0 },
  table_rect: { x: 0, y: 0 },
};
const GARFIELD_PERCH_APPROACH_MARGIN_BY_TYPE: Record<string, number> = {
  couch: 26,
  couch_v: 26,
  round_table: 26,
  table_rect: 24,
  pingpong: 28,
};

type GarfieldCompanionTarget = {
  key: string;
  approachX: number;
  approachY: number;
  targetX: number;
  targetY: number;
  facing: number;
  elevation: number;
};

type GarfieldMeowBurstState = {
  remaining: number;
  nextAt: number;
};

const pickRandomLine = (lines: readonly string[], fallback: string): string => {
  if (!Array.isArray(lines) || lines.length === 0) return fallback;
  return lines[Math.floor(Math.random() * lines.length)] ?? fallback;
};

const hashAgentId = (agentId: string): number =>
  [...agentId].reduce((total, character) => total + character.charCodeAt(0), 0);

const isAnimalActor = (agent: unknown): boolean =>
  Boolean(
    agent &&
      typeof agent === "object" &&
      "avatarKind" in agent &&
      ((agent as { avatarKind?: string }).avatarKind === "cat" ||
        (agent as { avatarKind?: string }).avatarKind === "animal"),
  );

const clampCanvasPoint = (x: number, y: number) => ({
  x: Math.max(SNAP_GRID, Math.min(CANVAS_W - SNAP_GRID, Math.round(x))),
  y: Math.max(SNAP_GRID, Math.min(CANVAS_H - SNAP_GRID, Math.round(y))),
});

const clampCanvasFloatPoint = (x: number, y: number) => ({
  x: Math.max(SNAP_GRID, Math.min(CANVAS_W - SNAP_GRID, x)),
  y: Math.max(SNAP_GRID, Math.min(CANVAS_H - SNAP_GRID, y)),
});

const resolveFacingTowards = (
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
) => Math.atan2(toX - fromX, toY - fromY);

const resolveCatPerchRoutePoint = (
  target: GarfieldCompanionTarget,
  stage: "approach" | "climb" | "perched",
) =>
  stage === "approach"
    ? { x: target.approachX, y: target.approachY }
    : { x: target.targetX, y: target.targetY };

const resolveCatLoungeTarget = (
  agentId: string,
  anchor: { targetX: number; targetY: number },
  interactionDistance = GARFIELD_INTERACTION_DISTANCE,
) => {
  const hash = hashAgentId(agentId);
  const angle = (hash % 360) * (Math.PI / 180);
  const rawX = anchor.targetX + Math.cos(angle) * interactionDistance;
  const rawY = anchor.targetY + Math.sin(angle) * interactionDistance;
  const point = clampCanvasPoint(rawX, rawY);
  return {
    targetX: point.x,
    targetY: point.y,
    facing: resolveFacingTowards(
      point.x,
      point.y,
      anchor.targetX,
      anchor.targetY,
    ),
  };
};

const buildFloorCatRouteTarget = (
  key: string,
  x: number,
  y: number,
  facing = GARFIELD_HOME_TARGET.facing,
): GarfieldCompanionTarget => {
  const point = clampCanvasPoint(x, y);
  return {
    key,
    approachX: point.x,
    approachY: point.y,
    targetX: point.x,
    targetY: point.y,
    facing,
    elevation: 0,
  };
};

const buildCuddleVariantTarget = (
  baseTarget: GarfieldCompanionTarget,
  catId: string,
): GarfieldCompanionTarget => {
  const hash = hashAgentId(`${catId}:${baseTarget.key}`);
  const angle = (hash % 360) * (Math.PI / 180);
  const radius = 14 + (hash % 14);
  const target = clampCanvasPoint(
    baseTarget.targetX + Math.cos(angle) * radius,
    baseTarget.targetY + Math.sin(angle) * radius,
  );
  const approach = clampCanvasPoint(
    baseTarget.approachX + Math.cos(angle) * Math.max(8, radius - 6),
    baseTarget.approachY + Math.sin(angle) * Math.max(8, radius - 6),
  );
  return {
    key: `${baseTarget.key}:cuddle:${hash % 97}`,
    approachX: approach.x,
    approachY: approach.y,
    targetX: target.x,
    targetY: target.y,
    facing: resolveFacingTowards(
      target.x,
      target.y,
      baseTarget.targetX,
      baseTarget.targetY,
    ),
    elevation: baseTarget.elevation,
  };
};

const resolveGarfieldPerchTargets = (
  furniture: FurnitureItem[],
): GarfieldCompanionTarget[] => {
  const targets: GarfieldCompanionTarget[] = [];
  for (const item of furniture) {
    const itemType = resolveItemTypeKey(item);
    if (!CAT_PERCHABLE_ITEM_TYPES.has(itemType)) continue;
    const { width, height } = getItemBaseSize(item);
    const rotation = getItemRotationRadians(item);
    const localOffset = GARFIELD_PERCH_LOCAL_OFFSET_BY_TYPE[itemType] ?? {
      x: 0,
      y: 0,
    };
    const rotatedOffsetX =
      localOffset.x * Math.cos(rotation) - localOffset.y * Math.sin(rotation);
    const rotatedOffsetY =
      localOffset.x * Math.sin(rotation) + localOffset.y * Math.cos(rotation);
    const point = clampCanvasPoint(
      item.x + width / 2 + rotatedOffsetX,
      item.y + height / 2 + rotatedOffsetY,
    );
    const approachMargin =
      GARFIELD_PERCH_APPROACH_MARGIN_BY_TYPE[itemType] ?? 24;
    // Approach from the "front" side first so cat walks up to the object edge
    // before climbing onto the surface.
    const frontLocalOffset = {
      x: 0,
      y: height / 2 + approachMargin,
    };
    const approachOffsetX =
      frontLocalOffset.x * Math.cos(rotation) -
      frontLocalOffset.y * Math.sin(rotation);
    const approachOffsetY =
      frontLocalOffset.x * Math.sin(rotation) +
      frontLocalOffset.y * Math.cos(rotation);
    const approachPoint = clampCanvasPoint(
      item.x + width / 2 + approachOffsetX,
      item.y + height / 2 + approachOffsetY,
    );
    targets.push({
      key: `furniture:${item._uid}`,
      approachX: approachPoint.x,
      approachY: approachPoint.y,
      targetX: point.x,
      targetY: point.y,
      facing:
        typeof item.facing === "number" && Number.isFinite(item.facing)
          ? getItemRotationRadians(item)
          : GARFIELD_HOME_TARGET.facing,
      elevation: GARFIELD_PERCH_ELEVATION_BY_TYPE[itemType] ?? 0.1,
    });
  }
  return targets;
};

const buildInitialOfficeFurniture = (): FurnitureItem[] =>
  ensureOfficeQaLab(
    ensureOfficeGymRoom(
      ensureOfficeServerRoom(
        ensureOfficePhoneBooth(
          ensureOfficeSmsBooth(
            ensureOfficeAtm(
              ensureOfficePingPongTable(
                (loadFurniture() ?? materializeDefaults()).filter(
                  (item) => !isRetiredPingPongLamp(item),
                ),
              ),
            ),
          ),
        ),
      ),
    ),
  );

type PaletteEntry = {
  type: string;
  label: string;
  icon: string;
  defaults: Partial<FurnitureItem>;
};

// ============================================================
// LAYOUT DATA
// ============================================================

const PALETTE: PaletteEntry[] = [
  {
    type: "wall",
    label: "Wall",
    icon: "🧱",
    defaults: { w: 80, h: WALL_THICKNESS },
  },
  {
    type: "door",
    label: "Door",
    icon: "🚪",
    defaults: { w: DOOR_LENGTH, h: DOOR_THICKNESS, facing: 0 },
  },
  {
    type: "desk_cubicle",
    label: "Desk",
    icon: "🖥️",
    defaults: { w: 100, h: 55 },
  },
  { type: "chair", label: "Chair", icon: "🪑", defaults: { facing: 0 } },
  {
    type: "round_table",
    label: "Round Table",
    icon: "⭕",
    defaults: { r: 60 },
  },
  {
    type: "executive_desk",
    label: "Exec Desk",
    icon: "📋",
    defaults: { w: 130, h: 65 },
  },
  { type: "couch", label: "Couch", icon: "🛋️", defaults: { w: 100, h: 40 } },
  {
    type: "couch_v",
    label: "Couch (V)",
    icon: "🛋️",
    defaults: { w: 40, h: 80, vertical: true },
  },
  {
    type: "bookshelf",
    label: "Bookshelf",
    icon: "📚",
    defaults: { w: 80, h: 120 },
  },
  { type: "plant", label: "Plant", icon: "🪴", defaults: {} },
  {
    type: "beanbag",
    label: "Beanbag",
    icon: "🟠",
    defaults: { color: "#e65100" },
  },
  {
    type: "pingpong",
    label: "Ping Pong",
    icon: "🏓",
    defaults: { w: 100, h: 60 },
  },
  {
    type: "table_rect",
    label: "Table",
    icon: "🟫",
    defaults: { w: 80, h: 40 },
  },
  { type: "coffee_machine", label: "Coffee", icon: "☕", defaults: {} },
  { type: "fridge", label: "Fridge", icon: "🧊", defaults: { w: 40, h: 80 } },
  { type: "water_cooler", label: "Water", icon: "💧", defaults: {} },
  { type: "atm", label: "ATM", icon: "🏧", defaults: { facing: 270 } },
  {
    type: "whiteboard",
    label: "Whiteboard",
    icon: "📝",
    defaults: { w: 10, h: 60 },
  },
  {
    type: "cabinet",
    label: "Cabinet",
    icon: "🗄️",
    defaults: { w: 200, h: 40 },
  },
  {
    type: "dishwasher",
    label: "Dishwasher",
    icon: "🧼",
    defaults: { w: 40, h: 40 },
  },
  {
    type: "stove",
    label: "Stove",
    icon: "🍳",
    defaults: { w: 40, h: 40 },
  },
  {
    type: "microwave",
    label: "Microwave",
    icon: "⏲️",
    defaults: { w: 30, h: 20 },
  },
  {
    type: "wall_cabinet",
    label: "Wall Cabinet",
    icon: "🗄️",
    defaults: { w: 80, h: 20, elevation: 0.9 },
  },
  { type: "computer", label: "Computer", icon: "🖥️", defaults: {} },
  { type: "lamp", label: "Lamp", icon: "💡", defaults: {} },
];

// ============================================================
// CAMERA SETUP — sets lookAt after mount
// ============================================================

function CameraRig() {
  const { camera } = useThree();
  useEffect(() => {
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }, [camera]);
  return null;
}

function AdaptiveDprController() {
  const { gl, setDpr } = useThree();
  const currentDprRef = useRef(1.25);
  const frameCounterRef = useRef(0);
  const avgDeltaRef = useRef(1 / 60);

  useEffect(() => {
    const initialDpr = Math.min(window.devicePixelRatio || 1, 1.5);
    currentDprRef.current = initialDpr;
    setDpr(initialDpr);
    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") {
        currentDprRef.current = 0.85;
        setDpr(0.85);
        return;
      }
      const restoredDpr = Math.min(window.devicePixelRatio || 1, 1.5);
      currentDprRef.current = restoredDpr;
      setDpr(restoredDpr);
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [setDpr]);

  useFrame((_, delta) => {
    if (document.visibilityState !== "visible") return;
    avgDeltaRef.current = avgDeltaRef.current * 0.92 + delta * 0.08;
    frameCounterRef.current += 1;
    if (frameCounterRef.current < 45) return;
    frameCounterRef.current = 0;

    const maxDpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const minDpr = 0.85;
    let nextDpr = currentDprRef.current;
    if (avgDeltaRef.current > 1 / 42) {
      nextDpr = Math.max(minDpr, currentDprRef.current - 0.1);
    } else if (avgDeltaRef.current < 1 / 57) {
      nextDpr = Math.min(maxDpr, currentDprRef.current + 0.05);
    }
    if (Math.abs(nextDpr - currentDprRef.current) < 0.025) return;
    currentDprRef.current = nextDpr;
    setDpr(Number(nextDpr.toFixed(2)));
    gl.info.reset();
  });

  return null;
}

// Asset model definitions live in `src/features/retro-office/objects`.

// ============================================================
// AGENT TICK HOOK — pure-ref, zero React re-renders per frame
// ============================================================

// `useAgentTick()` is the scene-side consumer of derived office state. Upstream modules decide
// which room an agent should prefer; this hook turns those holds plus authored furniture into
// concrete targets, paths, and per-frame actor motion.
function useAgentTick(
  agents: SceneActor[],
  deskLocations: { x: number; y: number }[],
  assignedDeskIndexByAgentId: Record<string, number> = {},
  gymWorkoutLocations: {
    x: number;
    y: number;
    facing: number;
    workoutStyle: "run" | "lift" | "bike" | "box" | "row" | "stretch";
  }[],
  qaLabStations: QaLabStationLocation[],
  meetingSeatLocations: { x: number; y: number; facing: number }[],
  furnitureRef: React.RefObject<FurnitureItem[]>,
  lastSeenByAgentId: Record<string, number> = {},
  deskHoldByAgentId: Record<string, boolean> = {},
  gymHoldByAgentId: Record<string, boolean> = {},
  catHoldByAgentId: Record<string, boolean> = {},
  smsBoothHoldByAgentId: Record<string, boolean> = {},
  phoneBoothHoldByAgentId: Record<string, boolean> = {},
  qaHoldByAgentId: Record<string, boolean> = {},
  githubReviewByAgentId: Record<string, boolean> = {},
  catCompanionTargetByAgentId: Record<string, GarfieldCompanionTarget> = {},
  catMovementPausedByAgentId: Record<string, boolean> = {},
  standupMeeting: StandupMeeting | null = null,
  catCuddleLevel: CatTopiaSettings["catCuddleLevel"] = "normal",
) {
  const renderAgentsRef = useRef<RenderAgent[]>([]);
  const renderAgentLookupRef = useRef<Map<string, RenderAgent>>(new Map());
  const cuddleProfile = useMemo(
    () => resolveCatCuddleProfile(catCuddleLevel),
    [catCuddleLevel],
  );
  const catLoungeInteractionDistance =
    GARFIELD_INTERACTION_DISTANCE * cuddleProfile.interactionDistanceScale;
  const catToCatMinDistance =
    CAT_TO_CAT_MIN_DISTANCE * cuddleProfile.catSpacingScale;
  const catToHumanMinDistance =
    CAT_TO_HUMAN_MIN_DISTANCE * cuddleProfile.humanSpacingScale;
  const catCollisionNudgeDistance =
    CAT_COLLISION_NUDGE_DISTANCE * cuddleProfile.nudgeScale;
  const deskByAgentRef = useRef<Map<string, number>>(new Map());
  const gymByAgentRef = useRef<Map<string, number>>(new Map());
  const qaByAgentRef = useRef<Map<string, number>>(new Map());
  const stickyUntilRef = useRef<Map<string, number>>(new Map());
  const nextGymRef = useRef(0);
  const nextQaRef = useRef(0);

  // Nav grid is rebuilt lazily whenever the furniture array reference changes.
  const navGridRef = useRef<NavGrid | null>(null);
  const gridSourceRef = useRef<FurnitureItem[]>([]);

  const getNavGrid = useCallback((): NavGrid => {
    const furniture = furnitureRef.current ?? [];
    if (navGridRef.current === null || gridSourceRef.current !== furniture) {
      navGridRef.current = buildNavGrid(furniture);
      gridSourceRef.current = furniture;
    }
    return navGridRef.current;
  }, [furnitureRef]);

  const planPath = useCallback(
    (fx: number, fy: number, tx: number, ty: number) =>
      astar(fx, fy, tx, ty, getNavGrid()),
    [getNavGrid],
  );

  const standupActive =
    standupMeeting?.phase === "gathering" ||
    standupMeeting?.phase === "in_progress";
  const meetingParticipants = useMemo(
    () =>
      new Set(standupActive ? (standupMeeting?.participantOrder ?? []) : []),
    [standupActive, standupMeeting?.participantOrder],
  );
  const resolveMeetingTarget = useCallback(
    (agentId: string) => {
      const participantOrder = standupMeeting?.participantOrder ?? [];
      const targetIndex = participantOrder.indexOf(agentId);
      const seats = [...meetingSeatLocations, ...MEETING_OVERFLOW_LOCATIONS];
      const fallbackSeat = seats[0] ?? { x: 145, y: 118, facing: Math.PI };
      if (targetIndex < 0) return fallbackSeat;
      return seats[targetIndex] ?? fallbackSeat;
    },
    [meetingSeatLocations, standupMeeting?.participantOrder],
  );

  useEffect(() => {
    const activeIds = new Set(agents.map((a) => a.id));
    for (const id of deskByAgentRef.current.keys())
      if (!activeIds.has(id)) deskByAgentRef.current.delete(id);
    for (const id of gymByAgentRef.current.keys())
      if (!activeIds.has(id)) gymByAgentRef.current.delete(id);
    for (const id of qaByAgentRef.current.keys())
      if (!activeIds.has(id)) qaByAgentRef.current.delete(id);
    for (const id of stickyUntilRef.current.keys())
      if (!activeIds.has(id)) stickyUntilRef.current.delete(id);

    const currentMap = new Map(renderAgentsRef.current.map((a) => [a.id, a]));
    const next: RenderAgent[] = [];

    agents.forEach((agent, idx) => {
      const now = Date.now();
      const existing = currentMap.get(agent.id);
      const isJanitor = "role" in agent && agent.role === "janitor";
      if (isJanitor) {
        const route = agent.janitorRoute;
        const spawn = route[0] ?? { x: 400, y: 400, facing: Math.PI / 2 };
        const initialRouteIndex = route.length > 1 ? 1 : 0;
        const initialTarget = route[initialRouteIndex] ?? spawn;
        if (existing) {
          next.push({
            ...existing,
            ...agent,
            targetX: existing.targetX,
            targetY: existing.targetY,
            janitorRouteIndex: existing.janitorRouteIndex ?? initialRouteIndex,
            janitorPauseUntil: existing.janitorPauseUntil,
          } as RenderAgent);
          return;
        }
        next.push({
          ...agent,
          x: spawn.x,
          y: spawn.y,
          targetX: initialTarget.x,
          targetY: initialTarget.y,
          path:
            initialRouteIndex === 0
              ? []
              : planPath(spawn.x, spawn.y, initialTarget.x, initialTarget.y),
          frame: 0,
          walkSpeed: WALK_SPEED * 0.82,
          phaseOffset: Math.random() * Math.PI * 2,
          state: initialRouteIndex === 0 ? "standing" : "walking",
          facing: spawn.facing,
          janitorRouteIndex: initialRouteIndex,
        } as RenderAgent);
        return;
      }
      const assignedDeskIndex = assignedDeskIndexByAgentId[agent.id];
      if (
        typeof assignedDeskIndex === "number" &&
        assignedDeskIndex >= 0 &&
        assignedDeskIndex < Math.max(deskLocations.length, 1)
      ) {
        deskByAgentRef.current.set(agent.id, assignedDeskIndex);
      } else {
        deskByAgentRef.current.delete(agent.id);
      }
      if (!gymByAgentRef.current.has(agent.id)) {
        gymByAgentRef.current.set(
          agent.id,
          nextGymRef.current % Math.max(gymWorkoutLocations.length, 1),
        );
        nextGymRef.current += 1;
      }
      if (!qaByAgentRef.current.has(agent.id)) {
        qaByAgentRef.current.set(
          agent.id,
          nextQaRef.current % Math.max(qaLabStations.length, 1),
        );
        nextQaRef.current += 1;
      }
      const explicitMeetingHold =
        standupActive && meetingParticipants.has(agent.id);
      const meetingTarget = explicitMeetingHold
        ? resolveMeetingTarget(agent.id)
        : null;
      const explicitDeskHold = Boolean(deskHoldByAgentId[agent.id]);
      const explicitGymHold = Boolean(gymHoldByAgentId[agent.id]);
      const explicitSmsBoothHold = Boolean(smsBoothHoldByAgentId[agent.id]);
      const explicitPhoneBoothHold = Boolean(phoneBoothHoldByAgentId[agent.id]);
      const explicitQaHold = Boolean(qaHoldByAgentId[agent.id]);
      const explicitGithubHold = Boolean(githubReviewByAgentId[agent.id]);
      const isCatCompanion =
        "avatarKind" in agent &&
        (agent.avatarKind === "cat" || agent.avatarKind === "animal");
      const hasHighPriorityHold =
        explicitGymHold ||
        explicitSmsBoothHold ||
        explicitPhoneBoothHold ||
        explicitQaHold ||
        explicitGithubHold;
      const explicitCatHold =
        !isCatCompanion &&
        !explicitMeetingHold &&
        !hasHighPriorityHold &&
        Boolean(catHoldByAgentId[agent.id]);
      const catPatrolTarget = isCatCompanion
        ? (catCompanionTargetByAgentId[agent.id] ?? GARFIELD_HOME_ROUTE)
        : null;
      const catPatrolTargetSafe = catPatrolTarget ?? GARFIELD_HOME_ROUTE;
      const explicitCatCompanionPatrol =
        isCatCompanion &&
        !Boolean(catMovementPausedByAgentId[agent.id]) &&
        Boolean(catPatrolTarget);
      const explicitCatCompanionPausedByPet =
        isCatCompanion && Boolean(catMovementPausedByAgentId[agent.id]);
      const explicitCatCompanionHomeHold =
        isCatCompanion &&
        !explicitMeetingHold &&
        !hasHighPriorityHold &&
        !explicitCatCompanionPatrol &&
        !explicitCatCompanionPausedByPet;
      if (
        explicitGymHold &&
        gymWorkoutLocations.length > 0 &&
        existing?.interactionTarget !== "gym"
      ) {
        gymByAgentRef.current.set(
          agent.id,
          nextGymRef.current % Math.max(gymWorkoutLocations.length, 1),
        );
        nextGymRef.current += 1;
      }
      if (
        explicitQaHold &&
        qaLabStations.length > 0 &&
        existing?.interactionTarget !== "qa_lab"
      ) {
        qaByAgentRef.current.set(
          agent.id,
          nextQaRef.current % Math.max(qaLabStations.length, 1),
        );
        nextQaRef.current += 1;
      }
      const deskIdx = deskByAgentRef.current.get(agent.id);
      const gymIdx =
        gymByAgentRef.current.get(agent.id) ??
        idx % Math.max(gymWorkoutLocations.length, 1);
      const qaIdx =
        qaByAgentRef.current.get(agent.id) ??
        idx % Math.max(qaLabStations.length, 1);
      const deskPos =
        typeof deskIdx === "number" ? (deskLocations[deskIdx] ?? null) : null;
      // Unassigned agents intentionally have no synthetic desk fallback. Desk routing is now
      // driven by persisted workspace assignments instead of sequential scene-local ownership.
      if (!deskPos) {
        stickyUntilRef.current.delete(agent.id);
      }
      const gymWorkoutPos = gymWorkoutLocations[gymIdx] ?? GYM_DEFAULT_TARGET;
      const qaStationPos = qaLabStations[qaIdx] ?? {
        ...QA_LAB_DEFAULT_TARGET,
        stationType: "console" as const,
      };
      const smsBoothItem =
        (furnitureRef.current ?? []).find((item) => item.type === "sms_booth") ??
        null;
      const phoneBoothItem =
        (furnitureRef.current ?? []).find((item) => item.type === "phone_booth") ??
        null;
      const currentGarfieldActor =
        currentMap.get(GARFIELD_COMPANION.agentId) ?? null;
      const availableCatAnchors = [...currentMap.values(), ...next].filter(
        (candidate) =>
          "avatarKind" in candidate &&
          (candidate.avatarKind === "cat" || candidate.avatarKind === "animal"),
      );
      const loungeOriginX = existing?.x ?? GARFIELD_HOME_ROUTE.targetX;
      const loungeOriginY = existing?.y ?? GARFIELD_HOME_ROUTE.targetY;
      let catLoungeAnchor = GARFIELD_HOME_ROUTE;
      if (availableCatAnchors.length > 0) {
        let nearestCat = availableCatAnchors[0];
        let nearestDistance = Math.hypot(
          nearestCat.x - loungeOriginX,
          nearestCat.y - loungeOriginY,
        );
        for (const candidateCat of availableCatAnchors) {
          const distance = Math.hypot(
            candidateCat.x - loungeOriginX,
            candidateCat.y - loungeOriginY,
          );
          if (distance < nearestDistance) {
            nearestDistance = distance;
            nearestCat = candidateCat;
          }
        }
        catLoungeAnchor = {
          targetX: nearestCat.x,
          targetY: nearestCat.y,
          facing: nearestCat.facing,
          key: `anchor:${nearestCat.id}`,
          approachX: nearestCat.x,
          approachY: nearestCat.y,
          elevation: nearestCat.elevationOffset ?? 0,
        };
      } else if (catPatrolTarget) {
        catLoungeAnchor = catPatrolTargetSafe;
      } else if (currentGarfieldActor) {
        catLoungeAnchor = {
          targetX: currentGarfieldActor.x,
          targetY: currentGarfieldActor.y,
          facing: currentGarfieldActor.facing,
          key: "anchor:garfield",
          approachX: currentGarfieldActor.x,
          approachY: currentGarfieldActor.y,
          elevation: currentGarfieldActor.elevationOffset ?? 0,
        };
      }
      const catLoungeRoute = resolveCatLoungeTarget(
        agent.id,
        catLoungeAnchor,
        catLoungeInteractionDistance,
      );

      if (agent.status === "working" && !explicitDeskHold && deskPos)
        stickyUntilRef.current.set(agent.id, now + DESK_STICKY_MS);
      const stickyUntil = stickyUntilRef.current.get(agent.id) ?? 0;
      const effectiveStatus: OfficeAgent["status"] =
        agent.status === "error"
          ? "error"
          : explicitMeetingHold ||
              explicitDeskHold ||
              explicitGymHold ||
              explicitSmsBoothHold ||
              explicitPhoneBoothHold ||
              explicitQaHold ||
              explicitGithubHold ||
              explicitCatHold ||
              explicitCatCompanionPatrol ||
              explicitCatCompanionPausedByPet ||
              explicitCatCompanionHomeHold ||
              agent.status === "working" ||
              stickyUntil > now
            ? "working"
            : "idle";

      let ns: Partial<RenderAgent> = {};
      if (existing) {
        ns = { ...existing };
        if (isCatCompanion) {
          const activityMultiplier =
            "activityMultiplier" in agent ? agent.activityMultiplier : undefined;
          ns.walkSpeed =
            WALK_SPEED *
            Math.max(0.5, Math.min(1.5, activityMultiplier ?? 1));
        }
        if (!isCatCompanion) {
          ns.elevationOffset = undefined;
          ns.catPerchStage = undefined;
          ns.catPerchKey = undefined;
        }
        if (explicitMeetingHold && meetingTarget) {
          ns.pingPongUntil = undefined;
          ns.pingPongTargetX = undefined;
          ns.pingPongTargetY = undefined;
          ns.pingPongFacing = undefined;
          ns.pingPongPartnerId = undefined;
          ns.pingPongTableUid = undefined;
          ns.pingPongSide = undefined;
          ns.walkSpeed =
            existing.pingPongPreviousWalkSpeed ?? existing.walkSpeed;
          ns.pingPongPreviousWalkSpeed = undefined;
          ns.interactionTarget = "meeting_room";
          ns.phoneBoothStage = undefined;
          ns.serverRoomStage = undefined;
          ns.gymStage = undefined;
          ns.qaLabStage = undefined;
          ns.qaLabStationType = undefined;
          ns.workoutStyle = undefined;
          const targetChanged =
            existing.targetX !== meetingTarget.x ||
            existing.targetY !== meetingTarget.y ||
            existing.interactionTarget !== "meeting_room";
          ns.targetX = meetingTarget.x;
          ns.targetY = meetingTarget.y;
          if (targetChanged) {
            ns.path = planPath(
              existing.x,
              existing.y,
              meetingTarget.x,
              meetingTarget.y,
            );
          }
          ns.state =
            Math.hypot(
              existing.x - meetingTarget.x,
              existing.y - meetingTarget.y,
            ) < 15
              ? "sitting"
              : "walking";
          ns.facing = meetingTarget.facing;
        } else if (explicitGymHold) {
          const gymRoute = resolveGymRoute(
            existing.x,
            existing.y,
            gymWorkoutPos,
          );
          ns.pingPongUntil = undefined;
          ns.pingPongTargetX = undefined;
          ns.pingPongTargetY = undefined;
          ns.pingPongFacing = undefined;
          ns.pingPongPartnerId = undefined;
          ns.pingPongTableUid = undefined;
          ns.pingPongSide = undefined;
          ns.walkSpeed =
            existing.pingPongPreviousWalkSpeed ?? existing.walkSpeed;
          ns.pingPongPreviousWalkSpeed = undefined;
          ns.interactionTarget = "gym";
          ns.phoneBoothStage = undefined;
          ns.serverRoomStage = undefined;
          ns.gymStage = gymRoute.stage;
          ns.qaLabStage = undefined;
          ns.qaLabStationType = undefined;
          ns.workoutStyle = gymWorkoutPos.workoutStyle;
          const targetChanged =
            existing.targetX !== gymRoute.targetX ||
            existing.targetY !== gymRoute.targetY ||
            existing.gymStage !== gymRoute.stage;
          ns.targetX = gymRoute.targetX;
          ns.targetY = gymRoute.targetY;
          if (targetChanged) {
            ns.path = planPath(
              existing.x,
              existing.y,
              gymRoute.targetX,
              gymRoute.targetY,
            );
          }
          ns.state =
            Math.hypot(
              existing.x - gymRoute.targetX,
              existing.y - gymRoute.targetY,
            ) < 15
              ? gymRoute.stage === "workout"
                ? "working_out"
                : "standing"
              : "walking";
          ns.facing = gymRoute.facing;
        } else if (explicitQaHold) {
          const qaLabRoute = resolveQaLabRoute(
            existing.x,
            existing.y,
            qaStationPos,
          );
          ns.pingPongUntil = undefined;
          ns.pingPongTargetX = undefined;
          ns.pingPongTargetY = undefined;
          ns.pingPongFacing = undefined;
          ns.pingPongPartnerId = undefined;
          ns.pingPongTableUid = undefined;
          ns.pingPongSide = undefined;
          ns.walkSpeed =
            existing.pingPongPreviousWalkSpeed ?? existing.walkSpeed;
          ns.pingPongPreviousWalkSpeed = undefined;
          ns.interactionTarget = "qa_lab";
          ns.phoneBoothStage = undefined;
          ns.serverRoomStage = undefined;
          ns.gymStage = undefined;
          ns.qaLabStage = qaLabRoute.stage;
          ns.qaLabStationType = qaStationPos.stationType;
          ns.workoutStyle = undefined;
          const targetChanged =
            existing.targetX !== qaLabRoute.targetX ||
            existing.targetY !== qaLabRoute.targetY ||
            existing.qaLabStage !== qaLabRoute.stage;
          ns.targetX = qaLabRoute.targetX;
          ns.targetY = qaLabRoute.targetY;
          if (targetChanged) {
            ns.path = planPath(
              existing.x,
              existing.y,
              qaLabRoute.targetX,
              qaLabRoute.targetY,
            );
          }
          ns.state =
            Math.hypot(
              existing.x - qaLabRoute.targetX,
              existing.y - qaLabRoute.targetY,
            ) < 15
              ? "standing"
              : "walking";
          ns.facing = qaLabRoute.facing;
        } else if (explicitGithubHold) {
          const serverRoomRoute = resolveServerRoomRoute(
            existing.x,
            existing.y,
          );
          ns.pingPongUntil = undefined;
          ns.pingPongTargetX = undefined;
          ns.pingPongTargetY = undefined;
          ns.pingPongFacing = undefined;
          ns.pingPongPartnerId = undefined;
          ns.pingPongTableUid = undefined;
          ns.pingPongSide = undefined;
          ns.walkSpeed =
            existing.pingPongPreviousWalkSpeed ?? existing.walkSpeed;
          ns.pingPongPreviousWalkSpeed = undefined;
          ns.interactionTarget = "server_room";
          ns.phoneBoothStage = undefined;
          ns.serverRoomStage = serverRoomRoute.stage;
          ns.gymStage = undefined;
          ns.qaLabStage = undefined;
          ns.qaLabStationType = undefined;
          ns.workoutStyle = undefined;
          const targetChanged =
            existing.targetX !== serverRoomRoute.targetX ||
            existing.targetY !== serverRoomRoute.targetY ||
            existing.serverRoomStage !== serverRoomRoute.stage;
          ns.targetX = serverRoomRoute.targetX;
          ns.targetY = serverRoomRoute.targetY;
          if (targetChanged) {
            ns.path = planPath(
              existing.x,
              existing.y,
              serverRoomRoute.targetX,
              serverRoomRoute.targetY,
            );
          }
          ns.state =
            Math.hypot(
              existing.x - serverRoomRoute.targetX,
              existing.y - serverRoomRoute.targetY,
            ) < 15
              ? "standing"
              : "walking";
          ns.facing = serverRoomRoute.facing;
        } else if (explicitSmsBoothHold) {
          const smsBoothRoute = resolveSmsBoothRoute(
            smsBoothItem,
            existing.x,
            existing.y,
          );
          ns.pingPongUntil = undefined;
          ns.pingPongTargetX = undefined;
          ns.pingPongTargetY = undefined;
          ns.pingPongFacing = undefined;
          ns.pingPongPartnerId = undefined;
          ns.pingPongTableUid = undefined;
          ns.pingPongSide = undefined;
          ns.walkSpeed =
            existing.pingPongPreviousWalkSpeed ?? existing.walkSpeed;
          ns.pingPongPreviousWalkSpeed = undefined;
          ns.interactionTarget = "sms_booth";
          ns.smsBoothStage = smsBoothRoute.stage;
          ns.phoneBoothStage = undefined;
          ns.serverRoomStage = undefined;
          ns.gymStage = undefined;
          ns.qaLabStage = undefined;
          ns.qaLabStationType = undefined;
          ns.workoutStyle = undefined;
          const targetChanged =
            existing.targetX !== smsBoothRoute.targetX ||
            existing.targetY !== smsBoothRoute.targetY ||
            existing.smsBoothStage !== smsBoothRoute.stage;
          ns.targetX = smsBoothRoute.targetX;
          ns.targetY = smsBoothRoute.targetY;
          if (targetChanged) {
            ns.path = planPath(
              existing.x,
              existing.y,
              smsBoothRoute.targetX,
              smsBoothRoute.targetY,
            );
          }
          ns.state =
            Math.hypot(
              existing.x - smsBoothRoute.targetX,
              existing.y - smsBoothRoute.targetY,
            ) < 15
              ? "standing"
              : "walking";
          ns.facing = smsBoothRoute.facing;
        } else if (explicitPhoneBoothHold) {
          const phoneBoothRoute = resolvePhoneBoothRoute(
            phoneBoothItem,
            existing.x,
            existing.y,
          );
          ns.pingPongUntil = undefined;
          ns.pingPongTargetX = undefined;
          ns.pingPongTargetY = undefined;
          ns.pingPongFacing = undefined;
          ns.pingPongPartnerId = undefined;
          ns.pingPongTableUid = undefined;
          ns.pingPongSide = undefined;
          ns.walkSpeed =
            existing.pingPongPreviousWalkSpeed ?? existing.walkSpeed;
          ns.pingPongPreviousWalkSpeed = undefined;
          ns.interactionTarget = "phone_booth";
          ns.phoneBoothStage = phoneBoothRoute.stage;
          ns.serverRoomStage = undefined;
          ns.gymStage = undefined;
          ns.qaLabStage = undefined;
          ns.qaLabStationType = undefined;
          ns.workoutStyle = undefined;
          const targetChanged =
            existing.targetX !== phoneBoothRoute.targetX ||
            existing.targetY !== phoneBoothRoute.targetY ||
            existing.phoneBoothStage !== phoneBoothRoute.stage;
          ns.targetX = phoneBoothRoute.targetX;
          ns.targetY = phoneBoothRoute.targetY;
          if (targetChanged) {
            ns.path = planPath(
              existing.x,
              existing.y,
              phoneBoothRoute.targetX,
              phoneBoothRoute.targetY,
            );
          }
          ns.state =
            Math.hypot(
              existing.x - phoneBoothRoute.targetX,
              existing.y - phoneBoothRoute.targetY,
            ) < 15
              ? "standing"
              : "walking";
          ns.facing = phoneBoothRoute.facing;
        } else if (explicitCatCompanionPausedByPet) {
          ns.pingPongUntil = undefined;
          ns.pingPongTargetX = undefined;
          ns.pingPongTargetY = undefined;
          ns.pingPongFacing = undefined;
          ns.pingPongPartnerId = undefined;
          ns.pingPongTableUid = undefined;
          ns.pingPongSide = undefined;
          ns.walkSpeed =
            existing.pingPongPreviousWalkSpeed ?? existing.walkSpeed;
          ns.pingPongPreviousWalkSpeed = undefined;
          ns.interactionTarget = "cat_lounge";
          ns.smsBoothStage = undefined;
          ns.phoneBoothStage = undefined;
          ns.serverRoomStage = undefined;
          ns.gymStage = undefined;
          ns.qaLabStage = undefined;
          ns.qaLabStationType = undefined;
          ns.workoutStyle = undefined;
          ns.targetX = existing.x;
          ns.targetY = existing.y;
          ns.path = [];
          ns.state = "standing";
          ns.facing = existing.facing;
          const pauseStage = existing.catPerchStage ?? "approach";
          const keepElevated =
            pauseStage === "climb" || pauseStage === "perched";
          ns.elevationOffset = keepElevated
            ? (existing.elevationOffset ?? catPatrolTargetSafe.elevation)
            : 0;
          ns.catPerchStage = pauseStage;
          ns.catPerchKey = existing.catPerchKey ?? catPatrolTargetSafe.key;
        } else if (explicitCatCompanionPatrol) {
          ns.pingPongUntil = undefined;
          ns.pingPongTargetX = undefined;
          ns.pingPongTargetY = undefined;
          ns.pingPongFacing = undefined;
          ns.pingPongPartnerId = undefined;
          ns.pingPongTableUid = undefined;
          ns.pingPongSide = undefined;
          ns.walkSpeed =
            existing.pingPongPreviousWalkSpeed ?? existing.walkSpeed;
          ns.pingPongPreviousWalkSpeed = undefined;
          ns.interactionTarget = "cat_lounge";
          ns.smsBoothStage = undefined;
          ns.phoneBoothStage = undefined;
          ns.serverRoomStage = undefined;
          ns.gymStage = undefined;
          ns.qaLabStage = undefined;
          ns.qaLabStationType = undefined;
          ns.workoutStyle = undefined;
          const targetKeyChanged =
            existing.catPerchKey !== catPatrolTargetSafe.key;
          let catPerchStage: "approach" | "climb" | "perched" =
            targetKeyChanged
              ? "approach"
              : existing.catPerchStage ?? "approach";
          const approachDistance = Math.hypot(
            existing.x - catPatrolTargetSafe.approachX,
            existing.y - catPatrolTargetSafe.approachY,
          );
          const perchDistance = Math.hypot(
            existing.x - catPatrolTargetSafe.targetX,
            existing.y - catPatrolTargetSafe.targetY,
          );
          if (catPerchStage === "approach" && approachDistance < 14) {
            catPerchStage = "climb";
          }
          if (catPerchStage === "climb" && perchDistance < 12) {
            catPerchStage = "perched";
          }
          const routePoint = resolveCatPerchRoutePoint(
            catPatrolTargetSafe,
            catPerchStage,
          );
          const targetChanged =
            existing.targetX !== routePoint.x ||
            existing.targetY !== routePoint.y ||
            targetKeyChanged;
          ns.targetX = routePoint.x;
          ns.targetY = routePoint.y;
          if (targetChanged) {
            ns.path = planPath(
              existing.x,
              existing.y,
              routePoint.x,
              routePoint.y,
            );
          }
          const routeDistance = Math.hypot(
            existing.x - routePoint.x,
            existing.y - routePoint.y,
          );
          ns.state =
            routeDistance < 12
              ? catPerchStage === "perched"
                ? "sitting"
                : "standing"
              : "walking";
          ns.facing =
            catPerchStage === "perched"
              ? catPatrolTargetSafe.facing
              : resolveFacingTowards(
                  existing.x,
                  existing.y,
                  catPatrolTargetSafe.targetX,
                  catPatrolTargetSafe.targetY,
                );
          ns.elevationOffset =
            catPerchStage === "climb" || catPerchStage === "perched"
              ? catPatrolTargetSafe.elevation
              : 0;
          ns.catPerchStage = catPerchStage;
          ns.catPerchKey = catPatrolTargetSafe.key;
        } else if (explicitCatCompanionHomeHold) {
          ns.pingPongUntil = undefined;
          ns.pingPongTargetX = undefined;
          ns.pingPongTargetY = undefined;
          ns.pingPongFacing = undefined;
          ns.pingPongPartnerId = undefined;
          ns.pingPongTableUid = undefined;
          ns.pingPongSide = undefined;
          ns.walkSpeed =
            existing.pingPongPreviousWalkSpeed ?? existing.walkSpeed;
          ns.pingPongPreviousWalkSpeed = undefined;
          ns.interactionTarget = "cat_lounge";
          ns.smsBoothStage = undefined;
          ns.phoneBoothStage = undefined;
          ns.serverRoomStage = undefined;
          ns.gymStage = undefined;
          ns.qaLabStage = undefined;
          ns.qaLabStationType = undefined;
          ns.workoutStyle = undefined;
          const targetChanged =
            existing.targetX !== GARFIELD_HOME_TARGET.x ||
            existing.targetY !== GARFIELD_HOME_TARGET.y;
          ns.targetX = GARFIELD_HOME_TARGET.x;
          ns.targetY = GARFIELD_HOME_TARGET.y;
          if (targetChanged) {
            ns.path = planPath(
              existing.x,
              existing.y,
              GARFIELD_HOME_TARGET.x,
              GARFIELD_HOME_TARGET.y,
            );
          }
          ns.state =
            Math.hypot(
              existing.x - GARFIELD_HOME_TARGET.x,
              existing.y - GARFIELD_HOME_TARGET.y,
            ) < 15
              ? "standing"
              : "walking";
          ns.facing = GARFIELD_HOME_TARGET.facing;
          ns.elevationOffset = 0;
          ns.catPerchStage = undefined;
          ns.catPerchKey = undefined;
        } else if (explicitCatHold) {
          ns.pingPongUntil = undefined;
          ns.pingPongTargetX = undefined;
          ns.pingPongTargetY = undefined;
          ns.pingPongFacing = undefined;
          ns.pingPongPartnerId = undefined;
          ns.pingPongTableUid = undefined;
          ns.pingPongSide = undefined;
          ns.walkSpeed =
            existing.pingPongPreviousWalkSpeed ?? existing.walkSpeed;
          ns.pingPongPreviousWalkSpeed = undefined;
          ns.interactionTarget = "cat_lounge";
          ns.smsBoothStage = undefined;
          ns.phoneBoothStage = undefined;
          ns.serverRoomStage = undefined;
          ns.gymStage = undefined;
          ns.qaLabStage = undefined;
          ns.qaLabStationType = undefined;
          ns.workoutStyle = undefined;
          const targetChanged =
            existing.targetX !== catLoungeRoute.targetX ||
            existing.targetY !== catLoungeRoute.targetY;
          ns.targetX = catLoungeRoute.targetX;
          ns.targetY = catLoungeRoute.targetY;
          if (targetChanged) {
            ns.path = planPath(
              existing.x,
              existing.y,
              catLoungeRoute.targetX,
              catLoungeRoute.targetY,
            );
          }
          ns.state =
            Math.hypot(
              existing.x - catLoungeRoute.targetX,
              existing.y - catLoungeRoute.targetY,
            ) < 15
              ? "standing"
              : "walking";
          ns.facing = catLoungeRoute.facing;
        } else if (effectiveStatus === "working" && deskPos) {
          ns.pingPongUntil = undefined;
          ns.pingPongTargetX = undefined;
          ns.pingPongTargetY = undefined;
          ns.pingPongFacing = undefined;
          ns.pingPongPartnerId = undefined;
          ns.pingPongTableUid = undefined;
          ns.pingPongSide = undefined;
          ns.walkSpeed =
            existing.pingPongPreviousWalkSpeed ?? existing.walkSpeed;
          ns.pingPongPreviousWalkSpeed = undefined;
          ns.interactionTarget = "desk";
          ns.phoneBoothStage = undefined;
          ns.serverRoomStage = undefined;
          ns.gymStage = undefined;
          ns.qaLabStage = undefined;
          ns.qaLabStationType = undefined;
          ns.workoutStyle = undefined;
          const targetChanged =
            existing.targetX !== deskPos.x || existing.targetY !== deskPos.y;
          ns.targetX = deskPos.x;
          ns.targetY = deskPos.y;
          if (targetChanged)
            ns.path = planPath(existing.x, existing.y, deskPos.x, deskPos.y);
          ns.state =
            Math.hypot(existing.x - deskPos.x, existing.y - deskPos.y) < 15
              ? "sitting"
              : "walking";
        } else if (effectiveStatus === "working") {
          ns.pingPongUntil = undefined;
          ns.pingPongTargetX = undefined;
          ns.pingPongTargetY = undefined;
          ns.pingPongFacing = undefined;
          ns.pingPongPartnerId = undefined;
          ns.pingPongTableUid = undefined;
          ns.pingPongSide = undefined;
          ns.walkSpeed =
            existing.pingPongPreviousWalkSpeed ?? existing.walkSpeed;
          ns.pingPongPreviousWalkSpeed = undefined;
          ns.interactionTarget = undefined;
          ns.phoneBoothStage = undefined;
          ns.serverRoomStage = undefined;
          ns.gymStage = undefined;
          ns.qaLabStage = undefined;
          ns.qaLabStationType = undefined;
          ns.workoutStyle = undefined;
          ns.targetX = existing.x;
          ns.targetY = existing.y;
          ns.path = [];
          ns.state = "standing";
        } else if (effectiveStatus === "error") {
          ns.pingPongUntil = undefined;
          ns.pingPongTargetX = undefined;
          ns.pingPongTargetY = undefined;
          ns.pingPongFacing = undefined;
          ns.pingPongPartnerId = undefined;
          ns.pingPongTableUid = undefined;
          ns.pingPongSide = undefined;
          ns.walkSpeed =
            existing.pingPongPreviousWalkSpeed ?? existing.walkSpeed;
          ns.pingPongPreviousWalkSpeed = undefined;
          ns.interactionTarget = undefined;
          ns.phoneBoothStage = undefined;
          ns.serverRoomStage = undefined;
          ns.gymStage = undefined;
          ns.qaLabStage = undefined;
          ns.qaLabStationType = undefined;
          ns.workoutStyle = undefined;
          ns.targetX = existing.x;
          ns.targetY = existing.y;
          ns.path = [];
          ns.state = "standing";
        }
        if (
          isCatCompanion &&
          !explicitCatCompanionPatrol &&
          !explicitCatCompanionPausedByPet
        ) {
          ns.elevationOffset = 0;
          ns.catPerchStage = undefined;
          ns.catPerchKey = undefined;
        }
        if (effectiveStatus !== existing.status) {
          if (effectiveStatus === "working") {
            const serverRoomRoute = resolveServerRoomRoute(
              existing.x,
              existing.y,
            );
            const smsBoothRoute = resolveSmsBoothRoute(
              smsBoothItem,
              existing.x,
              existing.y,
            );
            const phoneBoothRoute = resolvePhoneBoothRoute(
              phoneBoothItem,
              existing.x,
              existing.y,
            );
            const gymRoute = resolveGymRoute(
              existing.x,
              existing.y,
              gymWorkoutPos,
            );
            const qaLabRoute = resolveQaLabRoute(
              existing.x,
              existing.y,
              qaStationPos,
            );
            const nextTarget =
              explicitMeetingHold && meetingTarget
                ? { x: meetingTarget.x, y: meetingTarget.y }
                : explicitGymHold
                  ? { x: gymRoute.targetX, y: gymRoute.targetY }
                  : explicitSmsBoothHold
                    ? {
                        x: smsBoothRoute.targetX,
                        y: smsBoothRoute.targetY,
                      }
                  : explicitPhoneBoothHold
                    ? {
                        x: phoneBoothRoute.targetX,
                        y: phoneBoothRoute.targetY,
                      }
                  : explicitQaHold
                    ? { x: qaLabRoute.targetX, y: qaLabRoute.targetY }
                  : explicitGithubHold
                      ? {
                          x: serverRoomRoute.targetX,
                          y: serverRoomRoute.targetY,
                        }
                      : explicitCatCompanionPatrol
                        ? {
                            x: catPatrolTargetSafe.approachX,
                            y: catPatrolTargetSafe.approachY,
                          }
                        : explicitCatCompanionHomeHold
                          ? {
                              x: GARFIELD_HOME_TARGET.x,
                              y: GARFIELD_HOME_TARGET.y,
                            }
                          : explicitCatHold
                            ? {
                                x: catLoungeRoute.targetX,
                                y: catLoungeRoute.targetY,
                              }
                      : deskPos;
            if (!nextTarget) {
              ns.interactionTarget = undefined;
              ns.serverRoomStage = undefined;
              ns.gymStage = undefined;
              ns.qaLabStage = undefined;
              ns.qaLabStationType = undefined;
              ns.workoutStyle = undefined;
              ns.targetX = existing.x;
              ns.targetY = existing.y;
              ns.path = [];
              ns.state = "standing";
              next.push({
                ...agent,
                ...ns,
                status: effectiveStatus,
              } as RenderAgent);
              return;
            }
            ns.interactionTarget = explicitMeetingHold
              ? "meeting_room"
              : explicitGymHold
                ? "gym"
                : explicitSmsBoothHold
                  ? "sms_booth"
                : explicitPhoneBoothHold
                  ? "phone_booth"
                : explicitQaHold
                  ? "qa_lab"
                : explicitGithubHold
                  ? "server_room"
                  : explicitCatCompanionPatrol || explicitCatCompanionHomeHold || explicitCatHold
                    ? "cat_lounge"
                  : "desk";
            ns.phoneBoothStage =
              explicitMeetingHold ||
              explicitGymHold ||
              explicitSmsBoothHold ||
              !explicitPhoneBoothHold
                ? undefined
                : phoneBoothRoute.stage;
            ns.smsBoothStage =
              explicitMeetingHold ||
              explicitGymHold ||
              explicitCatCompanionPatrol ||
              explicitCatCompanionHomeHold ||
              explicitCatHold ||
              !explicitSmsBoothHold
                ? undefined
                : smsBoothRoute.stage;
            ns.serverRoomStage = explicitMeetingHold
              ? undefined
              : explicitGymHold
                ? undefined
              : explicitSmsBoothHold
                  ? undefined
                : explicitPhoneBoothHold
                  ? undefined
                : explicitCatCompanionPatrol || explicitCatCompanionHomeHold || explicitCatHold
                  ? undefined
                : explicitGithubHold
                  ? serverRoomRoute.stage
                  : undefined;
            ns.gymStage = explicitMeetingHold
              ? undefined
              : explicitGymHold
                ? gymRoute.stage
                : undefined;
            ns.qaLabStage = explicitMeetingHold
              ? undefined
              : explicitSmsBoothHold
                ? undefined
              : explicitPhoneBoothHold
                ? undefined
              : explicitCatCompanionPatrol || explicitCatCompanionHomeHold || explicitCatHold
                ? undefined
              : explicitQaHold
                ? qaLabRoute.stage
                : undefined;
            ns.qaLabStationType = explicitQaHold
              ? qaStationPos.stationType
              : undefined;
            ns.workoutStyle = explicitGymHold
              ? gymWorkoutPos.workoutStyle
              : undefined;
            ns.targetX = nextTarget.x;
            ns.targetY = nextTarget.y;
            ns.path = planPath(
              existing.x,
              existing.y,
              nextTarget.x,
              nextTarget.y,
            );
            ns.state = "walking";
          } else if (effectiveStatus === "error") {
            ns.interactionTarget = undefined;
            ns.smsBoothStage = undefined;
            ns.phoneBoothStage = undefined;
            ns.serverRoomStage = undefined;
            ns.gymStage = undefined;
            ns.qaLabStage = undefined;
            ns.qaLabStationType = undefined;
            ns.workoutStyle = undefined;
            ns.targetX = existing.x;
            ns.targetY = existing.y;
            ns.path = [];
            ns.state = "standing";
          } else if (existing.status === "working") {
            ns.interactionTarget = undefined;
            ns.smsBoothStage = undefined;
            ns.phoneBoothStage = undefined;
            ns.serverRoomStage = undefined;
            ns.gymStage = undefined;
            ns.qaLabStage = undefined;
            ns.qaLabStationType = undefined;
            ns.workoutStyle = undefined;
            const r =
              ROAM_POINTS[Math.floor(Math.random() * ROAM_POINTS.length)];
            ns.targetX = r.x;
            ns.targetY = r.y;
            ns.path = planPath(existing.x, existing.y, r.x, r.y);
            ns.state = "walking";
          }
        }
      } else {
        // New agent — spawn at a random position and plan path to first target.
        const sx = Math.random() * 800 + 100,
          sy = Math.random() * 500 + 100;
        const serverRoomRoute = resolveServerRoomRoute(sx, sy);
        const smsBoothRoute = resolveSmsBoothRoute(smsBoothItem, sx, sy);
        const phoneBoothRoute = resolvePhoneBoothRoute(phoneBoothItem, sx, sy);
        const gymRoute = resolveGymRoute(sx, sy, gymWorkoutPos);
        const qaLabRoute = resolveQaLabRoute(sx, sy, qaStationPos);
        const initialTarget =
          effectiveStatus === "working"
            ? explicitMeetingHold && meetingTarget
              ? {
                  x: meetingTarget.x,
                  y: meetingTarget.y,
                }
              : explicitGymHold
                ? {
                    x: gymRoute.targetX,
                    y: gymRoute.targetY,
                  }
                : explicitSmsBoothHold
                  ? {
                      x: smsBoothRoute.targetX,
                      y: smsBoothRoute.targetY,
                    }
                : explicitPhoneBoothHold
                  ? {
                      x: phoneBoothRoute.targetX,
                      y: phoneBoothRoute.targetY,
                    }
                  : explicitQaHold
                    ? {
                        x: qaLabRoute.targetX,
                        y: qaLabRoute.targetY,
                      }
                    : explicitGithubHold
                      ? {
                          x: serverRoomRoute.targetX,
                          y: serverRoomRoute.targetY,
                        }
                    : explicitCatCompanionPatrol
                      ? {
                          x: catPatrolTargetSafe.approachX,
                          y: catPatrolTargetSafe.approachY,
                        }
                      : explicitCatCompanionHomeHold
                        ? {
                            x: GARFIELD_HOME_TARGET.x,
                            y: GARFIELD_HOME_TARGET.y,
                          }
                        : explicitCatHold
                          ? {
                              x: catLoungeRoute.targetX,
                              y: catLoungeRoute.targetY,
                            }
                    : (deskPos ?? { x: sx, y: sy })
            : { x: sx, y: sy };
        ns = {
          x: sx,
          y: sy,
          targetX: initialTarget.x,
          targetY: initialTarget.y,
          path: planPath(sx, sy, initialTarget.x, initialTarget.y),
          frame: 0,
          walkSpeed: isCatCompanion
            ? WALK_SPEED *
              Math.max(
                0.5,
                Math.min(
                  1.5,
                  ("activityMultiplier" in agent
                    ? agent.activityMultiplier
                    : undefined) ?? 1,
                ),
              )
            : WALK_SPEED * (0.7 + Math.random() * 0.6),
          phaseOffset: Math.random() * Math.PI * 2,
          elevationOffset: isCatCompanion
            ? 0
            : undefined,
          catPerchStage:
            isCatCompanion && explicitCatCompanionPatrol
              ? "approach"
              : undefined,
          catPerchKey:
            isCatCompanion && explicitCatCompanionPatrol
              ? catPatrolTargetSafe.key
              : undefined,
          state: effectiveStatus === "working" &&
                (explicitMeetingHold ||
                  explicitGymHold ||
                  explicitSmsBoothHold ||
                  explicitPhoneBoothHold ||
                  explicitQaHold ||
                  explicitGithubHold ||
                  explicitCatHold ||
                  explicitCatCompanionPatrol ||
                  explicitCatCompanionHomeHold ||
                  deskPos)
              ? "walking"
              : "standing",
          interactionTarget: explicitMeetingHold
            ? "meeting_room"
            : explicitGymHold
              ? "gym"
              : explicitSmsBoothHold
                ? "sms_booth"
              : explicitPhoneBoothHold
                ? "phone_booth"
              : explicitQaHold
                ? "qa_lab"
                : explicitGithubHold
                  ? "server_room"
                  : explicitCatCompanionPatrol || explicitCatCompanionHomeHold || explicitCatHold
                    ? "cat_lounge"
                  : deskPos
                    ? "desk"
                    : undefined,
          smsBoothStage:
            explicitMeetingHold ||
            explicitGymHold ||
            explicitCatCompanionPatrol ||
            explicitCatCompanionHomeHold ||
            explicitCatHold ||
            !explicitSmsBoothHold
              ? undefined
              : smsBoothRoute.stage,
          phoneBoothStage:
            explicitMeetingHold ||
            explicitGymHold ||
            explicitSmsBoothHold ||
            explicitCatCompanionPatrol ||
            explicitCatCompanionHomeHold ||
            explicitCatHold ||
            !explicitPhoneBoothHold
              ? undefined
              : phoneBoothRoute.stage,
          serverRoomStage:
            explicitMeetingHold ||
            explicitGymHold ||
            explicitSmsBoothHold ||
            explicitPhoneBoothHold ||
            explicitCatCompanionPatrol ||
            explicitCatCompanionHomeHold ||
            explicitCatHold ||
            !explicitGithubHold
              ? undefined
              : serverRoomRoute.stage,
          gymStage:
            explicitMeetingHold || !explicitGymHold
              ? undefined
              : gymRoute.stage,
          qaLabStage:
            explicitMeetingHold ||
            explicitSmsBoothHold ||
            explicitPhoneBoothHold ||
            explicitCatCompanionPatrol ||
            explicitCatCompanionHomeHold ||
            explicitCatHold ||
            !explicitQaHold
              ? undefined
              : qaLabRoute.stage,
          qaLabStationType: explicitQaHold
            ? qaStationPos.stationType
            : undefined,
          workoutStyle: explicitGymHold
            ? gymWorkoutPos.workoutStyle
            : undefined,
          facing:
            explicitMeetingHold && meetingTarget
              ? meetingTarget.facing
              : explicitCatCompanionPatrol
                ? catPatrolTargetSafe.facing
                : explicitCatCompanionHomeHold
                  ? GARFIELD_HOME_TARGET.facing
                  : explicitCatHold
                    ? catLoungeRoute.facing
              : Math.PI / 2,
        };
      }
      next.push({ ...agent, ...ns, status: effectiveStatus } as RenderAgent);
    });
    renderAgentsRef.current = next;
    const renderAgentLookup = renderAgentLookupRef.current;
    renderAgentLookup.clear();
    for (const agent of next) {
      renderAgentLookup.set(agent.id, agent);
    }
  }, [
    agents,
    assignedDeskIndexByAgentId,
    catLoungeInteractionDistance,
    catHoldByAgentId,
    catCompanionTargetByAgentId,
    catMovementPausedByAgentId,
    deskHoldByAgentId,
    deskLocations,
    furnitureRef,
    gymHoldByAgentId,
    gymWorkoutLocations,
    smsBoothHoldByAgentId,
    phoneBoothHoldByAgentId,
    qaHoldByAgentId,
    qaLabStations,
    githubReviewByAgentId,
    meetingParticipants,
    meetingSeatLocations,
    planPath,
    resolveMeetingTarget,
    standupActive,
    standupMeeting,
  ]);

  // Tick called each frame — follows A* waypoints, no React state.
  const tick = () => {
    const grid = getNavGrid();
    const now = Date.now();
    const furnitureItems = furnitureRef.current ?? [];
    const smsBoothItem =
      furnitureItems.find((item) => item.type === "sms_booth") ?? null;
    const phoneBoothItem =
      furnitureItems.find((item) => item.type === "phone_booth") ?? null;
    const socialFurniture = furnitureItems.filter((item) =>
      [
        "couch",
        "couch_v",
        "beanbag",
        "coffee_machine",
        "water_cooler",
      ].includes(item.type),
    );
    const awayFurniture = socialFurniture.filter((item) =>
      ["couch", "couch_v", "beanbag"].includes(item.type),
    );
    const moved = renderAgentsRef.current.map((agent) => {
      const isJanitor = "role" in agent && agent.role === "janitor";
      if (isJanitor && agent.janitorPauseUntil !== undefined) {
        if (now < agent.janitorPauseUntil) {
          return {
            ...agent,
            state: "standing" as const,
            frame: agent.frame + 1,
          };
        }
        const nextRouteIndex = (agent.janitorRouteIndex ?? 0) + 1;
        const nextTarget = agent.janitorRoute[nextRouteIndex];
        if (!nextTarget) {
          return {
            ...agent,
            janitorPauseUntil: undefined,
            state: "standing" as const,
            frame: agent.frame + 1,
          };
        }
        return {
          ...agent,
          janitorPauseUntil: undefined,
          janitorRouteIndex: nextRouteIndex,
          targetX: nextTarget.x,
          targetY: nextTarget.y,
          path: astar(agent.x, agent.y, nextTarget.x, nextTarget.y, grid),
          facing: nextTarget.facing,
          state: "walking" as const,
          frame: agent.frame + 1,
        };
      }
      if (agent.pingPongUntil !== undefined && now >= agent.pingPongUntil) {
        return {
          ...agent,
          walkSpeed: agent.pingPongPreviousWalkSpeed ?? agent.walkSpeed,
          pingPongUntil: undefined,
          pingPongTargetX: undefined,
          pingPongTargetY: undefined,
          pingPongFacing: undefined,
          pingPongPartnerId: undefined,
          pingPongTableUid: undefined,
          pingPongSide: undefined,
          pingPongPreviousWalkSpeed: undefined,
          targetX: agent.x,
          targetY: agent.y,
          path: [],
          state: "standing" as const,
          frame: agent.frame + 1,
        };
      }
      // Bumped agents are frozen: legs stop, no movement.
      // When the timer expires, resume walking from the same spot and briefly
      // ignore further collisions so both agents can peel away cleanly.
      if (agent.bumpedUntil !== undefined) {
        if (now < agent.bumpedUntil) {
          return {
            ...agent,
            state: "standing" as const,
            frame: agent.frame + 1,
          };
        }
        return {
          ...agent,
          bumpedUntil: undefined,
          bumpTalkUntil: undefined,
          collisionCooldownUntil: now + BUMP_RECOVERY_MS,
          state: "walking" as const,
          path: astar(agent.x, agent.y, agent.targetX, agent.targetY, grid),
          frame: agent.frame + 1,
        };
      }
      const baseSpeed = agent.walkSpeed ?? WALK_SPEED;
      const speed =
        agent.status === "working" && agent.state !== "sitting"
          ? baseSpeed * WORKING_WALK_SPEED_MULTIPLIER
          : baseSpeed;
      // Move toward the first waypoint; fall back to the raw target when empty.
      const path = agent.path ?? [];
      const wpX = path.length > 0 ? path[0].x : agent.targetX;
      const wpY = path.length > 0 ? path[0].y : agent.targetY;
      const dx = wpX - agent.x,
        dy = wpY - agent.y;
      const dist = Math.hypot(dx, dy);

      let ns = agent.state,
        nx = agent.x,
        ny = agent.y,
        nf = agent.facing,
        npath = path;

      if (dist > speed) {
        nx = agent.x + (dx / dist) * speed;
        ny = agent.y + (dy / dist) * speed;
        // atan2(dx, dy) gives the rotation.y angle for the direction of travel
        // (local +Z aligns with the movement vector when rotation.y = atan2(dx, dy)).
        nf = Math.atan2(dx, dy);
        ns = "walking";
      } else {
        // Reached current waypoint — advance or finalise.
        nx = wpX;
        ny = wpY;
        if (path.length > 1) {
          npath = path.slice(1);
          ns = "walking";
        } else {
          npath = [];
          if (isJanitor) {
            const routeIndex = agent.janitorRouteIndex ?? 0;
            const currentStop =
              agent.janitorRoute[routeIndex] ?? agent.janitorRoute.at(-1);
            return {
              ...agent,
              x: nx,
              y: ny,
              facing: currentStop?.facing ?? nf,
              state: "standing" as const,
              path: [],
              janitorPauseUntil:
                routeIndex < agent.janitorRoute.length - 1
                  ? now + agent.janitorPauseMs
                  : undefined,
              frame: agent.frame + 1,
            };
          }
          if (agent.pingPongUntil !== undefined) {
            nx = agent.pingPongTargetX ?? nx;
            ny = agent.pingPongTargetY ?? ny;
            nf = agent.pingPongFacing ?? nf;
            ns = "standing";
          } else if (agent.status === "working") {
            if (
              agent.interactionTarget === "sms_booth" &&
              agent.smsBoothStage !== "typing"
            ) {
              const nextSmsBoothRoute = resolveSmsBoothRoute(
                smsBoothItem,
                nx,
                ny,
              );
              return {
                ...agent,
                x: nx,
                y: ny,
                targetX: nextSmsBoothRoute.targetX,
                targetY: nextSmsBoothRoute.targetY,
                path: astar(
                  nx,
                  ny,
                  nextSmsBoothRoute.targetX,
                  nextSmsBoothRoute.targetY,
                  grid,
                ),
                facing: nextSmsBoothRoute.facing,
                state: "walking" as const,
                smsBoothStage: nextSmsBoothRoute.stage,
                frame: agent.frame + 1,
              };
            }
            if (
              agent.interactionTarget === "phone_booth" &&
              agent.phoneBoothStage !== "receiver"
            ) {
              const nextPhoneBoothRoute = resolvePhoneBoothRoute(
                phoneBoothItem,
                nx,
                ny,
              );
              return {
                ...agent,
                x: nx,
                y: ny,
                targetX: nextPhoneBoothRoute.targetX,
                targetY: nextPhoneBoothRoute.targetY,
                path: astar(
                  nx,
                  ny,
                  nextPhoneBoothRoute.targetX,
                  nextPhoneBoothRoute.targetY,
                  grid,
                ),
                facing: nextPhoneBoothRoute.facing,
                state: "walking" as const,
                phoneBoothStage: nextPhoneBoothRoute.stage,
                frame: agent.frame + 1,
              };
            }
            if (
              agent.interactionTarget === "server_room" &&
              agent.serverRoomStage !== "terminal"
            ) {
              const nextServerRoomRoute = resolveServerRoomRoute(nx, ny);
              return {
                ...agent,
                x: nx,
                y: ny,
                targetX: nextServerRoomRoute.targetX,
                targetY: nextServerRoomRoute.targetY,
                path: astar(
                  nx,
                  ny,
                  nextServerRoomRoute.targetX,
                  nextServerRoomRoute.targetY,
                  grid,
                ),
                facing: nextServerRoomRoute.facing,
                state: "walking" as const,
                serverRoomStage: nextServerRoomRoute.stage,
                frame: agent.frame + 1,
              };
            }
            if (
              agent.interactionTarget === "gym" &&
              agent.gymStage !== "workout"
            ) {
              const gymIdx = gymByAgentRef.current.get(agent.id) ?? 0;
              const workoutTarget =
                gymWorkoutLocations[gymIdx] ?? GYM_DEFAULT_TARGET;
              const nextGymRoute = resolveGymRoute(nx, ny, workoutTarget);
              return {
                ...agent,
                x: nx,
                y: ny,
                targetX: nextGymRoute.targetX,
                targetY: nextGymRoute.targetY,
                path: astar(
                  nx,
                  ny,
                  nextGymRoute.targetX,
                  nextGymRoute.targetY,
                  grid,
                ),
                facing: nextGymRoute.facing,
                state: "walking" as const,
                gymStage: nextGymRoute.stage,
                frame: agent.frame + 1,
              };
            }
            if (
              agent.interactionTarget === "qa_lab" &&
              agent.qaLabStage !== "station"
            ) {
              const qaIdx = qaByAgentRef.current.get(agent.id) ?? 0;
              const qaTarget = qaLabStations[qaIdx] ?? {
                ...QA_LAB_DEFAULT_TARGET,
                stationType: "console" as const,
              };
              const nextQaLabRoute = resolveQaLabRoute(nx, ny, qaTarget);
              return {
                ...agent,
                x: nx,
                y: ny,
                targetX: nextQaLabRoute.targetX,
                targetY: nextQaLabRoute.targetY,
                path: astar(
                  nx,
                  ny,
                  nextQaLabRoute.targetX,
                  nextQaLabRoute.targetY,
                  grid,
                ),
                facing: nextQaLabRoute.facing,
                state: "walking" as const,
                qaLabStage: nextQaLabRoute.stage,
                qaLabStationType: qaTarget.stationType,
                frame: agent.frame + 1,
              };
            }
            ns =
              agent.interactionTarget === "sms_booth"
                ? "standing"
                : agent.interactionTarget === "phone_booth"
                ? "standing"
                : agent.interactionTarget === "server_room"
                ? "standing"
                : agent.interactionTarget === "gym"
                  ? "working_out"
                  : agent.interactionTarget === "qa_lab"
                    ? "standing"
                    : agent.interactionTarget === "cat_lounge"
                      ? "standing"
                    : "sitting";
            if (agent.interactionTarget === "sms_booth") {
              nf = agent.facing;
            } else if (agent.interactionTarget === "phone_booth") {
              nf = agent.facing;
            } else if (agent.interactionTarget === "server_room") {
              nf = SERVER_ROOM_TARGET.facing;
            } else if (agent.interactionTarget === "gym") {
              nf = agent.facing;
            } else if (agent.interactionTarget === "qa_lab") {
              nf = agent.facing;
            } else if (agent.interactionTarget === "cat_lounge") {
              nf = agent.facing;
            } else if (agent.interactionTarget === "meeting_room") {
              nf = agent.facing;
            }
          } else if (agent.status === "error") {
            ns = "standing";
          } else {
            // New Idea 9: away state — if idle for > AWAY_THRESHOLD_MS, send to nearest couch.
            const lastSeen = lastSeenByAgentId[agent.id] ?? 0;
            const isAway = lastSeen > 0 && now - lastSeen > AWAY_THRESHOLD_MS;
            if (isAway && agent.state !== "away") {
              if (awayFurniture.length > 0) {
                const f =
                  awayFurniture[
                    Math.floor(Math.random() * awayFurniture.length)
                  ];
                const tx = Math.max(
                  SNAP_GRID,
                  Math.min(
                    CANVAS_W - SNAP_GRID,
                    Math.round((f.x + 20) / SNAP_GRID) * SNAP_GRID,
                  ),
                );
                const ty = Math.max(
                  SNAP_GRID,
                  Math.min(
                    CANVAS_H - SNAP_GRID,
                    Math.round((f.y + 20) / SNAP_GRID) * SNAP_GRID,
                  ),
                );
                return {
                  ...agent,
                  x: nx,
                  y: ny,
                  targetX: tx,
                  targetY: ty,
                  path: astar(nx, ny, tx, ty, grid),
                  state: "walking" as const,
                  frame: agent.frame + 1,
                };
              }
            }
            ns = isAway ? ("away" as const) : "standing";
            if (Math.random() < 0.005) {
              // Idea 6: 15% chance to walk to a social furniture item instead of a random roam point.
              let target: { x: number; y: number } | null = null;
              if (socialFurniture.length > 0 && Math.random() < 0.15) {
                const f =
                  socialFurniture[
                    Math.floor(Math.random() * socialFurniture.length)
                  ];
                // Aim for a cell adjacent to the furniture item.
                const offsets = [
                  { dx: 1, dy: 0 },
                  { dx: -1, dy: 0 },
                  { dx: 0, dy: 1 },
                  { dx: 0, dy: -1 },
                ];
                const off = offsets[Math.floor(Math.random() * offsets.length)];
                const tx =
                  Math.round((f.x + off.dx * 30) / SNAP_GRID) * SNAP_GRID;
                const ty =
                  Math.round((f.y + off.dy * 30) / SNAP_GRID) * SNAP_GRID;
                const clampedX = Math.max(
                  SNAP_GRID,
                  Math.min(CANVAS_W - SNAP_GRID, tx),
                );
                const clampedY = Math.max(
                  SNAP_GRID,
                  Math.min(CANVAS_H - SNAP_GRID, ty),
                );
                target = { x: clampedX, y: clampedY };
              }
              if (!target) {
                target =
                  ROAM_POINTS[Math.floor(Math.random() * ROAM_POINTS.length)];
              }
              return {
                ...agent,
                x: nx,
                y: ny,
                targetX: target.x,
                targetY: target.y,
                path: astar(nx, ny, target.x, target.y, grid),
                state: "walking" as const,
                frame: agent.frame + 1,
              };
            }
          }
        }
      }

      return {
        ...agent,
        x: nx,
        y: ny,
        facing: nf,
        state: ns,
        path: npath,
        frame: agent.frame + 1,
      };
    });

    // Collision bump — when agents overlap, stop them briefly and reroute them
    // in different directions without the old hard shove.
    const collisionCellSize = AGENT_RADIUS * 4;
    const collisionBuckets = new Map<string, number[]>();
    for (let index = 0; index < moved.length; index += 1) {
      const agent = moved[index];
      if ("role" in agent && agent.role === "janitor") continue;
      const bucketKey = `${Math.floor(agent.x / collisionCellSize)}:${Math.floor(
        agent.y / collisionCellSize,
      )}`;
      const bucket = collisionBuckets.get(bucketKey);
      if (bucket) bucket.push(index);
      else collisionBuckets.set(bucketKey, [index]);
    }

    for (let i = 0; i < moved.length; i++) {
      const mi = moved[i];
      if ("role" in mi && mi.role === "janitor") continue;
      const miIsCat = isAnimalActor(mi);
      if (Boolean(catMovementPausedByAgentId[mi.id])) continue;
      if (
        (moved[i].state === "sitting" ||
          moved[i].state === "working_out") &&
        !miIsCat
      )
        continue;
      if (moved[i].pingPongUntil !== undefined && moved[i].state !== "walking")
        continue;
      if (moved[i].bumpedUntil !== undefined) continue;
      if ((moved[i].collisionCooldownUntil ?? 0) > now) continue;
      let sx = 0,
        sy = 0,
        fx = 0,
        fy = 0;
      const bucketX = Math.floor(mi.x / collisionCellSize);
      const bucketY = Math.floor(mi.y / collisionCellSize);
      for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
        for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
          const bucket = collisionBuckets.get(`${bucketX + offsetX}:${bucketY + offsetY}`);
          if (!bucket) continue;
          for (const j of bucket) {
            if (i === j) continue;
            const mj = moved[j];
            if ("role" in mj && mj.role === "janitor") continue;
            if (Boolean(catMovementPausedByAgentId[mj.id])) continue;
            const mjIsCat = isAnimalActor(mj);
            let ddx = moved[i].x - moved[j].x;
            let ddy = moved[i].y - moved[j].y;
            const d = Math.hypot(ddx, ddy);
            const minDist =
              miIsCat && mjIsCat
                ? catToCatMinDistance
                : miIsCat || mjIsCat
                  ? catToHumanMinDistance
                  : AGENT_RADIUS * 2;
            if (d < minDist) {
              // d=0 edge case: exact overlap — use a random direction to break symmetry.
              if (d === 0) {
                ddx = Math.random() - 0.5;
                ddy = Math.random() - 0.5;
              }
              const effD = Math.max(d, 0.01);
              const effNorm = Math.hypot(ddx, ddy) || 1;
              const push = (1 - effD / minDist) * SEPARATION_STRENGTH;
              sx += (ddx / effNorm) * push;
              sy += (ddy / effNorm) * push;
              fx += (-ddx / effNorm) * push;
              fy += (-ddy / effNorm) * push;
            }
          }
        }
      }
      if (sx === 0 && sy === 0) continue;
      const pushMag = Math.hypot(sx, sy);
      const norm = pushMag || 1;
      if (miIsCat) {
        const nudgeDistance = Math.max(
          catCollisionNudgeDistance,
          Math.min(catToHumanMinDistance * 0.65, pushMag * 8),
        );
        const nudgeTarget = clampCanvasFloatPoint(
          moved[i].x + (sx / norm) * nudgeDistance,
          moved[i].y + (sy / norm) * nudgeDistance,
        );
        moved[i] = {
          ...moved[i],
          x: nudgeTarget.x,
          y: nudgeTarget.y,
          state: "walking",
          path: astar(
            nudgeTarget.x,
            nudgeTarget.y,
            moved[i].targetX,
            moved[i].targetY,
            grid,
          ),
          facing: Math.atan2(sx, sy),
          bumpedUntil: undefined,
          bumpTalkUntil: undefined,
          collisionCooldownUntil: now + 400,
        };
        continue;
      }
      // Pick the roam point most aligned with the push direction as the escape target.
      let bestDot = -Infinity;
      let escapeTarget = ROAM_POINTS[0];
      for (const rp of ROAM_POINTS) {
        const rdx = rp.x - moved[i].x,
          rdy = rp.y - moved[i].y;
        const rdist = Math.hypot(rdx, rdy) || 1;
        const dot = (rdx / rdist) * (sx / norm) + (rdy / rdist) * (sy / norm);
        if (dot > bestDot) {
          bestDot = dot;
          escapeTarget = rp;
        }
      }
      moved[i] = {
        ...moved[i],
        // Face the other agent during the pause so the bump reads like a brief chat.
        facing: Math.atan2(fx || sx, fy || sy),
        // Freeze legs and store the escape target — the tick's bump handler will
        // route here when the timer expires.
        state: "standing",
        path: [],
        targetX: escapeTarget.x,
        targetY: escapeTarget.y,
        bumpedUntil: now + BUMP_FREEZE_MS,
        bumpTalkUntil: now + BUMP_FREEZE_MS,
      };
    }
    renderAgentsRef.current = moved;
    const renderAgentLookup = renderAgentLookupRef.current;
    renderAgentLookup.clear();
    for (const agent of moved) {
      renderAgentLookup.set(agent.id, agent);
    }
  };

  return { renderAgentsRef, renderAgentLookupRef, tick, deskByAgentRef, planPath };
}

// ============================================================
// NEW IDEA 2 — CAMERA PRESETS
// ============================================================

const AWAY_THRESHOLD_MS = 15 * 60 * 1000;

const estimatePhoneSpeechDurationMs = (text: string | null | undefined): number => {
  const normalized = text?.trim() ?? "";
  if (!normalized) return 5_000;
  const wordCount = normalized.split(/\s+/).filter(Boolean).length;
  return Math.max(5_000, Math.min(12_000, 1_800 + wordCount * 380));
};

type CatTopiaHelpField =
  | "mainCatName"
  | "enabledSpecies"
  | "catVariety"
  | "catActivityLevel"
  | "catSpawnRatePerHour"
  | "maxSpawnedCatsPerSession"
  | "catCuddleLevel"
  | "catNamingConvention";

const CAT_TOPIA_HELP_COPY: Record<
  CatTopiaHelpField,
  {
    title: string;
    summary: string;
    meanings: string[];
    note?: string;
  }
> = {
  mainCatName: {
    title: "Main Animal Name",
    summary: "This is Garfield's display name in the office.",
    meanings: [
      "Changing this renames your main cat in the UI.",
      "Only affects the main cat, not already spawned cats.",
      "Max 12 characters keeps the nameplate clean and readable.",
    ],
    note: "Tip: short names are easier to spot while zoomed out.",
  },
  enabledSpecies: {
    title: "Enabled Animal Species",
    summary: "Choose which species are allowed to spawn in Zoo-Topia.",
    meanings: [
      "Checked species can spawn over time.",
      "Unchecked species will not spawn in new cycles.",
      "Cats are enabled by default to preserve existing behavior.",
    ],
    note: "At least one species should stay enabled so the zoo can keep spawning.",
  },
  catVariety: {
    title: "Animal Variety",
    summary: "Controls how visually different newly spawned cats look.",
    meanings: [
      "Low: new cats look very similar to Garfield.",
      "Medium: balanced mix of similar and different looks.",
      "High: wider variety in coat patterns and eye color.",
    ],
    note: "This applies to newly spawned cats going forward.",
  },
  catActivityLevel: {
    title: "Animal Activity Levels",
    summary: "Controls movement speed for spawned cats (not Garfield).",
    meanings: [
      "Low: spawned cats move at 75% speed.",
      "Medium: spawned cats move at normal speed.",
      "High: spawned cats move at 150% speed.",
    ],
    note: "This updates existing spawned cats too.",
  },
  catSpawnRatePerHour: {
    title: "New Animals Spawn Per Hour",
    summary: "Controls how often new animals are created over time.",
    meanings: [
      "Range is 0 to 60 spawns per hour.",
      "0 pauses new spawning.",
      "Higher values increase office activity quickly.",
    ],
    note: "Changing this takes effect immediately for the next spawn timer.",
  },
  maxSpawnedCatsPerSession: {
    title: "Total New Animals Per Session",
    summary: "Sets the hard cap for how many new animals can spawn this session.",
    meanings: [
      "Range is 1 to 1000.",
      "Lower value: colony stops growing sooner.",
      "Higher value: colony can keep expanding longer.",
    ],
    note: "This updates instantly. If current count is already above cap, no new cats will spawn until count drops below the limit.",
  },
  catCuddleLevel: {
    title: "Animal Cuddle Level",
    summary: "Controls how closely cats and agents gather around each other.",
    meanings: [
      "CuddleCity: longer, closer hangouts.",
      "Express Lane: quick interactions and faster spacing.",
      "Anxious: brief clustering, then more spread out behavior.",
      "Normal: default balanced social behavior.",
    ],
    note: "Useful when the office feels too crowded or too empty.",
  },
  catNamingConvention: {
    title: "Animal Naming Convention",
    summary: "Sets the style for names of newly spawned cats.",
    meanings: [
      "Examples: funny, silly, hilarious, wild, peace and love, punk rock.",
      "You can type your own style label.",
      "Name style is applied when each new cat is created.",
    ],
    note: "Max 20 characters keeps cat name chips readable.",
  },
};

export function RetroOffice3D({
  agents,
  animationState = null,
  onRemoveSyntheticCat,
  zooRipPortraits = [],
  catTopiaSettings = CAT_TOPIA_DEFAULT_SETTINGS,
  onCatTopiaSettingsChange,
  deskAssignmentByDeskUid = {},
  cleaningCues = [],
  catHoldByAgentId = {},
  deskHoldByAgentId = {},
  gymHoldByAgentId = {},
  githubReviewAgentId = null,
  phoneBoothAgentId = null,
  phoneCallScenario = null,
  smsBoothAgentId = null,
  textMessageScenario = null,
  qaHoldByAgentId = {},
  qaTestingAgentId = null,
  standupMeeting = null,
  standupAutoOpenBoard = true,
  monitorAgentId = null,
  monitorByAgentId = {},
  githubSkill = null,
  officeTitle = "CENTCOM HQ",
  officeTitleLoaded = false,
  voiceRepliesEnabled = false,
  voiceRepliesVoiceId = null,
  voiceRepliesSpeed = 1,
  voiceRepliesLoaded = false,
  onOfficeTitleChange,
  onVoiceRepliesToggle,
  onVoiceRepliesVoiceChange,
  onVoiceRepliesSpeedChange,
  onVoiceRepliesPreview,
  onGatewayDisconnect,
  atmAnalytics = null,
  feedEvents = [],
  gatewayStatus = "disconnected",
  runCountByAgentId = {},
  lastSeenByAgentId = {},
  onStandupArrivalsChange,
  onStandupStartRequested,
  onMonitorSelect,
  onDeskAssignmentChange,
  onDeskAssignmentsReset,
  onGithubReviewDismiss,
  onPhoneCallComplete,
  onPhoneCallSpeak,
  onTextMessageComplete,
  onQaLabDismiss,
  onOpenGithubSkillSetup,
  onAgentEdit,
}: {
  agents: OfficeAgent[];
  animationState?: Pick<
    OfficeAnimationState,
    | "cleaningCues"
    | "catHoldByAgentId"
    | "deskHoldByAgentId"
    | "githubHoldByAgentId"
    | "gymHoldByAgentId"
    | "phoneBoothHoldByAgentId"
    | "smsBoothHoldByAgentId"
    | "qaHoldByAgentId"
  > | null;
  onRemoveSyntheticCat?: (agentId: string) => void;
  zooRipPortraits?: MemorialWallPortrait[];
  catTopiaSettings?: CatTopiaSettings;
  onCatTopiaSettingsChange?: (patch: Partial<CatTopiaSettings>) => void;
  deskAssignmentByDeskUid?: Record<string, string>;
  cleaningCues?: OfficeCleaningCue[];
  catHoldByAgentId?: Record<string, boolean>;
  deskHoldByAgentId?: Record<string, boolean>;
  gymHoldByAgentId?: Record<string, boolean>;
  githubReviewAgentId?: string | null;
  phoneBoothAgentId?: string | null;
  phoneCallScenario?: MockPhoneCallScenario | null;
  smsBoothAgentId?: string | null;
  textMessageScenario?: MockTextMessageScenario | null;
  qaHoldByAgentId?: Record<string, boolean>;
  qaTestingAgentId?: string | null;
  standupMeeting?: StandupMeeting | null;
  standupAutoOpenBoard?: boolean;
  monitorAgentId?: string | null;
  monitorByAgentId?: OfficeDeskMonitorMap;
  githubSkill?: SkillStatusEntry | null;
  officeTitle?: string;
  officeTitleLoaded?: boolean;
  voiceRepliesEnabled?: boolean;
  voiceRepliesVoiceId?: string | null;
  voiceRepliesSpeed?: number;
  voiceRepliesLoaded?: boolean;
  onOfficeTitleChange?: (title: string) => void;
  onVoiceRepliesToggle?: (enabled: boolean) => void;
  onVoiceRepliesVoiceChange?: (voiceId: string | null) => void;
  onVoiceRepliesSpeedChange?: (speed: number) => void;
  onVoiceRepliesPreview?: (voiceId: string | null, voiceName: string) => void;
  onGatewayDisconnect?: () => void;
  atmAnalytics?: OfficeUsageAnalyticsParams | null;
  feedEvents?: {
    id: string;
    name: string;
    text: string;
    ts: number;
    kind?: "status" | "reply";
  }[];
  gatewayStatus?: string;
  runCountByAgentId?: Record<string, number>;
  lastSeenByAgentId?: Record<string, number>;
  onStandupArrivalsChange?: (arrivedAgentIds: string[]) => void;
  onStandupStartRequested?: () => void;
  onMonitorSelect?: (agentId: string | null) => void;
  onDeskAssignmentChange?: (deskUid: string, agentId: string | null) => void;
  onDeskAssignmentsReset?: (deskUids: string[]) => void;
  onGithubReviewDismiss?: () => void;
  onPhoneCallComplete?: (agentId: string) => void;
  onPhoneCallSpeak?: (payload: {
    agentId: string;
    requestKey: string;
    scenario: MockPhoneCallScenario;
  }) => void;
  onTextMessageComplete?: (agentId: string) => void;
  onQaLabDismiss?: () => void;
  onOpenGithubSkillSetup?: () => void;
  onAgentEdit?: (agentId: string) => void;
}) {
  const resolvedCatTopiaSettings = useMemo(
    () => normalizeCatTopiaSettings(catTopiaSettings),
    [catTopiaSettings],
  );
  const catCuddleProfile = useMemo(
    () => resolveCatCuddleProfile(resolvedCatTopiaSettings.catCuddleLevel),
    [resolvedCatTopiaSettings.catCuddleLevel],
  );
  const catLoungeInteractionDistance =
    GARFIELD_INTERACTION_DISTANCE * catCuddleProfile.interactionDistanceScale;
  const catToCatMinDistance =
    CAT_TO_CAT_MIN_DISTANCE * catCuddleProfile.catSpacingScale;
  const catToHumanMinDistance =
    CAT_TO_HUMAN_MIN_DISTANCE * catCuddleProfile.humanSpacingScale;
  const resolvedCleaningCues = animationState?.cleaningCues ?? cleaningCues;
  const resolvedCatHoldByAgentId =
    animationState?.catHoldByAgentId ?? catHoldByAgentId;
  const resolvedDeskHoldByAgentId =
    animationState?.deskHoldByAgentId ?? deskHoldByAgentId;
  const resolvedGymHoldByAgentId =
    animationState?.gymHoldByAgentId ?? gymHoldByAgentId;
  const resolvedSmsBoothHoldByAgentId =
    animationState?.smsBoothHoldByAgentId ?? {};
  const resolvedPhoneBoothHoldByAgentId =
    animationState?.phoneBoothHoldByAgentId ?? {};
  const resolvedQaHoldByAgentId =
    animationState?.qaHoldByAgentId ?? qaHoldByAgentId;
  const resolvedGithubReviewByAgentId =
    animationState?.githubHoldByAgentId ??
    (githubReviewAgentId ? { [githubReviewAgentId]: true } : {});
  const initialFurnitureRef = useRef<FurnitureItem[] | null>(null);
  if (initialFurnitureRef.current === null) {
    initialFurnitureRef.current = buildInitialOfficeFurniture();
  }
  const [furniture, setFurniture] = useState<FurnitureItem[]>(() => [
    ...(initialFurnitureRef.current ?? []),
  ]);
  const [editMode, setEditMode] = useState(false);
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [hoverUid, setHoverUid] = useState<string | null>(null);
  const [drag, setDrag] = useState<DragState>({ kind: "idle" });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editDrawerTab, setEditDrawerTab] = useState<"objects" | "cat_topia">(
    "objects",
  );
  const [catTopiaHelpField, setCatTopiaHelpField] =
    useState<CatTopiaHelpField | null>(null);
  const [ghostPos, setGhostPos] = useState<[number, number, number] | null>(
    null,
  );
  const [wallDrawStart, setWallDrawStart] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [spaceDown, setSpaceDown] = useState(false);
  const [spaceDragging, setSpaceDragging] = useState(false);
  const [standupBoardOpen, setStandupBoardOpen] = useState(false);
  const autoOpenedStandupIdRef = useRef<string | null>(null);
  // Idea 1 (original): hovered agent for tooltip overlay.
  const [hoveredAgentId, setHoveredAgentId] = useState<string | null>(null);
  const [renderAgentUiById, setRenderAgentUiById] = useState<
    Record<string, RenderAgentUiSnapshot>
  >({});
  // New Idea 1: right-click context menu.
  const [contextMenu, setContextMenu] = useState<{
    id: string;
    x: number;
    y: number;
  } | null>(null);
  const [selectedCatChipId, setSelectedCatChipId] = useState<string | null>(null);
  const [catChipStackOpen, setCatChipStackOpen] = useState(false);
  const catChipStackRef = useRef<HTMLDivElement | null>(null);
  // New Idea 3: speech bubble agent IDs.
  const [speechAgentIds, setSpeechAgentIds] = useState<Set<string>>(new Set());
  const [localSpeechByAgentId, setLocalSpeechByAgentId] = useState<
    Record<string, string>
  >({});
  const [catCompanionTargetByAgentId, setCatCompanionTargetByAgentId] =
    useState<Record<string, GarfieldCompanionTarget>>({});
  const [catMovementPausedByAgentId, setCatMovementPausedByAgentId] = useState<
    Record<string, boolean>
  >({});
  const catNextPerchMoveAtRef = useRef<Record<string, number>>({});
  const catPerchKeyByAgentIdRef = useRef<Record<string, string>>({});
  const catMeowBurstByAgentIdRef = useRef<
    Record<string, GarfieldMeowBurstState | null>
  >({});
  const catNextMeowAtByAgentIdRef = useRef<Record<string, number>>({});
  const catArrivalAnnouncedRef = useRef<Record<string, boolean>>({});
  const catStallTrackerByAgentIdRef = useRef<
    Record<string, { x: number; y: number; sinceMs: number }>
  >({});
  const animalProximitySinceByPairRef = useRef<Record<string, number>>({});
  const animalPairCooldownUntilByPairRef = useRef<Record<string, number>>({});
  const animalSeparationCooldownByAgentIdRef = useRef<Record<string, number>>({});
  const localSpeechTimersRef = useRef<Record<string, number>>({});
  const catCompanionIds = useMemo(
    () =>
      agents
        .filter(
          (agent) => agent.avatarKind === "cat" || agent.avatarKind === "animal",
        )
        .map((agent) => agent.id),
    [agents],
  );
  useEffect(() => {
    const targets = resolveGarfieldPerchTargets(furniture);
    if (targets.length === 0) {
      return;
    }
    const catIdSet = new Set(catCompanionIds);
    for (const catId of catCompanionIds) {
      if (!(catId in catPerchKeyByAgentIdRef.current)) {
        catPerchKeyByAgentIdRef.current[catId] = "";
      }
      if (!(catId in catNextPerchMoveAtRef.current)) {
        catNextPerchMoveAtRef.current[catId] = Date.now() + randomGarfieldIntervalMs();
      }
      if (!(catId in catNextMeowAtByAgentIdRef.current)) {
        catNextMeowAtByAgentIdRef.current[catId] =
          Date.now() + randomGarfieldSittingMeowIntervalMs();
      }
      if (!(catId in catMeowBurstByAgentIdRef.current)) {
        catMeowBurstByAgentIdRef.current[catId] = null;
      }
      if (!(catId in catStallTrackerByAgentIdRef.current)) {
        catStallTrackerByAgentIdRef.current[catId] = {
          x: GARFIELD_HOME_TARGET.x,
          y: GARFIELD_HOME_TARGET.y,
          sinceMs: Date.now(),
        };
      }
    }
    for (const key of Object.keys(catPerchKeyByAgentIdRef.current)) {
      if (!catIdSet.has(key)) delete catPerchKeyByAgentIdRef.current[key];
    }
    for (const key of Object.keys(catNextPerchMoveAtRef.current)) {
      if (!catIdSet.has(key)) delete catNextPerchMoveAtRef.current[key];
    }
    for (const key of Object.keys(catNextMeowAtByAgentIdRef.current)) {
      if (!catIdSet.has(key)) delete catNextMeowAtByAgentIdRef.current[key];
    }
    for (const key of Object.keys(catMeowBurstByAgentIdRef.current)) {
      if (!catIdSet.has(key)) delete catMeowBurstByAgentIdRef.current[key];
    }
    for (const key of Object.keys(catStallTrackerByAgentIdRef.current)) {
      if (!catIdSet.has(key)) delete catStallTrackerByAgentIdRef.current[key];
    }
    setCatCompanionTargetByAgentId((previous) => {
      const next: Record<string, GarfieldCompanionTarget> = {};
      for (const catId of catCompanionIds) {
        const existing = previous[catId];
        if (existing) {
          next[catId] = existing;
          continue;
        }
        const randomTarget =
          targets[Math.floor(Math.random() * targets.length)] ?? GARFIELD_HOME_ROUTE;
        next[catId] = randomTarget;
        catPerchKeyByAgentIdRef.current[catId] = randomTarget.key;
      }
      return next;
    });
  }, [catCompanionIds, furniture]);
  useEffect(() => {
    const catIdSet = new Set(catCompanionIds);
    for (const visitorKey of Object.keys(catArrivalAnnouncedRef.current)) {
      const [visitorId, catId] = visitorKey.split("::");
      if (!visitorId || !catId || !catIdSet.has(catId)) {
        delete catArrivalAnnouncedRef.current[visitorKey];
      }
    }
  }, [catCompanionIds]);
  const queueLocalSpeech = useCallback(
    (agentId: string, text: string, durationMs = 7_500) => {
      const normalized = text.trim();
      if (!agentId || !normalized) return;
      const existingTimer = localSpeechTimersRef.current[agentId];
      if (typeof existingTimer === "number") {
        window.clearTimeout(existingTimer);
      }
      setLocalSpeechByAgentId((previous) => ({
        ...previous,
        [agentId]: normalized,
      }));
      setSpeechAgentIds((previous) => new Set([...previous, agentId]));
      const timerId = window.setTimeout(() => {
        setLocalSpeechByAgentId((previous) => {
          const next = { ...previous };
          delete next[agentId];
          return next;
        });
        setSpeechAgentIds((previous) => {
          const next = new Set(previous);
          next.delete(agentId);
          return next;
        });
        delete localSpeechTimersRef.current[agentId];
      }, durationMs);
      localSpeechTimersRef.current[agentId] = timerId;
    },
    [],
  );
  const statusFeedEvents = useMemo(
    () => feedEvents.filter((event) => event.kind !== "reply"),
    [feedEvents],
  );
  const { speechTextByAgentId, speechImageUrlByAgentId } = useMemo(() => {
    const texts: Record<string, string> = {};
    const images: Record<string, string> = {};
    for (const event of feedEvents) {
      const text = event.text.trim();
      if (event.kind !== "reply" || !text || texts[event.id]) continue;
      const { cleanText, imageUrl } = extractSpeechImage(text, event.id);
      const speechText = clampOverlayText(cleanText, SPEECH_BUBBLE_TEXT_MAX_CHARS);
      if (!speechText) continue;
      texts[event.id] = speechText;
      if (imageUrl) images[event.id] = imageUrl;
    }
    return { speechTextByAgentId: texts, speechImageUrlByAgentId: images };
  }, [feedEvents]);
  const standupSpeechTextByAgentId = useMemo(() => {
    if (!standupMeeting || standupMeeting.phase !== "in_progress") return {};
    const currentCard =
      standupMeeting.cards.find(
        (card) => card.agentId === standupMeeting.currentSpeakerAgentId,
      ) ?? null;
    if (!currentCard) return {};
    return { [currentCard.agentId]: currentCard.speech };
  }, [standupMeeting]);
  const suppressSceneSpeechBubbles =
    standupMeeting?.phase === "gathering" ||
    standupMeeting?.phase === "in_progress";
  // New Idea 2: camera preset target ref (shared into Canvas).
  const cameraPresetRef = useRef<{
    pos: [number, number, number];
    target: [number, number, number];
    zoom?: number;
  } | null>(null);
  // New Idea 7: heatmap mode.
  const [heatmapMode, setHeatmapMode] = useState(false);
  const [trailMode, setTrailMode] = useState(false);
  const heatGridRef = useRef<Uint16Array | null>(null);
  // New Idea 4: day/night time ref exposed from DayNightCycle.
  const dayNightTimeRef = useRef(0.25);
  // E3 Idea 1: mood emoji reactions above agent chips.
  const [moodByAgentId, setMoodByAgentId] = useState<
    Record<string, { emoji: string; ts: number }>
  >({});
  const [janitorActors, setJanitorActors] = useState<JanitorActor[]>([]);
  const seenCleaningCueIdsRef = useRef<Set<string>>(new Set());
  // E3 Idea 3: spotlight.
  const [spotlightAgentId, setSpotlightAgentId] = useState<string | null>(null);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orbitRef = useRef<any>(null);
  // Follow cam: which agent to trail with a third-person perspective camera.
  const [followAgentId, setFollowAgentId] = useState<string | null>(null);
  const followAgentIdRef = useRef<string | null>(null);
  const prevMonitorAgentIdRef = useRef<string | null>(null);
  const prevAtmUidRef = useRef<string | null>(null);
  const prevSmsBoothViewRef = useRef<string | null>(null);
  const prevPhoneBoothViewRef = useRef<string | null>(null);
  const prevGithubViewRef = useRef<string | null>(null);
  const prevQaViewRef = useRef<string | null>(null);
  const [monitorImmersiveReady, setMonitorImmersiveReady] = useState(false);
  const [activeAtmUid, setActiveAtmUid] = useState<string | null>(null);
  const [atmImmersiveReady, setAtmImmersiveReady] = useState(false);
  const [phoneBoothCommandArrived, setPhoneBoothCommandArrived] = useState(false);
  const [phoneBoothImmersiveReady, setPhoneBoothImmersiveReady] = useState(false);
  const [phoneBoothDoorOpen, setPhoneBoothDoorOpen] = useState(false);
  const [phoneCallStep, setPhoneCallStep] = useState<PhoneCallStep>("dialing");
  const [dialedDigits, setDialedDigits] = useState("");
  const [smsBoothCommandArrived, setSmsBoothCommandArrived] = useState(false);
  const [smsBoothImmersiveReady, setSmsBoothImmersiveReady] = useState(false);
  const [smsBoothDoorOpen, setSmsBoothDoorOpen] = useState(false);
  const [textMessageStep, setTextMessageStep] =
    useState<TextMessageStep>("selecting_contact");
  const [typedMessageText, setTypedMessageText] = useState("");
  const [activeTextKey, setActiveTextKey] = useState<string | null>(null);
  const [textContacts, setTextContacts] = useState<string[]>([]);
  const [activeTextContactIndex, setActiveTextContactIndex] = useState<number | null>(
    null,
  );
  const [manualPhoneBoothOpen, setManualPhoneBoothOpen] = useState(false);
  const [manualPhoneCallScenario, setManualPhoneCallScenario] =
    useState<MockPhoneCallScenario | null>(null);
  const [manualSmsBoothOpen, setManualSmsBoothOpen] = useState(false);
  const [manualTextMessageScenario, setManualTextMessageScenario] =
    useState<MockTextMessageScenario | null>(null);
  const activePhoneCallFlowKeyRef = useRef<string | null>(null);
  const activeTextMessageFlowKeyRef = useRef<string | null>(null);
  const boothAudioCtxRef = useRef<AudioContext | null>(null);
  const effectivePhoneBoothAgentIdRef = useRef<string | null>(null);
  const effectivePhoneCallScenarioRef = useRef<MockPhoneCallScenario | null>(null);
  const phoneBoothAgentIdRef = useRef<string | null>(null);
  const onPhoneCallSpeakRef = useRef(onPhoneCallSpeak);
  const onPhoneCallCompleteRef = useRef(onPhoneCallComplete);
  const effectiveSmsBoothAgentIdRef = useRef<string | null>(null);
  const effectiveTextMessageScenarioRef = useRef<MockTextMessageScenario | null>(null);
  const smsBoothAgentIdRef = useRef<string | null>(null);
  const onTextMessageCompleteRef = useRef(onTextMessageComplete);
  const [activeGithubTerminalUid, setActiveGithubTerminalUid] = useState<
    string | null
  >(null);
  const [activeQaTerminalUid, setActiveQaTerminalUid] = useState<string | null>(
    null,
  );
  const [githubImmersiveReady, setGithubImmersiveReady] = useState(false);
  const [qaImmersiveReady, setQaImmersiveReady] = useState(false);

  useEffect(() => {
    markAtmMigrationApplied();
  }, []);

  useEffect(() => {
    markPhoneBoothMigrationApplied();
  }, []);

  useEffect(() => {
    markSmsBoothMigrationApplied();
  }, []);

  useEffect(() => {
    markServerRoomMigrationApplied();
  }, []);

  useEffect(() => {
    markGymRoomMigrationApplied();
  }, []);

  useEffect(() => {
    markQaLabMigrationApplied();
  }, []);

  useEffect(() => {
    followAgentIdRef.current = followAgentId;
  }, [followAgentId]);

  useEffect(() => {
    if (!editMode) {
      setCatTopiaHelpField(null);
    }
  }, [editMode]);

  // Derive per-agent colors from the agents prop (stable, no state needed).
  const agentColorMap = useMemo(
    () =>
      new Map(
        [...agents, ...janitorActors].map((actor) => [actor.id, actor.color]),
      ),
    [agents, janitorActors],
  );

  const deskItems = useMemo(
    () => furniture.filter((item) => item.type === "desk_cubicle"),
    [furniture],
  );
  const deskLocations = useMemo(() => getDeskLocations(furniture), [furniture]);
  const assignedDeskIndexByAgentId = useMemo(() => {
    const next: Record<string, number> = {};
    deskItems.forEach((item, index) => {
      const agentId = deskAssignmentByDeskUid[item._uid];
      if (!agentId) return;
      next[agentId] = index;
    });
    return next;
  }, [deskAssignmentByDeskUid, deskItems]);
  const janitorCleaningStops = useMemo(
    () => getJanitorCleaningStops(furniture),
    [furniture],
  );
  const gymWorkoutLocations = useMemo(
    () => getGymWorkoutLocations(furniture),
    [furniture],
  );
  const qaLabStations = useMemo(() => getQaLabStations(furniture), [furniture]);
  const meetingSeatLocations = useMemo(
    () => getMeetingSeatLocations(furniture),
    [furniture],
  );

  // Keep a stable ref to furniture so the tick callback can read it without
  // being recreated every time furniture changes.
  const furnitureRef = useRef<FurnitureItem[]>(furniture);
  useEffect(() => {
    furnitureRef.current = furniture;
  }, [furniture]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      const now = Date.now();
      setJanitorActors((previous) => pruneExpiredJanitorActors(previous, now));
    }, 1000);
    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    if (resolvedCleaningCues.length === 0) return;
    const unseenCues = resolvedCleaningCues.filter(
      (cue) => !seenCleaningCueIdsRef.current.has(cue.id),
    );
    if (unseenCues.length === 0) return;
    for (const cue of unseenCues) {
      seenCleaningCueIdsRef.current.add(cue.id);
    }
    const maxSeenCueIds = Math.max(resolvedCleaningCues.length * 4, 24);
    while (seenCleaningCueIdsRef.current.size > maxSeenCueIds) {
      const oldestCueId = seenCleaningCueIdsRef.current.values().next().value;
      if (!oldestCueId) break;
      seenCleaningCueIdsRef.current.delete(oldestCueId);
    }
    const spawnedActors = unseenCues.flatMap((cue) =>
      buildJanitorActorsForCue(cue, janitorCleaningStops),
    );
    if (spawnedActors.length === 0) return;
    setJanitorActors((previous) => {
      const now = Date.now();
      return [...pruneExpiredJanitorActors(previous, now), ...spawnedActors];
    });
  }, [janitorCleaningStops, resolvedCleaningCues]);

  const sceneAgents = useMemo<SceneActor[]>(
    () => [...agents, ...janitorActors],
    [agents, janitorActors],
  );

  const { renderAgentsRef, renderAgentLookupRef, tick, deskByAgentRef, planPath } =
    useAgentTick(
    sceneAgents,
    deskLocations,
    assignedDeskIndexByAgentId,
    gymWorkoutLocations,
    qaLabStations,
    meetingSeatLocations,
    furnitureRef,
    lastSeenByAgentId,
    resolvedDeskHoldByAgentId,
    resolvedGymHoldByAgentId,
    resolvedCatHoldByAgentId,
    resolvedSmsBoothHoldByAgentId,
    resolvedPhoneBoothHoldByAgentId,
    resolvedQaHoldByAgentId,
    resolvedGithubReviewByAgentId,
    catCompanionTargetByAgentId,
    catMovementPausedByAgentId,
    standupMeeting,
    resolvedCatTopiaSettings.catCuddleLevel,
    );
  useEffect(() => {
    const syncRenderAgentUi = () => {
      const next: Record<string, RenderAgentUiSnapshot> = {};
      for (const agent of renderAgentsRef.current) {
        next[agent.id] = {
          state: agent.state,
          status: agent.status,
        };
      }
      setRenderAgentUiById(next);
    };

    syncRenderAgentUi();
    const timer = window.setInterval(syncRenderAgentUi, 250);
    return () => {
      window.clearInterval(timer);
    };
  }, [renderAgentsRef]);
  const activeMonitor = monitorAgentId
    ? (monitorByAgentId[monitorAgentId] ?? null)
    : null;
  const agentStatusLookup = useMemo(
    () =>
      agents.reduce<Record<string, { isError: boolean; working: boolean }>>((acc, agent) => {
        const renderAgent = renderAgentUiById[agent.id];
        acc[agent.id] = {
          isError: renderAgent?.status === "error" || agent.status === "error",
          working:
            renderAgent?.state === "sitting" ||
            renderAgent?.status === "working" ||
            agent.status === "working",
        };
        return acc;
      }, {}),
    [agents, renderAgentUiById],
  );
  const catAgents = useMemo(
    () =>
      agents.filter(
        (agent) => agent.avatarKind === "cat" || agent.avatarKind === "animal",
      ),
    [agents],
  );
  const nonCatAgents = useMemo(
    () => agents.filter((agent) => agent.avatarKind === "human"),
    [agents],
  );
  const selectedCatChipAgent = useMemo(
    () =>
      catAgents.find((agent) => agent.id === selectedCatChipId) ??
      catAgents[0] ??
      null,
    [catAgents, selectedCatChipId],
  );
  const topBarAgents = useMemo(() => {
    if (!selectedCatChipAgent) return nonCatAgents;
    return [...nonCatAgents, selectedCatChipAgent];
  }, [nonCatAgents, selectedCatChipAgent]);
  useEffect(() => {
    if (catAgents.length === 0) {
      if (selectedCatChipId !== null) {
        setSelectedCatChipId(null);
      }
      if (catChipStackOpen) {
        setCatChipStackOpen(false);
      }
      return;
    }
    if (
      !selectedCatChipId ||
      !catAgents.some((agent) => agent.id === selectedCatChipId)
    ) {
      setSelectedCatChipId(catAgents[0]?.id ?? null);
    }
  }, [catAgents, selectedCatChipId, catChipStackOpen]);
  useEffect(() => {
    if (!catChipStackOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (catChipStackRef.current?.contains(event.target as Node)) return;
      setCatChipStackOpen(false);
    };
    window.addEventListener("pointerdown", handlePointerDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [catChipStackOpen]);
  const hoveredAgent = useMemo(
    () => (hoveredAgentId ? agents.find((agent) => agent.id === hoveredAgentId) ?? null : null),
    [agents, hoveredAgentId],
  );
  const hoveredAgentStatus = hoveredAgentId ? agentStatusLookup[hoveredAgentId] ?? null : null;
  const handleAgentHover = useCallback((agentId: string) => {
    setHoveredAgentId(agentId);
  }, []);
  const handleAgentUnhover = useCallback(() => {
    setHoveredAgentId(null);
  }, []);
  const handleAgentClick = useCallback(
    (agentId: string) => {
      const agent = renderAgentLookupRef.current.get(agentId);
      if (!agent) return;
      const isCatCompanion =
        "avatarKind" in agent &&
        (agent.avatarKind === "cat" || agent.avatarKind === "animal");
      if (isCatCompanion) {
        queueLocalSpeech(
          agentId,
          pickRandomLine(GARFIELD_PET_LINES, "purr..."),
          6_800,
        );
        const activeVisitorId =
          Object.entries(resolvedCatHoldByAgentId).find(
            ([candidateId, held]) =>
              held &&
              candidateId !== agentId &&
              agents.some((candidate) => candidate.id === candidateId),
          )?.[0] ?? null;
        if (activeVisitorId) {
          queueLocalSpeech(
            activeVisitorId,
            pickRandomLine(
              GARFIELD_PET_AGENT_LINES,
              "That was a great morale break.",
            ),
            6_500,
          );
        }
        setMoodByAgentId((previous) => ({
          ...previous,
          [agentId]: { emoji: "😺", ts: Date.now() },
          ...(activeVisitorId
            ? { [activeVisitorId]: { emoji: "😄", ts: Date.now() } }
            : {}),
        }));
      }
      if (!orbitRef.current) return;
      const [wx, , wz] = toWorld(agent.x, agent.y);
      orbitRef.current.target.set(wx, 0, wz);
      orbitRef.current.update();
    },
    [
      agents,
      queueLocalSpeech,
      renderAgentLookupRef,
      resolvedCatHoldByAgentId,
    ],
  );
  const handleAgentContextMenu = useCallback((agentId: string, x: number, y: number) => {
    setContextMenu({ id: agentId, x, y });
  }, []);
  const monitorImmersive = Boolean(activeMonitor && monitorImmersiveReady);
  const serverTerminal = useMemo(
    () => furniture.find((item) => item.type === "server_terminal") ?? null,
    [furniture],
  );
  const qaTerminal = useMemo(
    () => furniture.find((item) => item.type === "qa_terminal") ?? null,
    [furniture],
  );
  const wallItems = useMemo(
    () => furniture.filter((item) => item.type === "wall"),
    [furniture],
  );
  const chairItems = useMemo(
    () => furniture.filter((item) => item.type === "chair"),
    [furniture],
  );
  const activeAtm = useMemo(
    () =>
      activeAtmUid
        ? (furniture.find(
            (item) => item._uid === activeAtmUid && item.type === "atm",
          ) ?? null)
        : null,
    [activeAtmUid, furniture],
  );
  const atmImmersive = Boolean(activeAtm && atmImmersiveReady);
  const activeSmsBooth = useMemo(
    () => furniture.find((item) => item.type === "sms_booth") ?? null,
    [furniture],
  );
  const activePhoneBooth = useMemo(
    () => furniture.find((item) => item.type === "phone_booth") ?? null,
    [furniture],
  );
  const effectivePhoneCallScenario =
    phoneCallScenario ?? (manualPhoneBoothOpen ? manualPhoneCallScenario : null);
  const effectivePhoneBoothAgentId =
    phoneBoothAgentId ?? (manualPhoneBoothOpen ? "__manual_phone_booth__" : null);
  const phoneBoothViewActive =
    manualPhoneBoothOpen || Boolean(phoneBoothAgentId && phoneBoothCommandArrived);
  const activePhoneCallFlowKey = useMemo(() => {
    if (!effectivePhoneBoothAgentId || !effectivePhoneCallScenario) return null;
    return [
      effectivePhoneBoothAgentId,
      effectivePhoneCallScenario.dialNumber,
      effectivePhoneCallScenario.spokenText ?? "",
      effectivePhoneCallScenario.recipientReply ?? "",
    ].join("|");
  }, [effectivePhoneBoothAgentId, effectivePhoneCallScenario]);
  const phoneBoothImmersive = Boolean(
    activePhoneBooth &&
      effectivePhoneBoothAgentId &&
      effectivePhoneCallScenario &&
      phoneBoothViewActive &&
      phoneBoothImmersiveReady,
  );
  const effectiveTextMessageScenario =
    textMessageScenario ?? (manualSmsBoothOpen ? manualTextMessageScenario : null);
  const effectiveSmsBoothAgentId =
    smsBoothAgentId ?? (manualSmsBoothOpen ? "__manual_sms_booth__" : null);
  const smsBoothViewActive =
    manualSmsBoothOpen || Boolean(smsBoothAgentId && smsBoothCommandArrived);
  const activeTextMessageFlowKey = useMemo(() => {
    if (!effectiveSmsBoothAgentId || !effectiveTextMessageScenario) return null;
    return [
      effectiveSmsBoothAgentId,
      effectiveTextMessageScenario.recipient,
      effectiveTextMessageScenario.messageText ?? "",
      effectiveTextMessageScenario.confirmationText ?? "",
    ].join("|");
  }, [effectiveSmsBoothAgentId, effectiveTextMessageScenario]);
  const smsBoothImmersive = Boolean(
    activeSmsBooth &&
      effectiveSmsBoothAgentId &&
      effectiveTextMessageScenario &&
      smsBoothViewActive &&
      smsBoothImmersiveReady,
  );
  const meetingTable = useMemo(
    () =>
      furniture.find(
        (item) =>
          item.type === "round_table" &&
          item.x >= 0 &&
          item.x <= 290 &&
          item.y >= 0 &&
          item.y <= 235,
      ) ?? null,
    [furniture],
  );
  const activeGithubTerminal = useMemo(
    () =>
      activeGithubTerminalUid
        ? (furniture.find(
            (item) =>
              item._uid === activeGithubTerminalUid &&
              item.type === "server_terminal",
          ) ?? null)
        : serverTerminal,
    [activeGithubTerminalUid, furniture, serverTerminal],
  );
  const activeQaTerminal = useMemo(
    () =>
      activeQaTerminalUid
        ? (furniture.find(
            (item) =>
              item._uid === activeQaTerminalUid && item.type === "qa_terminal",
          ) ?? null)
        : qaTerminal,
    [activeQaTerminalUid, furniture, qaTerminal],
  );
  const [githubCommandArrived, setGithubCommandArrived] = useState(false);
  const [qaCommandArrived, setQaCommandArrived] = useState(false);
  const githubImmersive =
    Boolean(
      activeGithubTerminal &&
      (activeGithubTerminalUid ||
        (githubReviewAgentId && githubCommandArrived)),
    ) && githubImmersiveReady;
  const qaImmersive =
    Boolean(
      activeQaTerminal &&
      (activeQaTerminalUid || (qaTestingAgentId && qaCommandArrived)),
    ) && qaImmersiveReady;
  const standupImmersive = Boolean(standupBoardOpen && standupMeeting);
  const immersiveOverlayActive =
    monitorImmersive ||
    atmImmersive ||
    smsBoothImmersive ||
    phoneBoothImmersive ||
    githubImmersive ||
    qaImmersive ||
    standupImmersive;
  const standupActive =
    standupMeeting?.phase === "gathering" ||
    standupMeeting?.phase === "in_progress";
  const standupSpeakerCard =
    standupMeeting?.cards.find(
      (card) => card.agentId === standupMeeting.currentSpeakerAgentId,
    ) ?? null;
  const activeMonitorComputer = useMemo(() => {
    if (!monitorAgentId) return null;
    const deskIdx = assignedDeskIndexByAgentId[monitorAgentId];
    if (typeof deskIdx !== "number") return null;
    const computerItems = furniture.filter((item) => item.type === "computer");
    return (
      computerItems.find(
        (item) => resolveDeskIndexForItem(item, deskLocations) === deskIdx,
      ) ?? null
    );
  }, [assignedDeskIndexByAgentId, deskLocations, furniture, monitorAgentId]);
  const selectedItem = useMemo(
    () => furniture.find((item) => item._uid === selectedUid) ?? null,
    [furniture, selectedUid],
  );
  const selectedDeskAssignmentAgentId =
    selectedItem?.type === "desk_cubicle"
      ? (deskAssignmentByDeskUid[selectedItem._uid] ?? "")
      : "";

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      saveFurniture(furniture);
    }, 300);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [furniture]);

  useEffect(() => {
    if (followAgentId && monitorAgentId) {
      const timer = window.setTimeout(() => {
        setFollowAgentId(null);
      }, 0);
      return () => {
        window.clearTimeout(timer);
      };
    }
  }, [followAgentId, monitorAgentId]);

  useEffect(() => {
    if (followAgentId && activeAtmUid) {
      const timer = window.setTimeout(() => {
        setFollowAgentId(null);
      }, 0);
      return () => {
        window.clearTimeout(timer);
      };
    }
  }, [activeAtmUid, followAgentId]);

  useEffect(() => {
    if (followAgentId && smsBoothAgentId) {
      const timer = window.setTimeout(() => {
        setFollowAgentId(null);
      }, 0);
      return () => {
        window.clearTimeout(timer);
      };
    }
  }, [followAgentId, smsBoothAgentId]);

  useEffect(() => {
    if (followAgentId && phoneBoothAgentId) {
      const timer = window.setTimeout(() => {
        setFollowAgentId(null);
      }, 0);
      return () => {
        window.clearTimeout(timer);
      };
    }
  }, [followAgentId, phoneBoothAgentId]);

  useEffect(() => {
    if (manualSmsBoothOpen && smsBoothAgentId) {
      const timer = window.setTimeout(() => {
        setManualSmsBoothOpen(false);
        setManualTextMessageScenario(null);
      }, 0);
      return () => {
        window.clearTimeout(timer);
      };
    }
  }, [manualSmsBoothOpen, smsBoothAgentId]);

  useEffect(() => {
    if (manualPhoneBoothOpen && phoneBoothAgentId) {
      const timer = window.setTimeout(() => {
        setManualPhoneBoothOpen(false);
        setManualPhoneCallScenario(null);
      }, 0);
      return () => {
        window.clearTimeout(timer);
      };
    }
  }, [manualPhoneBoothOpen, phoneBoothAgentId]);

  useEffect(() => {
    effectiveSmsBoothAgentIdRef.current = effectiveSmsBoothAgentId;
    effectiveTextMessageScenarioRef.current = effectiveTextMessageScenario;
    smsBoothAgentIdRef.current = smsBoothAgentId;
    onTextMessageCompleteRef.current = onTextMessageComplete;
    effectivePhoneBoothAgentIdRef.current = effectivePhoneBoothAgentId;
    effectivePhoneCallScenarioRef.current = effectivePhoneCallScenario;
    phoneBoothAgentIdRef.current = phoneBoothAgentId;
    onPhoneCallSpeakRef.current = onPhoneCallSpeak;
    onPhoneCallCompleteRef.current = onPhoneCallComplete;
  }, [
    effectiveSmsBoothAgentId,
    effectiveTextMessageScenario,
    onTextMessageComplete,
    smsBoothAgentId,
    effectivePhoneBoothAgentId,
    effectivePhoneCallScenario,
    onPhoneCallComplete,
    onPhoneCallSpeak,
    phoneBoothAgentId,
  ]);

  const closeManualPhoneBoothView = useCallback(() => {
    activePhoneCallFlowKeyRef.current = null;
    setManualPhoneBoothOpen(false);
    setManualPhoneCallScenario(null);
    setPhoneBoothImmersiveReady(false);
    setPhoneBoothDoorOpen(false);
    setPhoneBoothCommandArrived(false);
    setPhoneCallStep("dialing");
    setDialedDigits("");
    if (
      !followAgentId &&
      !monitorAgentId &&
      !activeAtmUid &&
      !activeGithubTerminalUid &&
      !activeQaTerminalUid
    ) {
      cameraPresetRef.current = CAMERA_PRESET_MAP.overview;
    }
  }, [
    activeAtmUid,
    activeGithubTerminalUid,
    activeQaTerminalUid,
    followAgentId,
    monitorAgentId,
  ]);

  const closeManualSmsBoothView = useCallback(() => {
    activeTextMessageFlowKeyRef.current = null;
    setManualSmsBoothOpen(false);
    setManualTextMessageScenario(null);
    setSmsBoothImmersiveReady(false);
    setSmsBoothDoorOpen(false);
    setSmsBoothCommandArrived(false);
    setTextMessageStep("selecting_contact");
    setTypedMessageText("");
    setActiveTextKey(null);
    setTextContacts([]);
    setActiveTextContactIndex(null);
    if (
      !followAgentId &&
      !monitorAgentId &&
      !activeAtmUid &&
      !activeGithubTerminalUid &&
      !activeQaTerminalUid
    ) {
      cameraPresetRef.current = CAMERA_PRESET_MAP.overview;
    }
  }, [
    activeAtmUid,
    activeGithubTerminalUid,
    activeQaTerminalUid,
    followAgentId,
    monitorAgentId,
  ]);

  const getBoothAudioContext = useCallback(async () => {
    if (typeof window === "undefined") return null;
    const AudioContextCtor =
      window.AudioContext ||
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ((window as any).webkitAudioContext as typeof AudioContext | undefined);
    if (!AudioContextCtor) return null;
    if (!boothAudioCtxRef.current) {
      boothAudioCtxRef.current = new AudioContextCtor();
    }
    if (boothAudioCtxRef.current.state === "suspended") {
      await boothAudioCtxRef.current.resume();
    }
    return boothAudioCtxRef.current;
  }, []);

  const playPhoneKeyTone = useCallback(async () => {
    const audioContext = await getBoothAudioContext();
    if (!audioContext) return;
    const now = audioContext.currentTime;
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.type = "square";
    oscillator.frequency.setValueAtTime(1320, now);
    gainNode.gain.setValueAtTime(0.0001, now);
    gainNode.gain.exponentialRampToValueAtTime(0.028, now + 0.006);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.09);
  }, [getBoothAudioContext]);

  const playTextKeyTone = useCallback(
    async (options?: { frequency?: number; durationMs?: number; gain?: number }) => {
      const audioContext = await getBoothAudioContext();
      if (!audioContext) return;
      const now = audioContext.currentTime;
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      const frequency = options?.frequency ?? 920;
      const duration = (options?.durationMs ?? 58) / 1000;
      const peakGain = options?.gain ?? 0.018;
      oscillator.type = "triangle";
      oscillator.frequency.setValueAtTime(frequency, now);
      gainNode.gain.setValueAtTime(0.0001, now);
      gainNode.gain.exponentialRampToValueAtTime(peakGain, now + 0.004);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.start(now);
      oscillator.stop(now + duration + 0.01);
    },
    [getBoothAudioContext],
  );

  const playPhoneRingTone = useCallback(async () => {
    const audioContext = await getBoothAudioContext();
    if (!audioContext) return 1400;
    const now = audioContext.currentTime;
    const gainNode = audioContext.createGain();
    gainNode.gain.setValueAtTime(0.0001, now);
    gainNode.connect(audioContext.destination);

    const oscillatorA = audioContext.createOscillator();
    oscillatorA.type = "sine";
    oscillatorA.frequency.setValueAtTime(440, now);
    oscillatorA.connect(gainNode);

    const oscillatorB = audioContext.createOscillator();
    oscillatorB.type = "sine";
    oscillatorB.frequency.setValueAtTime(480, now);
    oscillatorB.connect(gainNode);

    gainNode.gain.exponentialRampToValueAtTime(0.05, now + 0.04);
    gainNode.gain.exponentialRampToValueAtTime(0.05, now + 0.44);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.64);
    gainNode.gain.setValueAtTime(0.0001, now + 0.86);
    gainNode.gain.exponentialRampToValueAtTime(0.05, now + 0.9);
    gainNode.gain.exponentialRampToValueAtTime(0.05, now + 1.24);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 1.36);

    oscillatorA.start(now);
    oscillatorB.start(now);
    oscillatorA.stop(now + 1.38);
    oscillatorB.stop(now + 1.38);
    return 1400;
  }, [getBoothAudioContext]);

  const playBoothVoice = useCallback(
    async (text: string): Promise<void> => {
      try {
        const response = await fetch("/api/office/voice/reply", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text,
            voiceId: voiceRepliesVoiceId ?? undefined,
            speed: voiceRepliesSpeed ?? 1,
          }),
        });
        if (!response.ok) return;
        const blob = await response.blob();
        const audioContext = await getBoothAudioContext();
        if (!audioContext) return;
        if (audioContext.state === "suspended") {
          await audioContext.resume();
        }
        const arrayBuffer = await blob.arrayBuffer();
        const decoded = await audioContext.decodeAudioData(arrayBuffer.slice(0));
        const source = audioContext.createBufferSource();
        source.buffer = decoded;
        source.connect(audioContext.destination);
        source.start();
      } catch (error) {
        console.warn("Booth voice playback failed.", error);
      }
    },
    [getBoothAudioContext, voiceRepliesSpeed, voiceRepliesVoiceId],
  );

  useEffect(() => {
    if (followAgentId && (activeGithubTerminalUid || githubReviewAgentId)) {
      const timer = window.setTimeout(() => {
        setFollowAgentId(null);
      }, 0);
      return () => {
        window.clearTimeout(timer);
      };
    }
  }, [activeGithubTerminalUid, followAgentId, githubReviewAgentId]);

  useEffect(() => {
    if (followAgentId && (activeQaTerminalUid || qaTestingAgentId)) {
      const timer = window.setTimeout(() => {
        setFollowAgentId(null);
      }, 0);
      return () => {
        window.clearTimeout(timer);
      };
    }
  }, [activeQaTerminalUid, followAgentId, qaTestingAgentId]);

  useEffect(() => {
    if (monitorAgentId && activeAtmUid) {
      const timer = window.setTimeout(() => {
        setActiveAtmUid(null);
      }, 0);
      return () => {
        window.clearTimeout(timer);
      };
    }
  }, [activeAtmUid, monitorAgentId]);

  useEffect(() => {
    if (monitorAgentId && activeGithubTerminalUid) {
      const timer = window.setTimeout(() => {
        setActiveGithubTerminalUid(null);
      }, 0);
      return () => {
        window.clearTimeout(timer);
      };
    }
  }, [activeGithubTerminalUid, monitorAgentId]);

  useEffect(() => {
    if (monitorAgentId && activeQaTerminalUid) {
      const timer = window.setTimeout(() => {
        setActiveQaTerminalUid(null);
      }, 0);
      return () => {
        window.clearTimeout(timer);
      };
    }
  }, [activeQaTerminalUid, monitorAgentId]);

  useEffect(() => {
    if (activeAtmUid && activeGithubTerminalUid) {
      const timer = window.setTimeout(() => {
        setActiveGithubTerminalUid(null);
      }, 0);
      return () => {
        window.clearTimeout(timer);
      };
    }
  }, [activeAtmUid, activeGithubTerminalUid]);

  useEffect(() => {
    if (activeAtmUid && activeQaTerminalUid) {
      const timer = window.setTimeout(() => {
        setActiveQaTerminalUid(null);
      }, 0);
      return () => {
        window.clearTimeout(timer);
      };
    }
  }, [activeAtmUid, activeQaTerminalUid]);

  useEffect(() => {
    if (!smsBoothAgentId) return;
    const timer = window.setTimeout(() => {
      if (activeAtmUid) {
        setActiveAtmUid(null);
      }
      if (activeGithubTerminalUid) {
        setActiveGithubTerminalUid(null);
      }
      if (activeQaTerminalUid) {
        setActiveQaTerminalUid(null);
      }
      if (monitorAgentId) {
        onMonitorSelect?.(null);
      }
    }, 0);
    return () => {
      window.clearTimeout(timer);
    };
  }, [
    activeAtmUid,
    activeGithubTerminalUid,
    activeQaTerminalUid,
    monitorAgentId,
    onMonitorSelect,
    smsBoothAgentId,
  ]);

  useEffect(() => {
    if (!phoneBoothAgentId) return;
    const timer = window.setTimeout(() => {
      if (activeAtmUid) {
        setActiveAtmUid(null);
      }
      if (activeGithubTerminalUid) {
        setActiveGithubTerminalUid(null);
      }
      if (activeQaTerminalUid) {
        setActiveQaTerminalUid(null);
      }
      if (monitorAgentId) {
        onMonitorSelect?.(null);
      }
    }, 0);
    return () => {
      window.clearTimeout(timer);
    };
  }, [
    activeAtmUid,
    activeGithubTerminalUid,
    activeQaTerminalUid,
    monitorAgentId,
    onMonitorSelect,
    phoneBoothAgentId,
  ]);

  useEffect(() => {
    if (activeGithubTerminalUid && activeQaTerminalUid) {
      const timer = window.setTimeout(() => {
        setActiveQaTerminalUid(null);
      }, 0);
      return () => {
        window.clearTimeout(timer);
      };
    }
  }, [activeGithubTerminalUid, activeQaTerminalUid]);

  useEffect(() => {
    const syncArrivalState = () => {
      const agentLookup = renderAgentLookupRef.current;

      if (!githubReviewAgentId) {
        setGithubCommandArrived(false);
      } else {
        const agent = agentLookup.get(githubReviewAgentId);
        const arrived = Boolean(
          agent &&
            Math.hypot(
              agent.x - SERVER_ROOM_TARGET.x,
              agent.y - SERVER_ROOM_TARGET.y,
            ) < 16,
        );
        setGithubCommandArrived((current) =>
          current === arrived ? current : arrived,
        );
      }

      if (!qaTestingAgentId) {
        setQaCommandArrived(false);
      } else {
        const agent = agentLookup.get(qaTestingAgentId);
        const arrived = Boolean(
          agent &&
            agent.interactionTarget === "qa_lab" &&
            agent.qaLabStage === "station" &&
            Math.hypot(agent.x - agent.targetX, agent.y - agent.targetY) < 16,
        );
        setQaCommandArrived((current) => (current === arrived ? current : arrived));
      }

      if (!phoneBoothAgentId) {
        setPhoneBoothCommandArrived(false);
        if (!manualPhoneBoothOpen) {
          setPhoneBoothDoorOpen(false);
        }
      } else {
        const agent = agentLookup.get(phoneBoothAgentId);
        const arrived = Boolean(
          agent &&
            agent.interactionTarget === "phone_booth" &&
            agent.phoneBoothStage === "receiver" &&
            Math.hypot(agent.x - agent.targetX, agent.y - agent.targetY) < 16,
        );
        const doorOpen = Boolean(
          agent &&
            agent.interactionTarget === "phone_booth" &&
            agent.phoneBoothStage !== undefined &&
            agent.phoneBoothStage !== "door_outer",
        );
        setPhoneBoothCommandArrived((current) =>
          current === arrived ? current : arrived,
        );
        setPhoneBoothDoorOpen((current) =>
          current === doorOpen ? current : doorOpen,
        );
      }

      if (!smsBoothAgentId) {
        setSmsBoothCommandArrived(false);
        if (!manualSmsBoothOpen) {
          setSmsBoothDoorOpen(false);
        }
      } else {
        const agent = agentLookup.get(smsBoothAgentId);
        const arrived = Boolean(
          agent &&
            agent.interactionTarget === "sms_booth" &&
            agent.smsBoothStage === "typing" &&
            Math.hypot(agent.x - agent.targetX, agent.y - agent.targetY) < 16,
        );
        const doorOpen = Boolean(
          agent &&
            agent.interactionTarget === "sms_booth" &&
            agent.smsBoothStage !== undefined &&
            agent.smsBoothStage !== "door_outer",
        );
        setSmsBoothCommandArrived((current) =>
          current === arrived ? current : arrived,
        );
        setSmsBoothDoorOpen((current) => (current === doorOpen ? current : doorOpen));
      }

      if (!standupActive || !standupMeeting) {
        onStandupArrivalsChange?.([]);
        return;
      }

      const arrivedParticipants = standupMeeting.participantOrder.filter((agentId) => {
        const agent = agentLookup.get(agentId);
        if (!agent || agent.interactionTarget !== "meeting_room") return false;
        return Math.hypot(agent.x - agent.targetX, agent.y - agent.targetY) < 18;
      });
      onStandupArrivalsChange?.(arrivedParticipants);
    };

    syncArrivalState();
    const intervalId = window.setInterval(syncArrivalState, 150);
    return () => {
      window.clearInterval(intervalId);
    };
  }, [
    githubReviewAgentId,
    manualSmsBoothOpen,
    manualPhoneBoothOpen,
    onStandupArrivalsChange,
    phoneBoothAgentId,
    qaTestingAgentId,
    renderAgentLookupRef,
    smsBoothAgentId,
    standupActive,
    standupMeeting,
  ]);

  useEffect(() => {
    const resetTimer = window.setTimeout(() => {
      setSmsBoothImmersiveReady(false);
    }, 0);
    if (!smsBoothViewActive || !effectiveTextMessageScenario) {
      return () => {
        window.clearTimeout(resetTimer);
      };
    }
    const timer = window.setTimeout(() => {
      setSmsBoothImmersiveReady(true);
    }, 900);
    return () => {
      window.clearTimeout(resetTimer);
      window.clearTimeout(timer);
    };
  }, [effectiveTextMessageScenario, smsBoothViewActive]);

  useEffect(() => {
    if (!smsBoothImmersive || !activeTextMessageFlowKey) {
      activeTextMessageFlowKeyRef.current = null;
      const timer = window.setTimeout(() => {
        setTextMessageStep("selecting_contact");
        setTypedMessageText("");
        setActiveTextKey(null);
        setTextContacts([]);
        setActiveTextContactIndex(null);
      }, 0);
      return () => {
        window.clearTimeout(timer);
      };
    }
    if (activeTextMessageFlowKeyRef.current === activeTextMessageFlowKey) {
      return;
    }
    activeTextMessageFlowKeyRef.current = activeTextMessageFlowKey;
    const scenario = effectiveTextMessageScenarioRef.current;
    if (!scenario?.messageText?.trim()) {
      return;
    }
    const { contacts, targetIndex } = buildSmsContactList(scenario.recipient);
    const initTimer = window.setTimeout(() => {
      setTextMessageStep("selecting_contact");
      setTypedMessageText("");
      setActiveTextKey(null);
      setTextContacts(contacts);
      setActiveTextContactIndex(0);
    }, 0);
    let index = 0;
    let contactIndex = 0;
    let contactTimer: number | null = null;
    let typingTimer: number | null = null;
    let stageTimer: number | null = null;
    let keyResetTimer: number | null = null;

    const resolveKeyboardKey = (character: string): string | null => {
      if (!character) return null;
      if (character === " ") return "space";
      if (character === "\n") return "return";
      const normalized = character.toLowerCase();
      if (/^[a-z]$/.test(normalized)) return normalized;
      if ([",", ".", "?", "!"].includes(normalized)) return normalized;
      if (normalized === "'") return "'";
      return null;
    };

    const clearActiveKey = () => {
      if (keyResetTimer !== null) {
        window.clearTimeout(keyResetTimer);
        keyResetTimer = null;
      }
      setActiveTextKey(null);
    };

    const pulseKeyboardKey = (
      key: string,
      options?: { frequency?: number; durationMs?: number; gain?: number },
    ) => {
      setActiveTextKey(key);
      void playTextKeyTone(options);
      if (keyResetTimer !== null) {
        window.clearTimeout(keyResetTimer);
      }
      keyResetTimer = window.setTimeout(() => {
        setActiveTextKey(null);
        keyResetTimer = null;
      }, 110);
    };

    const finishTextFlow = () => {
      stageTimer = window.setTimeout(() => {
        setTextMessageStep("delivered");
        stageTimer = window.setTimeout(() => {
          setTextMessageStep("reply");
          stageTimer = window.setTimeout(() => {
            setTextMessageStep("complete");
            stageTimer = window.setTimeout(() => {
              if (smsBoothAgentIdRef.current) {
                onTextMessageCompleteRef.current?.(smsBoothAgentIdRef.current);
              } else {
                closeManualSmsBoothView();
              }
            }, 1800);
          }, 1400);
        }, 1200);
      }, 700);
    };

    const startTyping = () => {
      setTextMessageStep("composing");
      typingTimer = window.setInterval(() => {
        index += 1;
        const nextChunk = scenario.messageText?.slice(0, index) ?? "";
        const typedCharacter = scenario.messageText?.charAt(index - 1) ?? "";
        setTypedMessageText(nextChunk);
        const pressedKey = resolveKeyboardKey(typedCharacter);
        if (pressedKey) {
          pulseKeyboardKey(pressedKey);
        }
        if (index >= (scenario.messageText?.length ?? 0) && typingTimer !== null) {
          window.clearInterval(typingTimer);
          typingTimer = null;
          clearActiveKey();
          pulseKeyboardKey("return", {
            frequency: 760,
            durationMs: 84,
            gain: 0.022,
          });
          setTextMessageStep("sending");
          finishTextFlow();
        }
      }, 80);
    };

    const openConversation = () => {
      void playTextKeyTone({
        frequency: 1020,
        durationMs: 70,
        gain: 0.02,
      });
      stageTimer = window.setTimeout(() => {
        startTyping();
      }, 280);
    };

    if (targetIndex <= 0) {
      openConversation();
    } else {
      contactTimer = window.setInterval(() => {
        contactIndex = Math.min(contactIndex + 1, targetIndex);
        setActiveTextContactIndex(contactIndex);
        void playTextKeyTone({
          frequency: 840,
          durationMs: 42,
          gain: 0.012,
        });
        if (contactIndex >= targetIndex && contactTimer !== null) {
          window.clearInterval(contactTimer);
          contactTimer = null;
          stageTimer = window.setTimeout(() => {
            openConversation();
          }, 260);
        }
      }, 180);
    }

    return () => {
      window.clearTimeout(initTimer);
      if (contactTimer !== null) {
        window.clearInterval(contactTimer);
      }
      if (typingTimer !== null) {
        window.clearInterval(typingTimer);
      }
      clearActiveKey();
      if (stageTimer !== null) {
        window.clearTimeout(stageTimer);
      }
    };
  }, [
    activeTextMessageFlowKey,
    closeManualSmsBoothView,
    playTextKeyTone,
    smsBoothImmersive,
  ]);

  useEffect(() => {
    const activeViewKey = manualSmsBoothOpen
      ? "manual"
      : smsBoothAgentId && smsBoothCommandArrived
        ? `agent:${smsBoothAgentId}`
        : null;
    if (!activeViewKey && prevSmsBoothViewRef.current) {
      cameraPresetRef.current = CAMERA_PRESET_MAP.overview;
    }
    if (!activeViewKey || !activeSmsBooth) {
      prevSmsBoothViewRef.current = activeViewKey;
      return;
    }
    const { width, height } = getItemBaseSize(activeSmsBooth);
    const [wx, , wz] = toWorld(
      activeSmsBooth.x + width / 2,
      activeSmsBooth.y + height / 2,
    );
    cameraPresetRef.current = {
      pos: [wx + 0.08, 1.05, wz + 0.72],
      target: [wx, 0.92, wz - 0.02],
      zoom: 228,
    };
    prevSmsBoothViewRef.current = activeViewKey;
  }, [activeSmsBooth, manualSmsBoothOpen, smsBoothAgentId, smsBoothCommandArrived]);

  useEffect(() => {
    const resetTimer = window.setTimeout(() => {
      setPhoneBoothImmersiveReady(false);
    }, 0);
    if (!phoneBoothViewActive || !effectivePhoneCallScenario) {
      return () => {
        window.clearTimeout(resetTimer);
      };
    }
    const timer = window.setTimeout(() => {
      setPhoneBoothImmersiveReady(true);
    }, 900);
    return () => {
      window.clearTimeout(resetTimer);
      window.clearTimeout(timer);
    };
  }, [effectivePhoneCallScenario, phoneBoothViewActive]);

  useEffect(() => {
    if (!phoneBoothImmersive || !activePhoneCallFlowKey) {
      activePhoneCallFlowKeyRef.current = null;
      const timer = window.setTimeout(() => {
        setPhoneCallStep("dialing");
        setDialedDigits("");
      }, 0);
      return () => {
        window.clearTimeout(timer);
      };
    }
    if (activePhoneCallFlowKeyRef.current === activePhoneCallFlowKey) {
      return;
    }
    activePhoneCallFlowKeyRef.current = activePhoneCallFlowKey;
    const scenario = effectivePhoneCallScenarioRef.current;
    const boothAgentId = effectivePhoneBoothAgentIdRef.current;
    if (!scenario || !boothAgentId) {
      return;
    }
    const digits = scenario.dialNumber.replace(/\s+/g, "");
    const initTimer = window.setTimeout(() => {
      setPhoneCallStep("dialing");
      setDialedDigits("");
    }, 0);
    let digitIndex = 0;
    let digitTimer: number | null = null;
    let stageTimer: number | null = null;
    let cancelled = false;

    const advanceDigits = () => {
      digitTimer = window.setInterval(() => {
        digitIndex += 1;
        const nextChunk = digits.slice(0, digitIndex);
        const nextCharacter = digits[digitIndex - 1] ?? "";
        setDialedDigits(nextChunk);
        if (/\d/.test(nextCharacter)) {
          void playPhoneKeyTone();
        }
        if (digitIndex >= digits.length && digitTimer !== null) {
          window.clearInterval(digitTimer);
          digitTimer = null;
          setPhoneCallStep("ringing");
          void playPhoneRingTone().then((ringDurationMs) => {
            if (cancelled) return;
            stageTimer = window.setTimeout(() => {
              if (cancelled) return;
              setPhoneCallStep("speaking");
              if (scenario.spokenText?.trim()) {
                void playBoothVoice(scenario.spokenText);
              }
              onPhoneCallSpeakRef.current?.({
                agentId: boothAgentId,
                requestKey: `${boothAgentId}:${scenario.dialNumber}:${scenario.spokenText ?? ""}`,
                scenario,
              });
              const speechDurationMs =
                estimatePhoneSpeechDurationMs(scenario.spokenText) + 2_500;
              stageTimer = window.setTimeout(() => {
                setPhoneCallStep("reply");
                stageTimer = window.setTimeout(() => {
                  setPhoneCallStep("complete");
                  stageTimer = window.setTimeout(() => {
                    if (phoneBoothAgentIdRef.current) {
                      onPhoneCallCompleteRef.current?.(phoneBoothAgentIdRef.current);
                    } else {
                      closeManualPhoneBoothView();
                    }
                  }, 2000);
                }, 1600);
              }, speechDurationMs);
            }, ringDurationMs);
          });
        }
      }, 170);
    };

    advanceDigits();
    return () => {
      window.clearTimeout(initTimer);
      cancelled = true;
      if (digitTimer !== null) {
        window.clearInterval(digitTimer);
      }
      if (stageTimer !== null) {
        window.clearTimeout(stageTimer);
      }
    };
  }, [
    activePhoneCallFlowKey,
    closeManualPhoneBoothView,
    phoneBoothImmersive,
    playBoothVoice,
    playPhoneKeyTone,
    playPhoneRingTone,
  ]);

  useEffect(() => {
    const activeViewKey =
      manualPhoneBoothOpen
        ? "manual"
        : phoneBoothAgentId && phoneBoothCommandArrived
          ? `agent:${phoneBoothAgentId}`
          : null;
    if (!activeViewKey && prevPhoneBoothViewRef.current) {
      cameraPresetRef.current = CAMERA_PRESET_MAP.overview;
    }
    if (!activeViewKey || !activePhoneBooth) {
      prevPhoneBoothViewRef.current = activeViewKey;
      return;
    }
    const { width, height } = getItemBaseSize(activePhoneBooth);
    const [wx, , wz] = toWorld(
      activePhoneBooth.x + width / 2,
      activePhoneBooth.y + height / 2,
    );
    cameraPresetRef.current = {
      pos: [wx + 0.1, 1.18, wz + 0.86],
      target: [wx, 1.08, wz - 0.04],
      zoom: 210,
    };
    prevPhoneBoothViewRef.current = activeViewKey;
  }, [activePhoneBooth, manualPhoneBoothOpen, phoneBoothAgentId, phoneBoothCommandArrived]);

  useEffect(() => {
    const resetTimer = window.setTimeout(() => {
      setMonitorImmersiveReady(false);
    }, 0);
    if (!monitorAgentId) {
      return () => {
        window.clearTimeout(resetTimer);
      };
    }
    const timer = window.setTimeout(() => {
      setMonitorImmersiveReady(true);
    }, 900);
    return () => {
      window.clearTimeout(resetTimer);
      window.clearTimeout(timer);
    };
  }, [monitorAgentId]);

  useEffect(() => {
    const resetTimer = window.setTimeout(() => {
      setAtmImmersiveReady(false);
    }, 0);
    if (!activeAtmUid) {
      return () => {
        window.clearTimeout(resetTimer);
      };
    }
    const timer = window.setTimeout(() => {
      setAtmImmersiveReady(true);
    }, 900);
    return () => {
      window.clearTimeout(resetTimer);
      window.clearTimeout(timer);
    };
  }, [activeAtmUid]);

  useEffect(() => {
    const resetTimer = window.setTimeout(() => {
      setGithubImmersiveReady(false);
    }, 0);
    const githubViewActive =
      Boolean(activeGithubTerminalUid) ||
      Boolean(githubReviewAgentId && githubCommandArrived);
    if (!githubViewActive) {
      return () => {
        window.clearTimeout(resetTimer);
      };
    }
    const timer = window.setTimeout(() => {
      setGithubImmersiveReady(true);
    }, 900);
    return () => {
      window.clearTimeout(resetTimer);
      window.clearTimeout(timer);
    };
  }, [activeGithubTerminalUid, githubCommandArrived, githubReviewAgentId]);

  useEffect(() => {
    const resetTimer = window.setTimeout(() => {
      setQaImmersiveReady(false);
    }, 0);
    const qaViewActive =
      Boolean(activeQaTerminalUid) ||
      Boolean(qaTestingAgentId && qaCommandArrived);
    if (!qaViewActive) {
      return () => {
        window.clearTimeout(resetTimer);
      };
    }
    const timer = window.setTimeout(() => {
      setQaImmersiveReady(true);
    }, 900);
    return () => {
      window.clearTimeout(resetTimer);
      window.clearTimeout(timer);
    };
  }, [activeQaTerminalUid, qaCommandArrived, qaTestingAgentId]);

  useEffect(() => {
    if (!standupMeeting) {
      const timer = window.setTimeout(() => {
        setStandupBoardOpen(false);
      }, 0);
      autoOpenedStandupIdRef.current = null;
      return () => {
        window.clearTimeout(timer);
      };
    }
    const everyoneArrived =
      standupMeeting.participantOrder.length > 0 &&
      standupMeeting.participantOrder.every((agentId) =>
        standupMeeting.arrivedAgentIds.includes(agentId),
      );
    if (
      !standupAutoOpenBoard ||
      standupMeeting.phase !== "in_progress" ||
      !everyoneArrived ||
      autoOpenedStandupIdRef.current === standupMeeting.id
    ) {
      return;
    }
    autoOpenedStandupIdRef.current = standupMeeting.id;
    if (meetingTable) {
      const radius = meetingTable.r ?? 60;
      const centerX = meetingTable.x + radius;
      const centerY = meetingTable.y + radius;
      const [wx, , wz] = toWorld(centerX, centerY);
      cameraPresetRef.current = {
        pos: [wx + 1.8, 1.35, wz + 1.55],
        target: [wx, 0.62, wz],
        zoom: 180,
      };
    }
    const timer = window.setTimeout(() => {
      setStandupBoardOpen(true);
    }, 900);
    return () => {
      window.clearTimeout(timer);
    };
  }, [meetingTable, standupAutoOpenBoard, standupMeeting]);

  useEffect(() => {
    if (!monitorAgentId && prevMonitorAgentIdRef.current) {
      cameraPresetRef.current = CAMERA_PRESET_MAP.overview;
    }
    if (!monitorAgentId || !activeMonitorComputer) {
      prevMonitorAgentIdRef.current = monitorAgentId;
      return;
    }
    const [wx, , wz] = toWorld(
      activeMonitorComputer.x,
      activeMonitorComputer.y,
    );
    cameraPresetRef.current = {
      pos: [wx + 0.004, 0.835, wz + 0.135],
      target: [wx + 0.002, 0.81, wz - 0.055],
      zoom: 330,
    };
    prevMonitorAgentIdRef.current = monitorAgentId;
  }, [activeMonitorComputer, monitorAgentId]);

  useEffect(() => {
    if (activeAtmUid && !activeAtm) {
      const timer = window.setTimeout(() => {
        setActiveAtmUid(null);
      }, 0);
      return () => {
        window.clearTimeout(timer);
      };
    }
  }, [activeAtm, activeAtmUid]);

  useEffect(() => {
    if (activeGithubTerminalUid && !activeGithubTerminal) {
      const timer = window.setTimeout(() => {
        setActiveGithubTerminalUid(null);
      }, 0);
      return () => {
        window.clearTimeout(timer);
      };
    }
  }, [activeGithubTerminal, activeGithubTerminalUid]);

  useEffect(() => {
    if (activeQaTerminalUid && !activeQaTerminal) {
      const timer = window.setTimeout(() => {
        setActiveQaTerminalUid(null);
      }, 0);
      return () => {
        window.clearTimeout(timer);
      };
    }
  }, [activeQaTerminal, activeQaTerminalUid]);

  useEffect(() => {
    if (!activeAtmUid && prevAtmUidRef.current) {
      cameraPresetRef.current = CAMERA_PRESET_MAP.overview;
    }
    if (!activeAtmUid || !activeAtm) {
      prevAtmUidRef.current = activeAtmUid;
      return;
    }
    const { width, height } = getItemBaseSize(activeAtm);
    const [wx, , wz] = toWorld(
      activeAtm.x + width / 2,
      activeAtm.y + height / 2,
    );
    const frontVector = new THREE.Vector3(0, 0, 1).applyAxisAngle(
      new THREE.Vector3(0, 1, 0),
      getItemRotationRadians(activeAtm),
    );
    cameraPresetRef.current = {
      pos: [wx + frontVector.x * 0.72, 0.86, wz + frontVector.z * 0.72],
      target: [wx + frontVector.x * 0.02, 0.72, wz + frontVector.z * 0.02],
      zoom: 250,
    };
    prevAtmUidRef.current = activeAtmUid;
  }, [activeAtm, activeAtmUid]);

  useEffect(() => {
    const activeViewKey = activeGithubTerminalUid
      ? `manual:${activeGithubTerminalUid}`
      : githubReviewAgentId && githubCommandArrived
        ? `agent:${githubReviewAgentId}`
        : null;
    if (!activeViewKey && prevGithubViewRef.current) {
      cameraPresetRef.current = CAMERA_PRESET_MAP.overview;
    }
    if (!activeViewKey || !activeGithubTerminal) {
      prevGithubViewRef.current = activeViewKey;
      return;
    }
    const { width, height } = getItemBaseSize(activeGithubTerminal);
    const [wx, , wz] = toWorld(
      activeGithubTerminal.x + width / 2,
      activeGithubTerminal.y + height / 2,
    );
    const frontVector = new THREE.Vector3(0, 0, 1).applyAxisAngle(
      new THREE.Vector3(0, 1, 0),
      getItemRotationRadians(activeGithubTerminal),
    );
    cameraPresetRef.current = {
      pos: [wx + frontVector.x * 0.74, 0.9, wz + frontVector.z * 0.74],
      target: [wx + frontVector.x * 0.04, 0.74, wz + frontVector.z * 0.04],
      zoom: 260,
    };
    prevGithubViewRef.current = activeViewKey;
  }, [
    activeGithubTerminal,
    activeGithubTerminalUid,
    githubCommandArrived,
    githubReviewAgentId,
  ]);

  useEffect(() => {
    const activeViewKey = activeQaTerminalUid
      ? `manual:${activeQaTerminalUid}`
      : qaTestingAgentId && qaCommandArrived
        ? `agent:${qaTestingAgentId}`
        : null;
    if (!activeViewKey && prevQaViewRef.current) {
      cameraPresetRef.current = CAMERA_PRESET_MAP.overview;
    }
    if (!activeViewKey || !activeQaTerminal) {
      prevQaViewRef.current = activeViewKey;
      return;
    }
    const { width, height } = getItemBaseSize(activeQaTerminal);
    const [wx, , wz] = toWorld(
      activeQaTerminal.x + width / 2,
      activeQaTerminal.y + height / 2,
    );
    const frontVector = new THREE.Vector3(0, 0, 1).applyAxisAngle(
      new THREE.Vector3(0, 1, 0),
      getItemRotationRadians(activeQaTerminal),
    );
    cameraPresetRef.current = {
      pos: [wx + frontVector.x * 0.8, 0.92, wz + frontVector.z * 0.8],
      target: [wx + frontVector.x * 0.04, 0.74, wz + frontVector.z * 0.04],
      zoom: 245,
    };
    prevQaViewRef.current = activeViewKey;
  }, [
    activeQaTerminal,
    activeQaTerminalUid,
    qaCommandArrived,
    qaTestingAgentId,
  ]);

  // --- Interaction ---
  const handleFurniturePointerDown = useCallback(
    (uid: string) => {
      if (!editMode) return;
      if (drag.kind === "placing") return;
      setSelectedUid(uid);
      setDrawerOpen(false);
      setDrag({ kind: "moving", uid });
    },
    [drag.kind, editMode],
  );

  const resolveAgentIdForDeskItem = useCallback(
    (uid: string) => {
      const item = furniture.find((entry) => entry._uid === uid);
      if (!item) return null;
      const deskIdx = resolveDeskIndexForItem(
        item,
        getDeskLocations(furniture),
      );
      if (deskIdx < 0) return null;
      for (const [id, index] of deskByAgentRef.current) {
        if (index === deskIdx) return id;
      }
      return null;
    },
    [deskByAgentRef, furniture],
  );

  // E3 Idea 2: click a desk to send its assigned agent to walk and sit there.
  const handleDeskClick = useCallback(
    (uid: string) => {
      if (editMode) return;
      const item = furniture.find((f) => f._uid === uid);
      if (!item) return;
      if (item.type !== "sms_booth" && manualSmsBoothOpen) {
        closeManualSmsBoothView();
      }
      if (item.type !== "phone_booth" && manualPhoneBoothOpen) {
        closeManualPhoneBoothView();
      }
      if (item.type === "pingpong") {
        const now = Date.now();
        const [tableWx, , tableWz] = toWorld(
          item.x + (item.w ?? 100) / 2,
          item.y + (item.h ?? 60) / 2,
        );
        setFollowAgentId(null);
        setActiveAtmUid(null);
        onMonitorSelect?.(null);
        cameraPresetRef.current = {
          pos: [tableWx + 2.4, 2.8, tableWz + 2.1],
          target: [tableWx, 0.45, tableWz],
          zoom: 105,
        };
        const targets = resolvePingPongTargets(item);
        const activePlayers = [...renderAgentsRef.current]
          .filter((agent) => agent.pingPongTableUid === item._uid)
          .sort(
            (left, right) =>
              (left.pingPongSide ?? 0) - (right.pingPongSide ?? 0),
          );
        const availableAgents =
          activePlayers.length === 2
            ? activePlayers
            : [...renderAgentsRef.current]
                .filter(
                  (agent) =>
                    agent.status === "idle" &&
                    agent.state !== "walking" &&
                    agent.pingPongUntil === undefined,
                )
                .sort((left, right) => {
                  const leftDistance = Math.hypot(
                    left.x - (item.x + (item.w ?? 100) / 2),
                    left.y - (item.y + (item.h ?? 60) / 2),
                  );
                  const rightDistance = Math.hypot(
                    right.x - (item.x + (item.w ?? 100) / 2),
                    right.y - (item.y + (item.h ?? 60) / 2),
                  );
                  return leftDistance - rightDistance;
                })
                .slice(0, 2);
        if (availableAgents.length < 2) return;
        availableAgents.forEach((agent, index) => {
          const target = targets[index];
          if (!target) return;
          Object.assign(agent, {
            targetX: target.x,
            targetY: target.y,
            path: planPath(agent.x, agent.y, target.x, target.y),
            facing: target.facing,
            state: "walking",
            walkSpeed: Math.max(agent.walkSpeed, PING_PONG_APPROACH_SPEED),
            pingPongUntil: now + PING_PONG_SESSION_MS,
            pingPongTargetX: target.x,
            pingPongTargetY: target.y,
            pingPongFacing: target.facing,
            pingPongPartnerId: availableAgents[1 - index]?.id,
            pingPongTableUid: item._uid,
            pingPongSide: index as 0 | 1,
            pingPongPreviousWalkSpeed:
              agent.pingPongPreviousWalkSpeed ?? agent.walkSpeed,
          } satisfies Partial<RenderAgent>);
        });
        setMoodByAgentId((prev) => {
          const next = { ...prev };
          for (const agent of availableAgents) {
            next[agent.id] = { emoji: "🏓", ts: now };
          }
          return next;
        });
        window.setTimeout(() => {
          setMoodByAgentId((prev) => {
            const next = { ...prev };
            for (const agent of availableAgents) {
              if (next[agent.id]?.emoji === "🏓") delete next[agent.id];
            }
            return next;
          });
        }, 3_500);
        return;
      }
      if (item.type === "atm") {
        setFollowAgentId(null);
        setActiveGithubTerminalUid(null);
        setActiveQaTerminalUid(null);
        onMonitorSelect?.(null);
        setActiveAtmUid(uid);
        return;
      }
      if (item.type === "sms_booth") {
        setFollowAgentId(null);
        setActiveAtmUid(null);
        setActiveGithubTerminalUid(null);
        setActiveQaTerminalUid(null);
        onMonitorSelect?.(null);
        setSmsBoothCommandArrived(true);
        setSmsBoothDoorOpen(true);
        setManualTextMessageScenario(
          buildMockTextMessageScenario({
            recipient: "Joseph",
            message: "I will be late for the soccer game.",
          }),
        );
        setManualSmsBoothOpen(true);
        return;
      }
      if (item.type === "phone_booth") {
        setFollowAgentId(null);
        setActiveAtmUid(null);
        setActiveGithubTerminalUid(null);
        setActiveQaTerminalUid(null);
        onMonitorSelect?.(null);
        setPhoneBoothCommandArrived(true);
        setPhoneBoothDoorOpen(true);
        setManualPhoneCallScenario(
          buildMockPhoneCallScenario({
            callee: "my contact",
            message: "This is a demo call from the OpenClaw phone booth.",
            voiceAvailable:
              voiceRepliesLoaded &&
              Boolean(voiceRepliesVoiceId) &&
              voiceRepliesEnabled,
          }),
        );
        setManualPhoneBoothOpen(true);
        return;
      }
      if (item.type === "server_terminal") {
        setFollowAgentId(null);
        setActiveAtmUid(null);
        setActiveQaTerminalUid(null);
        onMonitorSelect?.(null);
        setActiveGithubTerminalUid(uid);
        return;
      }
      if (item.type === "server_rack") {
        setFollowAgentId(null);
        setActiveAtmUid(null);
        setActiveQaTerminalUid(null);
        onMonitorSelect?.(null);
        setActiveGithubTerminalUid(serverTerminal?._uid ?? uid);
        return;
      }
      if (
        item.type === "qa_terminal" ||
        item.type === "device_rack" ||
        item.type === "test_bench"
      ) {
        setFollowAgentId(null);
        setActiveAtmUid(null);
        setActiveGithubTerminalUid(null);
        onMonitorSelect?.(null);
        setActiveQaTerminalUid(
          item.type === "qa_terminal" ? uid : (qaTerminal?._uid ?? uid),
        );
        return;
      }
      if (
        item.type === "round_table" &&
        item.x >= 0 &&
        item.x <= 290 &&
        item.y >= 0 &&
        item.y <= 235
      ) {
        onStandupStartRequested?.();
        return;
      }
      const agentId = resolveAgentIdForDeskItem(uid);
      if (!agentId) return;
      if (item.type === "computer") {
        setActiveGithubTerminalUid(null);
        setActiveQaTerminalUid(null);
        setActiveAtmUid(null);
        onMonitorSelect?.(agentId);
        return;
      }
      if (item.type !== "desk_cubicle") return;
      setActiveGithubTerminalUid(null);
      setActiveQaTerminalUid(null);
      setActiveAtmUid(null);
      const agent = renderAgentLookupRef.current.get(agentId);
      if (!agent) return;
      const tx = item.x + 40;
      const ty = item.y + 40;
      const path = planPath(agent.x, agent.y, tx, ty);
      // Mutate the render agent ref directly so the tick loop picks it up.
      Object.assign(agent, {
        targetX: tx,
        targetY: ty,
        path,
        state: "walking",
      });
    },
    [
      closeManualSmsBoothView,
      closeManualPhoneBoothView,
      editMode,
      furniture,
      manualSmsBoothOpen,
      manualPhoneBoothOpen,
      onMonitorSelect,
      onStandupStartRequested,
      planPath,
      qaTerminal,
      renderAgentsRef,
      renderAgentLookupRef,
      resolveAgentIdForDeskItem,
      serverTerminal,
      voiceRepliesEnabled,
      voiceRepliesLoaded,
      voiceRepliesVoiceId,
    ],
  );

  const handleFurniturePointerOver = useCallback(
    (uid: string) => setHoverUid(uid),
    [],
  );
  const handleFurniturePointerOut = useCallback(() => setHoverUid(null), []);
  const closeStandupBoard = useCallback(() => {
    setStandupBoardOpen(false);
    if (
      !followAgentId &&
      !monitorAgentId &&
      !activeAtmUid &&
      !activeGithubTerminalUid &&
      !activeQaTerminalUid
    ) {
      cameraPresetRef.current = CAMERA_PRESET_MAP.overview;
    }
  }, [
    activeAtmUid,
    activeGithubTerminalUid,
    activeQaTerminalUid,
    followAgentId,
    monitorAgentId,
  ]);

  useEffect(() => {
    const hoveredItem = hoverUid
      ? (furniture.find((item) => item._uid === hoverUid) ?? null)
      : null;
    const hoveredMeetingTable =
      hoveredItem?.type === "round_table" &&
      hoveredItem.x >= 0 &&
      hoveredItem.x <= 290 &&
      hoveredItem.y >= 0 &&
      hoveredItem.y <= 235;
    document.body.style.cursor =
      hoveredItem?.type === "pingpong" ||
      hoveredItem?.type === "atm" ||
      hoveredItem?.type === "sms_booth" ||
      hoveredItem?.type === "phone_booth" ||
      hoveredItem?.type === "server_rack" ||
      hoveredItem?.type === "qa_terminal" ||
      hoveredItem?.type === "device_rack" ||
      hoveredItem?.type === "test_bench" ||
      hoveredItem?.type === "server_terminal" ||
      hoveredMeetingTable
        ? "pointer"
        : "";
    return () => {
      document.body.style.cursor = "";
    };
  }, [furniture, hoverUid]);

  const worldToCanvas = useCallback(
    (wx: number, wz: number) => ({
      cx: snap(Math.round((wx + CANVAS_W * SCALE * 0.5) / SCALE)),
      cy: snap(Math.round((wz + CANVAS_H * SCALE * 0.5) / SCALE)),
    }),
    [],
  );

  const wallGhostItem = useMemo(() => {
    if (drag.kind !== "placing" || drag.itemType !== "wall" || !ghostPos) {
      return null;
    }
    const { cx, cy } = worldToCanvas(ghostPos[0], ghostPos[2]);
    const start = wallDrawStart ?? { x: cx, y: cy };
    return createWallItem(start, { x: cx, y: cy }, "__wall_ghost__");
  }, [drag, ghostPos, wallDrawStart, worldToCanvas]);

  const handleFloorMove = useCallback(
    (wx: number, wz: number) => {
      if (drag.kind === "placing") setGhostPos([wx, 0, wz]);
      if (drag.kind === "moving") {
        const { cx, cy } = worldToCanvas(wx, wz);
        setFurniture((prev) =>
          prev.map((item) =>
            item._uid === drag.uid ? { ...item, x: cx, y: cy } : item,
          ),
        );
      }
    },
    [drag, worldToCanvas],
  );

  const handleFloorClick = useCallback(
    (wx: number, wz: number) => {
      if (drag.kind === "placing") {
        const { cx, cy } = worldToCanvas(wx, wz);
        if (drag.itemType === "wall") {
          if (!wallDrawStart) {
            setWallDrawStart({ x: cx, y: cy });
            setGhostPos([wx, 0, wz]);
            return;
          }
          const newWall = createWallItem(
            wallDrawStart,
            { x: cx, y: cy },
            nextUid(),
          );
          setFurniture((prev) => [...prev, newWall]);
          setSelectedUid(newWall._uid);
          setDrawerOpen(false);
          setDrag({ kind: "idle" });
          setGhostPos(null);
          setWallDrawStart(null);
          return;
        }
        const palEntry = PALETTE.find((p) => p.type === drag.itemType);
        const isCouch = drag.itemType === "couch_v";
        const newItem: FurnitureItem = {
          _uid: nextUid(),
          type: isCouch ? "couch" : drag.itemType,
          x: cx,
          y: cy,
          ...palEntry?.defaults,
          ...(isCouch ? { vertical: true, w: 40, h: 80 } : {}),
        };
        if (drag.itemType === "desk_cubicle") {
          newItem.id = `desk_${furniture.filter((i) => i.type === "desk_cubicle").length}`;
        }
        setFurniture((prev) => [...prev, newItem]);
        setSelectedUid(newItem._uid);
        setDrawerOpen(false);
        setDrag({ kind: "idle" });
        setGhostPos(null);
        setWallDrawStart(null);
      }
      if (drag.kind === "moving") setDrag({ kind: "idle" });
    },
    [drag, furniture, wallDrawStart, worldToCanvas],
  );

  const startPlacing = useCallback((type: string) => {
    setDrag({ kind: "placing", itemType: type });
    setSelectedUid(null);
    setDrawerOpen(true);
    setWallDrawStart(null);
    setGhostPos(null);
  }, []);

  const closeSelectedEditor = useCallback(() => {
    setSelectedUid(null);
    setDrag({ kind: "idle" });
    setDrawerOpen(true);
  }, []);

  const updateSelectedItem = useCallback(
    (updater: (item: FurnitureItem) => FurnitureItem) => {
      if (!selectedUid) return;
      setFurniture((prev) =>
        prev.map((item) => (item._uid === selectedUid ? updater(item) : item)),
      );
    },
    [selectedUid],
  );

  const moveSelectedItem = useCallback(
    (deltaX: number, deltaY: number, deltaElevation = 0) => {
      updateSelectedItem((item) => ({
        ...item,
        x: snap(item.x + deltaX),
        y: snap(item.y + deltaY),
        elevation: Math.max(
          -0.4,
          Math.min(2.5, (item.elevation ?? 0) + deltaElevation),
        ),
      }));
    },
    [updateSelectedItem],
  );

  const rotateSelectedItem = useCallback(
    (deltaDegrees: number) => {
      updateSelectedItem((item) => ({
        ...item,
        facing: normalizeDegrees((item.facing ?? 0) + deltaDegrees),
      }));
    },
    [updateSelectedItem],
  );

  const handleDelete = useCallback(() => {
    if (!selectedUid) return;
    const selectedDeskUid =
      selectedItem?.type === "desk_cubicle" ? selectedItem._uid : null;
    if (selectedDeskUid) {
      onDeskAssignmentChange?.(selectedDeskUid, null);
    }
    setFurniture((prev) => prev.filter((i) => i._uid !== selectedUid));
    setSelectedUid(null);
    setDrawerOpen(true);
  }, [onDeskAssignmentChange, selectedItem, selectedUid]);

  const handleReset = () => {
    if (!window.confirm("Reset the office to the default layout?")) return;
    onDeskAssignmentsReset?.(
      furniture
        .filter((item) => item.type === "desk_cubicle")
        .map((item) => item._uid),
    );
    setFurniture(materializeDefaults());
    setSelectedUid(null);
    setDrag({ kind: "idle" });
    setGhostPos(null);
    setWallDrawStart(null);
  };

  const toggleEdit = () => {
    setEditMode((prev) => {
      if (prev) {
        setSelectedUid(null);
        setDrag({ kind: "idle" });
        setDrawerOpen(false);
        setHoverUid(null);
        setGhostPos(null);
        setWallDrawStart(null);
      } else setDrawerOpen(true);
      return !prev;
    });
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (githubImmersive) {
          e.preventDefault();
          if (activeGithubTerminalUid) {
            setActiveGithubTerminalUid(null);
          } else {
            onGithubReviewDismiss?.();
          }
          return;
        }
        if (qaImmersive) {
          e.preventDefault();
          if (activeQaTerminalUid) {
            setActiveQaTerminalUid(null);
          } else {
            onQaLabDismiss?.();
          }
          return;
        }
        if (monitorImmersive) {
          e.preventDefault();
          onMonitorSelect?.(null);
          return;
        }
        if (atmImmersive) {
          e.preventDefault();
          setActiveAtmUid(null);
          return;
        }
      }
      if (!editMode) return;
      if (e.key === "Escape") {
        if (drag.kind === "placing") {
          setDrag({ kind: "idle" });
          setGhostPos(null);
          setWallDrawStart(null);
          setDrawerOpen(true);
        } else {
          setSelectedUid(null);
          setDrawerOpen(true);
        }
      }
      if ((e.key === "Delete" || e.key === "Backspace") && selectedUid) {
        if (document.activeElement?.tagName === "INPUT") return;
        e.preventDefault();
        handleDelete();
      }
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        return;
      }
      if (selectedUid) {
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          moveSelectedItem(-SNAP_GRID, 0);
        } else if (e.key === "ArrowRight") {
          e.preventDefault();
          moveSelectedItem(SNAP_GRID, 0);
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          moveSelectedItem(0, -SNAP_GRID);
        } else if (e.key === "ArrowDown") {
          e.preventDefault();
          moveSelectedItem(0, SNAP_GRID);
        } else if (e.key === "PageUp") {
          e.preventDefault();
          moveSelectedItem(0, 0, ELEVATION_STEP);
        } else if (e.key === "PageDown") {
          e.preventDefault();
          moveSelectedItem(0, 0, -ELEVATION_STEP);
        } else if (e.key === "[") {
          e.preventDefault();
          rotateSelectedItem(-ROTATION_STEP_DEG);
        } else if (e.key === "]") {
          e.preventDefault();
          rotateSelectedItem(ROTATION_STEP_DEG);
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    activeQaTerminalUid,
    activeGithubTerminalUid,
    atmImmersive,
    editMode,
    drag,
    githubImmersive,
    handleDelete,
    monitorImmersive,
    moveSelectedItem,
    onGithubReviewDismiss,
    onMonitorSelect,
    onQaLabDismiss,
    qaImmersive,
    rotateSelectedItem,
    selectedUid,
  ]);

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      )
        return;
      e.preventDefault();
      setSpaceDown(true);
    };
    const onUp = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      setSpaceDown(false);
      setSpaceDragging(false);
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, []);

  // New Idea 1: dismiss context menu on outside click.
  useEffect(() => {
    if (!contextMenu) return;
    const dismiss = () => setContextMenu(null);
    window.addEventListener("pointerdown", dismiss);
    return () => window.removeEventListener("pointerdown", dismiss);
  }, [contextMenu]);

  useEffect(
    () => () => {
      for (const timerId of Object.values(localSpeechTimersRef.current)) {
        window.clearTimeout(timerId);
      }
      localSpeechTimersRef.current = {};
    },
    [],
  );

  // New Idea 3: show speech bubble based on reply length.
  useEffect(() => {
    if (feedEvents.length === 0) return;
    const latest = feedEvents[0];
    if (!latest) return;
    if (latest.kind !== "reply") return;
    const { cleanText } = extractSpeechImage(latest.text.trim(), latest.id);
    const speechText = clampOverlayText(cleanText, SPEECH_BUBBLE_TEXT_MAX_CHARS);
    if (!speechText) return;
    const speechBubbleDurationMs = Math.min(
      12_000,
      Math.max(5_500, 2_500 + speechText.length * 42),
    );
    const addTimer = window.setTimeout(() => {
      setSpeechAgentIds((prev) => new Set([...prev, latest.id]));
    }, 0);
    const timer = window.setTimeout(() => {
      setSpeechAgentIds((prev) => {
        const next = new Set(prev);
        next.delete(latest.id);
        return next;
      });
    }, speechBubbleDurationMs);
    return () => {
      window.clearTimeout(addTimer);
      window.clearTimeout(timer);
    };
  }, [feedEvents]);

  useEffect(() => {
    const tickCatBehavior = () => {
      const now = Date.now();
      const lookup = renderAgentLookupRef.current;
      const catActors = catCompanionIds
        .map((catId) => lookup.get(catId))
        .filter((candidate): candidate is RenderAgent => Boolean(candidate));

      if (catActors.length === 0) {
        catArrivalAnnouncedRef.current = {};
        catStallTrackerByAgentIdRef.current = {};
        animalProximitySinceByPairRef.current = {};
        animalPairCooldownUntilByPairRef.current = {};
        animalSeparationCooldownByAgentIdRef.current = {};
        setCatMovementPausedByAgentId((previous) =>
          Object.keys(previous).length > 0 ? {} : previous,
        );
        setCatCompanionTargetByAgentId((previous) =>
          Object.keys(previous).length > 0 ? {} : previous,
        );
        return;
      }

      const activeCatIdSet = new Set(catActors.map((cat) => cat.id));
      const activeCatHoldAgentIds = Object.entries(resolvedCatHoldByAgentId)
        .filter(
          ([agentId, held]) =>
            held &&
            !catCompanionIds.includes(agentId) &&
            agents.some((candidate) => candidate.id === agentId),
        )
        .map(([agentId]) => agentId);

      const visitorToCatId: Record<string, string> = {};
      const pausedByAgentId: Record<string, boolean> = {};
      for (const visitorId of activeCatHoldAgentIds) {
        const visitor = lookup.get(visitorId);
        if (!visitor) continue;
        let nearestCat = catActors[0];
        let nearestDistance = Math.hypot(
          nearestCat.x - visitor.x,
          nearestCat.y - visitor.y,
        );
        for (const catActor of catActors) {
          const distance = Math.hypot(
            catActor.x - visitor.x,
            catActor.y - visitor.y,
          );
          if (distance < nearestDistance) {
            nearestDistance = distance;
            nearestCat = catActor;
          }
        }
        visitorToCatId[visitorId] = nearestCat.id;
        pausedByAgentId[nearestCat.id] = true;
      }

      const activePairKeys = new Set(
        Object.entries(visitorToCatId).map(
          ([visitorId, catId]) => `${visitorId}::${catId}`,
        ),
      );
      for (const knownPairKey of Object.keys(catArrivalAnnouncedRef.current)) {
        if (!activePairKeys.has(knownPairKey)) {
          delete catArrivalAnnouncedRef.current[knownPairKey];
        }
      }

      for (const [visitorId, catId] of Object.entries(visitorToCatId)) {
        const visitor = lookup.get(visitorId);
        const cat = lookup.get(catId);
        if (!visitor || !cat) continue;
        const distance = Math.hypot(cat.x - visitor.x, cat.y - visitor.y);
        const hasArrived =
          distance <= catLoungeInteractionDistance + 6 &&
          visitor.interactionTarget === "cat_lounge";
        if (hasArrived) {
          pausedByAgentId[visitorId] = true;
          pausedByAgentId[catId] = true;
        }
        const pairKey = `${visitorId}::${catId}`;
        if (!hasArrived || catArrivalAnnouncedRef.current[pairKey]) continue;
        catArrivalAnnouncedRef.current[pairKey] = true;
        queueLocalSpeech(
          catId,
          pickRandomLine(GARFIELD_PET_LINES, "purr... purr..."),
          7_000,
        );
        queueLocalSpeech(
          visitorId,
          pickRandomLine(
            GARFIELD_PET_AGENT_LINES,
            "That was a great morale break.",
          ),
          6_500,
        );
        setMoodByAgentId((previous) => ({
          ...previous,
          [catId]: { emoji: "😸", ts: now },
          [visitorId]: { emoji: "🙂", ts: now },
        }));
      }

      const perchTargets = resolveGarfieldPerchTargets(furnitureRef.current ?? []);
      const navGrid = buildNavGrid(furnitureRef.current ?? []);
      const hasReasonableRoute = (
        fromX: number,
        fromY: number,
        target: GarfieldCompanionTarget,
      ): boolean => {
        const path = astar(fromX, fromY, target.approachX, target.approachY, navGrid);
        if (path.length > 1) return true;
        const directDistance = Math.hypot(
          fromX - target.approachX,
          fromY - target.approachY,
        );
        return directDistance <= AGENT_RADIUS * 2.5;
      };
      let targetMapChanged = false;
      const nextTargetByCatId = { ...catCompanionTargetByAgentId };
      const proximityPausedCatByAgentId: Record<string, boolean> = {};
      const observedProximityPairKeys = new Set<string>();
      for (const knownCatId of Object.keys(nextTargetByCatId)) {
        if (!activeCatIdSet.has(knownCatId)) {
          delete nextTargetByCatId[knownCatId];
          targetMapChanged = true;
        }
      }

      for (const cat of catActors) {
        const catId = cat.id;
        const activityMultiplier = Math.max(
          0.5,
          Math.min(
            1.5,
            ("activityMultiplier" in cat
              ? cat.activityMultiplier
              : undefined) ?? 1,
          ),
        );
        const scheduleDelay = (baseMs: number): number =>
          Math.max(3_000, Math.round(baseMs / activityMultiplier));

        const isBeingPet = Boolean(pausedByAgentId[catId]);
        const previousStall = catStallTrackerByAgentIdRef.current[catId];
        if (!previousStall) {
          catStallTrackerByAgentIdRef.current[catId] = {
            x: cat.x,
            y: cat.y,
            sinceMs: now,
          };
        } else {
          const movedDistance = Math.hypot(
            cat.x - previousStall.x,
            cat.y - previousStall.y,
          );
          if (movedDistance >= CAT_STALL_DISTANCE_THRESHOLD || cat.state !== "walking") {
            catStallTrackerByAgentIdRef.current[catId] = {
              x: cat.x,
              y: cat.y,
              sinceMs: now,
            };
          }
        }
        const canMeow = cat.state === "sitting" || isBeingPet;
        if (!canMeow) {
          catMeowBurstByAgentIdRef.current[catId] = null;
          catNextMeowAtByAgentIdRef.current[catId] =
            now + scheduleDelay(randomGarfieldSittingMeowIntervalMs());
        } else {
          const nextMeowAt = catNextMeowAtByAgentIdRef.current[catId] ?? 0;
          if (!catMeowBurstByAgentIdRef.current[catId] && now >= nextMeowAt) {
            catMeowBurstByAgentIdRef.current[catId] = {
              remaining: randomGarfieldMeowBurstCount(),
              nextAt: now,
            };
          }
          const burst = catMeowBurstByAgentIdRef.current[catId];
          if (burst && now >= burst.nextAt) {
            queueLocalSpeech(
              catId,
              pickRandomLine(GARFIELD_MEOW_LINES, "meow"),
              1_600,
            );
            setMoodByAgentId((previous) => ({
              ...previous,
              [catId]: { emoji: "😺", ts: now },
            }));
            burst.remaining -= 1;
            if (burst.remaining > 0) {
              burst.nextAt = now + randomGarfieldMeowPauseMs();
            } else {
              catMeowBurstByAgentIdRef.current[catId] = null;
              catNextMeowAtByAgentIdRef.current[catId] =
                now +
                scheduleDelay(
                  isBeingPet
                    ? randomGarfieldPettingMeowIntervalMs()
                    : randomGarfieldSittingMeowIntervalMs(),
                );
            }
          }
        }

        if (isBeingPet) {
          continue;
        }

        const separationCooldownUntil =
          animalSeparationCooldownByAgentIdRef.current[catId] ?? 0;
        const nearestNeighbor = [...lookup.values()].reduce(
          (best, candidate) => {
            if (candidate.id === catId) return best;
            if ("role" in candidate && candidate.role === "janitor") return best;
            const distance = Math.hypot(candidate.x - cat.x, candidate.y - cat.y);
            if (!best || distance < best.distance) {
              return { actor: candidate, distance };
            }
            return best;
          },
          null as { actor: RenderAgent; distance: number } | null,
        );
        if (nearestNeighbor) {
          const neighborIsAnimal = isAnimalActor(nearestNeighbor.actor);
          const neighborId = nearestNeighbor.actor.id;
          const proximityDistanceLimit = neighborIsAnimal
            ? catToCatMinDistance * 1.15
            : catToHumanMinDistance * 1.1;
          if (nearestNeighbor.distance <= proximityDistanceLimit) {
            const pairKey = [catId, neighborId].sort().join("::");
            observedProximityPairKeys.add(pairKey);
            const proximitySince =
              animalProximitySinceByPairRef.current[pairKey] ?? now;
            animalProximitySinceByPairRef.current[pairKey] = proximitySince;
            const proximityDurationMs = now - proximitySince;
            const pairCooldownUntil =
              animalPairCooldownUntilByPairRef.current[pairKey] ?? 0;
            const shouldForceSeparate =
              pairCooldownUntil > now ||
              proximityDurationMs >= ANIMAL_PROXIMITY_FORCE_SEPARATE_AFTER_MS;
            if (
              shouldForceSeparate &&
              separationCooldownUntil <= now
            ) {
              let offsetX = cat.x - nearestNeighbor.actor.x;
              let offsetY = cat.y - nearestNeighbor.actor.y;
              if (Math.hypot(offsetX, offsetY) < 0.001) {
                offsetX = Math.random() - 0.5;
                offsetY = Math.random() - 0.5;
              }
              const offsetNorm = Math.hypot(offsetX, offsetY) || 1;
              const splitTarget = clampCanvasPoint(
                cat.x + (offsetX / offsetNorm) * ANIMAL_FORCE_APART_DISTANCE,
                cat.y + (offsetY / offsetNorm) * ANIMAL_FORCE_APART_DISTANCE,
              );
              const splitRouteTarget = buildFloorCatRouteTarget(
                `fallback:split:${catId}:${nearestNeighbor.actor.id}:${Math.floor(now / 1_000)}`,
                splitTarget.x,
                splitTarget.y,
                resolveFacingTowards(cat.x, cat.y, splitTarget.x, splitTarget.y),
              );
              nextTargetByCatId[catId] = splitRouteTarget;
              catPerchKeyByAgentIdRef.current[catId] = splitRouteTarget.key;
              catNextPerchMoveAtRef.current[catId] =
                now + scheduleDelay(randomGarfieldIntervalMs());
              animalSeparationCooldownByAgentIdRef.current[catId] =
                now + ANIMAL_SEPARATION_COOLDOWN_MS;
              if (neighborIsAnimal && activeCatIdSet.has(neighborId)) {
                const oppositeSplitTarget = clampCanvasPoint(
                  nearestNeighbor.actor.x -
                    (offsetX / offsetNorm) * ANIMAL_FORCE_APART_DISTANCE,
                  nearestNeighbor.actor.y -
                    (offsetY / offsetNorm) * ANIMAL_FORCE_APART_DISTANCE,
                );
                const oppositeSplitRouteTarget = buildFloorCatRouteTarget(
                  `fallback:split:${neighborId}:${catId}:${Math.floor(now / 1_000)}`,
                  oppositeSplitTarget.x,
                  oppositeSplitTarget.y,
                  resolveFacingTowards(
                    nearestNeighbor.actor.x,
                    nearestNeighbor.actor.y,
                    oppositeSplitTarget.x,
                    oppositeSplitTarget.y,
                  ),
                );
                nextTargetByCatId[neighborId] = oppositeSplitRouteTarget;
                catPerchKeyByAgentIdRef.current[neighborId] =
                  oppositeSplitRouteTarget.key;
                catNextPerchMoveAtRef.current[neighborId] =
                  now + scheduleDelay(randomGarfieldIntervalMs());
                animalSeparationCooldownByAgentIdRef.current[neighborId] =
                  now + ANIMAL_SEPARATION_COOLDOWN_MS;
              }
              animalPairCooldownUntilByPairRef.current[pairKey] =
                now + ANIMAL_PAIR_PROXIMITY_COOLDOWN_MS;
              delete animalProximitySinceByPairRef.current[pairKey];
              targetMapChanged = true;
              continue;
            }
            if (proximityDurationMs >= ANIMAL_PROXIMITY_STILL_AFTER_MS) {
              proximityPausedCatByAgentId[catId] = true;
              if (neighborIsAnimal && activeCatIdSet.has(neighborId)) {
                proximityPausedCatByAgentId[neighborId] = true;
              }
            }
          }
        }

        const stallTracker = catStallTrackerByAgentIdRef.current[catId];
        if (stallTracker && now - stallTracker.sinceMs >= CAT_STALL_TIMEOUT_MS) {
          const cuddleCandidates = [...lookup.values()].filter((candidate) => {
            if (candidate.id === catId) return false;
            if ("role" in candidate && candidate.role === "janitor") return false;
            return true;
          });
          let fallbackTarget: GarfieldCompanionTarget | null = null;
          if (cuddleCandidates.length > 0) {
            const nearest = cuddleCandidates.reduce((best, candidate) => {
              const candidateDistance = Math.hypot(
                candidate.x - cat.x,
                candidate.y - cat.y,
              );
              if (!best || candidateDistance < best.distance) {
                return {
                  actor: candidate,
                  distance: candidateDistance,
                };
              }
              return best;
            }, null as { actor: RenderAgent; distance: number } | null);
            if (nearest) {
              const cuddleRoute = resolveCatLoungeTarget(catId, {
                targetX: nearest.actor.x,
                targetY: nearest.actor.y,
              }, catLoungeInteractionDistance);
              fallbackTarget = buildFloorCatRouteTarget(
                `fallback:cuddle:${nearest.actor.id}:${Math.floor(now / 1_000)}`,
                cuddleRoute.targetX,
                cuddleRoute.targetY,
                cuddleRoute.facing,
              );
            }
          }
          if (!fallbackTarget) {
            const roamTarget =
              ROAM_POINTS[Math.floor(Math.random() * ROAM_POINTS.length)] ??
              GARFIELD_HOME_TARGET;
            fallbackTarget = buildFloorCatRouteTarget(
              `fallback:roam:${catId}:${Math.floor(now / 1_000)}`,
              roamTarget.x,
              roamTarget.y,
              resolveFacingTowards(
                roamTarget.x,
                roamTarget.y,
                GARFIELD_HOME_TARGET.x,
                GARFIELD_HOME_TARGET.y,
              ),
            );
          }
          nextTargetByCatId[catId] = fallbackTarget;
          catPerchKeyByAgentIdRef.current[catId] = fallbackTarget.key;
          catNextPerchMoveAtRef.current[catId] =
            now + scheduleDelay(randomGarfieldIntervalMs());
          catStallTrackerByAgentIdRef.current[catId] = {
            x: cat.x,
            y: cat.y,
            sinceMs: now,
          };
          targetMapChanged = true;
          continue;
        }

        const nextPerchMoveAt = catNextPerchMoveAtRef.current[catId] ?? 0;
        if (now < nextPerchMoveAt) {
          continue;
        }
        if (perchTargets.length === 0) {
          catNextPerchMoveAtRef.current[catId] =
            now + scheduleDelay(randomGarfieldIntervalMs());
          continue;
        }
        const previousPerchKey = catPerchKeyByAgentIdRef.current[catId] ?? "";
        const occupiedByOtherCats = new Set(
          Object.entries(nextTargetByCatId)
            .filter(
              ([otherCatId, target]) =>
                otherCatId !== catId &&
                activeCatIdSet.has(otherCatId) &&
                Boolean(target?.key),
            )
            .map(([, target]) => target.key),
        );
        const nonPreviousTargets = perchTargets.filter(
          (target) => target.key !== previousPerchKey,
        );
        const unoccupiedTargets = nonPreviousTargets.filter(
          (target) => !occupiedByOtherCats.has(target.key),
        );
        const baseTargetPool =
          unoccupiedTargets.length > 0
            ? unoccupiedTargets
            : nonPreviousTargets.length > 0
              ? nonPreviousTargets
              : perchTargets;
        const baseTarget =
          baseTargetPool[Math.floor(Math.random() * baseTargetPool.length)] ?? null;
        let nextTarget: GarfieldCompanionTarget | null = baseTarget;
        if (baseTarget && occupiedByOtherCats.has(baseTarget.key)) {
          nextTarget = buildCuddleVariantTarget(baseTarget, catId);
        }
        if (nextTarget && !hasReasonableRoute(cat.x, cat.y, nextTarget)) {
          const roamTarget =
            ROAM_POINTS[Math.floor(Math.random() * ROAM_POINTS.length)] ??
            GARFIELD_HOME_TARGET;
          nextTarget = buildFloorCatRouteTarget(
            `fallback:route:${catId}:${Math.floor(now / 1_000)}`,
            roamTarget.x,
            roamTarget.y,
            resolveFacingTowards(
              roamTarget.x,
              roamTarget.y,
              GARFIELD_HOME_TARGET.x,
              GARFIELD_HOME_TARGET.y,
            ),
          );
        }
        if (!nextTarget) {
          catNextPerchMoveAtRef.current[catId] =
            now + scheduleDelay(randomGarfieldIntervalMs());
          continue;
        }
        catPerchKeyByAgentIdRef.current[catId] = nextTarget.key;
        catNextPerchMoveAtRef.current[catId] =
          now + scheduleDelay(randomGarfieldIntervalMs());
        const previousTarget = nextTargetByCatId[catId];
        if (!previousTarget || previousTarget.key !== nextTarget.key) {
          nextTargetByCatId[catId] = nextTarget;
          targetMapChanged = true;
        }
      }

      for (const pairKey of Object.keys(animalProximitySinceByPairRef.current)) {
        if (!observedProximityPairKeys.has(pairKey)) {
          delete animalProximitySinceByPairRef.current[pairKey];
        }
      }
      for (const catId of Object.keys(animalSeparationCooldownByAgentIdRef.current)) {
        if (!activeCatIdSet.has(catId)) {
          delete animalSeparationCooldownByAgentIdRef.current[catId];
        }
      }
      for (const pairKey of Object.keys(animalPairCooldownUntilByPairRef.current)) {
        const cooldownUntil = animalPairCooldownUntilByPairRef.current[pairKey] ?? 0;
        const [leftId, rightId] = pairKey.split("::");
        const hasActiveAnimalSide =
          activeCatIdSet.has(leftId) || activeCatIdSet.has(rightId);
        const hasKnownActorSide = lookup.has(leftId) || lookup.has(rightId);
        if (cooldownUntil <= now || !hasActiveAnimalSide || !hasKnownActorSide) {
          delete animalPairCooldownUntilByPairRef.current[pairKey];
        }
      }

      const nextPausedByCatId: Record<string, boolean> = {};
      for (const catId of activeCatIdSet) {
        if (pausedByAgentId[catId] || proximityPausedCatByAgentId[catId]) {
          nextPausedByCatId[catId] = true;
        }
      }
      setCatMovementPausedByAgentId((previous) => {
        const previousKeys = Object.keys(previous);
        const nextKeys = Object.keys(nextPausedByCatId);
        if (previousKeys.length !== nextKeys.length) {
          return nextPausedByCatId;
        }
        for (const key of previousKeys) {
          if (Boolean(previous[key]) !== Boolean(nextPausedByCatId[key])) {
            return nextPausedByCatId;
          }
        }
        return previous;
      });

      if (targetMapChanged) {
        setCatCompanionTargetByAgentId(nextTargetByCatId);
      }
    };

    tickCatBehavior();
    const intervalId = window.setInterval(tickCatBehavior, 600);
    return () => {
      window.clearInterval(intervalId);
    };
  }, [
    agents,
    catCompanionIds,
    catCompanionTargetByAgentId,
    catLoungeInteractionDistance,
    catToCatMinDistance,
    catToHumanMinDistance,
    queueLocalSpeech,
    renderAgentLookupRef,
    resolvedCatHoldByAgentId,
  ]);

  // E3 Idea 1: emoji mood reactions on feed events.
  useEffect(() => {
    if (feedEvents.length === 0) return;
    const latest = feedEvents[0];
    if (!latest) return;
    const emoji =
      latest.kind === "reply"
        ? "💬"
        : latest.text.includes("started")
          ? "💻"
          : "☕";
    const addTimer = window.setTimeout(() => {
      setMoodByAgentId((prev) => ({
        ...prev,
        [latest.id]: { emoji, ts: Date.now() },
      }));
    }, 0);
    const timer = window.setTimeout(() => {
      setMoodByAgentId((prev) => {
        const next = { ...prev };
        delete next[latest.id];
        return next;
      });
    }, 2500);
    return () => {
      window.clearTimeout(addTimer);
      window.clearTimeout(timer);
    };
  }, [feedEvents]);

  // E3 Idea 3: auto-clear spotlight after 2s.
  useEffect(() => {
    if (!spotlightAgentId) return;
    const timer = setTimeout(() => setSpotlightAgentId(null), 2000);
    return () => clearTimeout(timer);
  }, [spotlightAgentId]);

  // Camera constants.
  const CAM_POS: [number, number, number] = [12, 12, 12];

  return (
    <div className="relative w-full h-full bg-[#1a1008] font-mono text-white overflow-hidden">
      {/* 3D Canvas — fills everything. */}
      <div
        className="absolute inset-0"
        style={{
          cursor: spaceDown ? (spaceDragging ? "grabbing" : "grab") : undefined,
        }}
        onMouseDown={() => {
          if (spaceDown) setSpaceDragging(true);
        }}
        onMouseUp={() => setSpaceDragging(false)}
        onDoubleClick={() => orbitRef.current?.reset()}
      >
        {/*
          Key fixes vs previous version:
          1. `orthographic` prop + `camera` prop on Canvas → R3F creates the camera
             and it defaults to looking at origin, fixing the black screen.
          2. `CameraRig` explicitly calls camera.lookAt(0,0,0) after mount for safety.
          3. `GameLoop` only calls tick() with no setState → zero React re-renders per frame.
          4. Agent components read from `renderAgentsRef` via useFrame → pure Three.js mutations.
          5. Floor/walls render immediately (no Suspense). Only GLB models are suspended.
        */}
        {!immersiveOverlayActive ? (
          <Canvas
            orthographic
            dpr={[0.85, 1.5]}
            camera={{ position: CAM_POS, zoom: 55, near: 0.1, far: 100 }}
            shadows={{ type: THREE.PCFShadowMap }}
            gl={{ antialias: true, powerPreference: "high-performance" }}
            style={{ width: "100%", height: "100%" }}
            onPointerUp={() => {
              if (drag.kind === "moving") setDrag({ kind: "idle" });
            }}
          >
          {/* Ensure camera looks at origin after mount. */}
          <CameraRig />
          <AdaptiveDprController />

          {/* Orbit / pan / zoom controls — disabled while follow cam is active or while editing furniture. */}
          <OrbitControls
            ref={orbitRef}
            enabled={followAgentId === null && (!editMode || spaceDown)}
            enableDamping
            dampingFactor={0.08}
            rotateSpeed={0.6}
            zoomSpeed={0.8}
            panSpeed={0.6}
            minZoom={25}
            maxZoom={120}
            maxPolarAngle={Math.PI / 2.2}
            enableRotate={!spaceDown}
            mouseButtons={{
              LEFT: spaceDown ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE,
              MIDDLE: THREE.MOUSE.DOLLY,
              RIGHT: THREE.MOUSE.PAN,
            }}
          />

          {/* Game loop — no React state, pure ref mutations. */}
          <SceneGameLoop tick={tick} />

          {/* New Idea 2: Camera preset animator. */}
          <CameraPresetAnimator
            presetRef={cameraPresetRef}
            orbitRef={orbitRef}
          />

          {/* Follow cam: third-person perspective camera trailing the selected agent. */}
          <FollowCamSystem
            followRef={followAgentIdRef}
            agentsRef={renderAgentsRef}
            agentLookupRef={renderAgentLookupRef}
          />

          {/* E3 Idea 3: Spotlight effect on agent chip click. */}
          <SceneSpotlightEffect
            agentId={spotlightAgentId}
            agentsRef={renderAgentsRef}
            agentLookupRef={renderAgentLookupRef}
          />

          {/* Lights — day/night cycle drives ambient + sun; fill light stays constant. */}
          <DayNightLighting externalTimeRef={dayNightTimeRef} />
          <directionalLight
            position={[-5, 8, -4]}
            intensity={0.4}
            color="#7090ff"
          />

          {/* Floor + walls — always visible, no async loading. */}
          <SceneFloorAndWalls />

          {/* Wall pictures — procedural, no async loading. */}
          <SceneWallPictures />
          <SceneMemorialWallPictures portraits={zooRipPortraits} />

          {/* Environment lighting — async, wrapped in its own Suspense so floor stays visible. */}
          <Suspense fallback={null}>
            <Environment preset="city" />
          </Suspense>

          {/* Furniture models — each loads its GLB asynchronously. */}
          <Suspense fallback={null}>
            {!editMode ? (
              <PrimitiveInstancedWallSegmentsModel items={wallItems} />
            ) : null}
            {!editMode ? (
              <InstancedFurnitureItemsModel
                itemType="desk_cubicle"
                items={deskItems}
                onItemClick={handleDeskClick}
              />
            ) : null}
            {!editMode ? (
              <InstancedFurnitureItemsModel itemType="chair" items={chairItems} />
            ) : null}
            {furniture.map((item) =>
              item.type === "wall" ? (
                editMode ? (
                <PrimitiveWallSegmentModel
                  key={item._uid}
                  item={item}
                  isSelected={item._uid === selectedUid}
                  isHovered={item._uid === hoverUid}
                  editMode={editMode}
                  onPointerDown={handleFurniturePointerDown}
                  onPointerOver={handleFurniturePointerOver}
                  onPointerOut={handleFurniturePointerOut}
                />
                ) : null
              ) : item.type === "desk_cubicle" ? (
                editMode ? (
                  <GenericFurnitureModel
                    key={item._uid}
                    item={item}
                    isSelected={item._uid === selectedUid}
                    isHovered={item._uid === hoverUid}
                    editMode={editMode}
                    onPointerDown={handleFurniturePointerDown}
                    onPointerOver={handleFurniturePointerOver}
                    onPointerOut={handleFurniturePointerOut}
                    onClick={handleDeskClick}
                  />
                ) : null
              ) : item.type === "chair" ? (
                editMode ? (
                  <GenericFurnitureModel
                    key={item._uid}
                    item={item}
                    isSelected={item._uid === selectedUid}
                    isHovered={item._uid === hoverUid}
                    editMode={editMode}
                    onPointerDown={handleFurniturePointerDown}
                    onPointerOver={handleFurniturePointerOver}
                    onPointerOut={handleFurniturePointerOut}
                    onClick={handleDeskClick}
                  />
                ) : null
              ) : item.type === "door" ? (
                <PrimitiveDoorModel
                  key={item._uid}
                  item={item}
                  isSelected={item._uid === selectedUid}
                  isHovered={item._uid === hoverUid}
                  editMode={editMode}
                  agentsRef={renderAgentsRef}
                  onPointerDown={handleFurniturePointerDown}
                  onPointerOver={handleFurniturePointerOver}
                  onPointerOut={handleFurniturePointerOut}
                />
              ) : item.type === "round_table" ? (
                <PrimitiveRoundTableModel
                  key={item._uid}
                  item={item}
                  isSelected={item._uid === selectedUid}
                  isHovered={item._uid === hoverUid}
                  editMode={editMode}
                  onPointerDown={handleFurniturePointerDown}
                  onPointerOver={handleFurniturePointerOver}
                  onPointerOut={handleFurniturePointerOut}
                  onClick={handleDeskClick}
                />
              ) : item.type === "keyboard" ? (
                <PrimitiveKeyboardModel
                  key={item._uid}
                  item={item}
                  editMode={editMode}
                  onPointerDown={handleFurniturePointerDown}
                  onPointerOver={handleFurniturePointerOver}
                  onPointerOut={handleFurniturePointerOut}
                />
              ) : item.type === "mouse" ? (
                <PrimitiveMouseModel
                  key={item._uid}
                  item={item}
                  editMode={editMode}
                  onPointerDown={handleFurniturePointerDown}
                  onPointerOver={handleFurniturePointerOver}
                  onPointerOut={handleFurniturePointerOut}
                />
              ) : item.type === "trash" ? (
                <PrimitiveTrashCanModel
                  key={item._uid}
                  item={item}
                  editMode={editMode}
                  onPointerDown={handleFurniturePointerDown}
                  onPointerOver={handleFurniturePointerOver}
                  onPointerOut={handleFurniturePointerOut}
                />
              ) : item.type === "mug" ? (
                <PrimitiveMugModel
                  key={item._uid}
                  item={item}
                  editMode={editMode}
                  onPointerDown={handleFurniturePointerDown}
                  onPointerOver={handleFurniturePointerOver}
                  onPointerOut={handleFurniturePointerOut}
                />
              ) : item.type === "clock" ? (
                <PrimitiveClockModel
                  key={item._uid}
                  item={item}
                  editMode={editMode}
                  onPointerDown={handleFurniturePointerDown}
                  onPointerOver={handleFurniturePointerOver}
                  onPointerOut={handleFurniturePointerOut}
                />
              ) : item.type === "atm" ? (
                <InteractiveAtmMachineModel
                  key={item._uid}
                  item={item}
                  isSelected={item._uid === selectedUid}
                  isHovered={item._uid === hoverUid}
                  editMode={editMode}
                  onPointerDown={handleFurniturePointerDown}
                  onPointerOver={handleFurniturePointerOver}
                  onPointerOut={handleFurniturePointerOut}
                  onClick={handleDeskClick}
                />
              ) : item.type === "sms_booth" ? (
                <InteractiveSmsBoothModel
                  key={item._uid}
                  item={item}
                  isSelected={item._uid === selectedUid}
                  isHovered={item._uid === hoverUid}
                  editMode={editMode}
                  doorOpen={smsBoothDoorOpen}
                  onPointerDown={handleFurniturePointerDown}
                  onPointerOver={handleFurniturePointerOver}
                  onPointerOut={handleFurniturePointerOut}
                  onClick={handleDeskClick}
                />
              ) : item.type === "phone_booth" ? (
                <InteractivePhoneBoothModel
                  key={item._uid}
                  item={item}
                  isSelected={item._uid === selectedUid}
                  isHovered={item._uid === hoverUid}
                  editMode={editMode}
                  doorOpen={phoneBoothDoorOpen}
                  onPointerDown={handleFurniturePointerDown}
                  onPointerOver={handleFurniturePointerOver}
                  onPointerOut={handleFurniturePointerOut}
                  onClick={handleDeskClick}
                />
              ) : item.type === "server_rack" ? (
                <InteractiveServerRackModel
                  key={item._uid}
                  item={item}
                  isSelected={item._uid === selectedUid}
                  isHovered={item._uid === hoverUid}
                  editMode={editMode}
                  onPointerDown={handleFurniturePointerDown}
                  onPointerOver={handleFurniturePointerOver}
                  onPointerOut={handleFurniturePointerOut}
                  onClick={handleDeskClick}
                />
              ) : item.type === "server_terminal" ? (
                <InteractiveServerTerminalModel
                  key={item._uid}
                  item={item}
                  isSelected={item._uid === selectedUid}
                  isHovered={item._uid === hoverUid}
                  editMode={editMode}
                  onPointerDown={handleFurniturePointerDown}
                  onPointerOver={handleFurniturePointerOver}
                  onPointerOut={handleFurniturePointerOut}
                  onClick={handleDeskClick}
                />
              ) : item.type === "vending" ? (
                <KitchenVendingMachineModel
                  key={item._uid}
                  item={item}
                  editMode={editMode}
                  onPointerDown={handleFurniturePointerDown}
                  onPointerOver={handleFurniturePointerOver}
                  onPointerOut={handleFurniturePointerOut}
                />
              ) : item.type === "sink" ? (
                <KitchenSinkModel
                  key={item._uid}
                  item={item}
                  editMode={editMode}
                  onPointerDown={handleFurniturePointerDown}
                  onPointerOver={handleFurniturePointerOver}
                  onPointerOut={handleFurniturePointerOut}
                />
              ) : item.type === "dishwasher" ? (
                <KitchenDishwasherModel
                  key={item._uid}
                  item={item}
                  editMode={editMode}
                  onPointerDown={handleFurniturePointerDown}
                  onPointerOver={handleFurniturePointerOver}
                  onPointerOut={handleFurniturePointerOut}
                />
              ) : item.type === "pingpong" ? (
                <MachinePingPongTableModel
                  key={item._uid}
                  item={item}
                  isSelected={item._uid === selectedUid}
                  isHovered={item._uid === hoverUid}
                  editMode={editMode}
                  onPointerDown={handleFurniturePointerDown}
                  onPointerOver={handleFurniturePointerOver}
                  onPointerOut={handleFurniturePointerOut}
                  onClick={handleDeskClick}
                />
              ) : item.type === "qa_terminal" ? (
                <InteractiveQaTerminalModel
                  key={item._uid}
                  item={item}
                  isSelected={item._uid === selectedUid}
                  isHovered={item._uid === hoverUid}
                  editMode={editMode}
                  onPointerDown={handleFurniturePointerDown}
                  onPointerOver={handleFurniturePointerOver}
                  onPointerOut={handleFurniturePointerOut}
                  onClick={handleDeskClick}
                />
              ) : item.type === "device_rack" ? (
                <InteractiveDeviceRackModel
                  key={item._uid}
                  item={item}
                  isSelected={item._uid === selectedUid}
                  isHovered={item._uid === hoverUid}
                  editMode={editMode}
                  onPointerDown={handleFurniturePointerDown}
                  onPointerOver={handleFurniturePointerOver}
                  onPointerOut={handleFurniturePointerOut}
                  onClick={handleDeskClick}
                />
              ) : item.type === "test_bench" ? (
                <InteractiveTestBenchModel
                  key={item._uid}
                  item={item}
                  isSelected={item._uid === selectedUid}
                  isHovered={item._uid === hoverUid}
                  editMode={editMode}
                  onPointerDown={handleFurniturePointerDown}
                  onPointerOver={handleFurniturePointerOver}
                  onPointerOut={handleFurniturePointerOut}
                  onClick={handleDeskClick}
                />
              ) : item.type === "treadmill" ? (
                <InteractiveTreadmillModel
                  key={item._uid}
                  item={item}
                  isSelected={item._uid === selectedUid}
                  isHovered={item._uid === hoverUid}
                  editMode={editMode}
                  onPointerDown={handleFurniturePointerDown}
                  onPointerOver={handleFurniturePointerOver}
                  onPointerOut={handleFurniturePointerOut}
                  onClick={handleDeskClick}
                />
              ) : item.type === "weight_bench" ? (
                <InteractiveWeightBenchModel
                  key={item._uid}
                  item={item}
                  isSelected={item._uid === selectedUid}
                  isHovered={item._uid === hoverUid}
                  editMode={editMode}
                  onPointerDown={handleFurniturePointerDown}
                  onPointerOver={handleFurniturePointerOver}
                  onPointerOut={handleFurniturePointerOut}
                  onClick={handleDeskClick}
                />
              ) : item.type === "dumbbell_rack" ? (
                <InteractiveDumbbellRackModel
                  key={item._uid}
                  item={item}
                  isSelected={item._uid === selectedUid}
                  isHovered={item._uid === hoverUid}
                  editMode={editMode}
                  onPointerDown={handleFurniturePointerDown}
                  onPointerOver={handleFurniturePointerOver}
                  onPointerOut={handleFurniturePointerOut}
                  onClick={handleDeskClick}
                />
              ) : item.type === "exercise_bike" ? (
                <InteractiveExerciseBikeModel
                  key={item._uid}
                  item={item}
                  isSelected={item._uid === selectedUid}
                  isHovered={item._uid === hoverUid}
                  editMode={editMode}
                  onPointerDown={handleFurniturePointerDown}
                  onPointerOver={handleFurniturePointerOver}
                  onPointerOut={handleFurniturePointerOut}
                  onClick={handleDeskClick}
                />
              ) : item.type === "rowing_machine" ? (
                <InteractiveRowingMachineModel
                  key={item._uid}
                  item={item}
                  isSelected={item._uid === selectedUid}
                  isHovered={item._uid === hoverUid}
                  editMode={editMode}
                  onPointerDown={handleFurniturePointerDown}
                  onPointerOver={handleFurniturePointerOver}
                  onPointerOut={handleFurniturePointerOut}
                  onClick={handleDeskClick}
                />
              ) : item.type === "kettlebell_rack" ? (
                <InteractiveKettlebellRackModel
                  key={item._uid}
                  item={item}
                  isSelected={item._uid === selectedUid}
                  isHovered={item._uid === hoverUid}
                  editMode={editMode}
                  onPointerDown={handleFurniturePointerDown}
                  onPointerOver={handleFurniturePointerOver}
                  onPointerOut={handleFurniturePointerOut}
                  onClick={handleDeskClick}
                />
              ) : item.type === "punching_bag" ? (
                <InteractivePunchingBagModel
                  key={item._uid}
                  item={item}
                  isSelected={item._uid === selectedUid}
                  isHovered={item._uid === hoverUid}
                  editMode={editMode}
                  onPointerDown={handleFurniturePointerDown}
                  onPointerOver={handleFurniturePointerOver}
                  onPointerOut={handleFurniturePointerOut}
                  onClick={handleDeskClick}
                />
              ) : item.type === "yoga_mat" ? (
                <InteractiveYogaMatModel
                  key={item._uid}
                  item={item}
                  isSelected={item._uid === selectedUid}
                  isHovered={item._uid === hoverUid}
                  editMode={editMode}
                  onPointerDown={handleFurniturePointerDown}
                  onPointerOver={handleFurniturePointerOver}
                  onPointerOut={handleFurniturePointerOut}
                  onClick={handleDeskClick}
                />
              ) : item.type === "stove" ? (
                <KitchenStoveModel
                  key={item._uid}
                  item={item}
                  editMode={editMode}
                  onPointerDown={handleFurniturePointerDown}
                  onPointerOver={handleFurniturePointerOver}
                  onPointerOut={handleFurniturePointerOut}
                />
              ) : item.type === "microwave" ? (
                <KitchenMicrowaveModel
                  key={item._uid}
                  item={item}
                  editMode={editMode}
                  onPointerDown={handleFurniturePointerDown}
                  onPointerOver={handleFurniturePointerOver}
                  onPointerOut={handleFurniturePointerOut}
                />
              ) : item.type === "wall_cabinet" ? (
                <KitchenWallCabinetModel
                  key={item._uid}
                  item={item}
                  editMode={editMode}
                  onPointerDown={handleFurniturePointerDown}
                  onPointerOver={handleFurniturePointerOver}
                  onPointerOut={handleFurniturePointerOut}
                />
              ) : (
                <GenericFurnitureModel
                  key={item._uid}
                  item={item}
                  isSelected={item._uid === selectedUid}
                  isHovered={item._uid === hoverUid}
                  editMode={editMode}
                  onPointerDown={handleFurniturePointerDown}
                  onPointerOver={handleFurniturePointerOver}
                  onPointerOut={handleFurniturePointerOut}
                  onClick={handleDeskClick}
                />
              ),
            )}
          </Suspense>

          {/* Agents — purely imperative, driven by renderAgentsRef inside useFrame. */}
          {sceneAgents.map((agent) => {
            const isJanitor = "role" in agent && agent.role === "janitor";
            return (
              <AgentObjectModel
                key={agent.id}
                agentId={agent.id}
                name={agent.name}
                status={agent.status}
                color={agentColorMap.get(agent.id) ?? "#888"}
                avatarKind={"avatarKind" in agent ? agent.avatarKind : undefined}
                animalSpecies={
                  "animalSpecies" in agent ? agent.animalSpecies : undefined
                }
                animalAppearance={
                  "animalAppearance" in agent
                    ? agent.animalAppearance
                    : undefined
                }
                catAppearance={
                  "catAppearance" in agent ? agent.catAppearance : undefined
                }
                appearance={"avatarProfile" in agent ? agent.avatarProfile ?? null : null}
                agentsRef={renderAgentsRef}
                agentLookupRef={renderAgentLookupRef}
                onHover={isJanitor ? undefined : handleAgentHover}
                onUnhover={isJanitor ? undefined : handleAgentUnhover}
                onClick={isJanitor ? undefined : handleAgentClick}
                onContextMenu={isJanitor ? undefined : handleAgentContextMenu}
                showSpeech={
                  isJanitor
                    ? false
                    : standupMeeting?.phase === "in_progress"
                      ? Boolean(standupSpeechTextByAgentId[agent.id])
                      : Boolean(localSpeechByAgentId[agent.id]) ||
                        speechAgentIds.has(agent.id)
                }
                speechText={
                  isJanitor
                    ? null
                    : standupMeeting?.phase === "in_progress"
                      ? (standupSpeechTextByAgentId[agent.id] ?? null)
                      : (localSpeechByAgentId[agent.id] ??
                        speechTextByAgentId[agent.id] ??
                        null)
                }
                suppressSpeechBubble={
                  suppressSceneSpeechBubbles &&
                  standupMeeting?.currentSpeakerAgentId !== agent.id
                }
              />
            );
          })}

          <ScenePingPongBall agentsRef={renderAgentsRef} />

          {/* Idea 7: Desk nameplates — small labels showing assigned agent above each desk. */}
          <DeskNameplateOverlay
            deskLocations={deskLocations}
            agents={agents}
            deskByAgentRef={deskByAgentRef}
          />

          {/* New Idea 5: Agent color trails while walking. */}
          {trailMode ? (
            <AgentTrailSystem
              agentsRef={renderAgentsRef}
              colorMap={agentColorMap}
            />
          ) : null}

          {/* New Idea 7: Heatmap overlay when heatmap mode is active. */}
          {heatmapMode ? (
            <AgentHeatmapSystem
              agentsRef={renderAgentsRef}
              heatmapMode={heatmapMode}
              heatGridRef={heatGridRef}
            />
          ) : null}

          {/* Placement ghost. */}
          {editMode &&
            drag.kind === "placing" &&
            drag.itemType !== "wall" &&
            ghostPos && (
              <Suspense fallback={null}>
                <FurniturePlacementGhost
                  itemType={drag.itemType}
                  position={ghostPos}
                />
              </Suspense>
            )}
          {editMode &&
          drag.kind === "placing" &&
          drag.itemType === "wall" &&
          wallGhostItem ? (
            <PrimitiveWallSegmentModel
              item={wallGhostItem}
              isSelected={false}
              isHovered={false}
              editMode={false}
              onPointerDown={() => {}}
              onPointerOver={() => {}}
              onPointerOut={() => {}}
            />
          ) : null}
          {editMode &&
          drag.kind === "placing" &&
          drag.itemType === "door" &&
          ghostPos ? (
            <PrimitiveDoorModel
              item={{
                _uid: "__door_ghost__",
                type: "door",
                x: worldToCanvas(ghostPos[0], ghostPos[2]).cx,
                y: worldToCanvas(ghostPos[0], ghostPos[2]).cy,
                w: DOOR_LENGTH,
                h: DOOR_THICKNESS,
              }}
              isSelected={false}
              isHovered={false}
              editMode={false}
              onPointerDown={() => {}}
              onPointerOver={() => {}}
              onPointerOut={() => {}}
            />
          ) : null}

          {/* Floor raycaster for edit-mode interaction. */}
          <SceneFloorRaycaster
            enabled={editMode}
            onMove={handleFloorMove}
            onClick={handleFloorClick}
          />
          </Canvas>
        ) : null}
      </div>

      {/* New Idea 4: Weather/ambience overlay. */}
      {!immersiveOverlayActive ? (
        <WeatherAmbientOverlay timeRef={dayNightTimeRef} />
      ) : null}

      {/* New Idea 2: Camera preset buttons — top left. */}
      {!immersiveOverlayActive ? (
        <div className="absolute top-3 left-3 flex items-center gap-1 z-10">
          {(
            [
              {
                key: "overview",
                icon: <Maximize size={12} />,
                title: "Overview",
              },
              {
                key: "frontDesk",
                icon: <Monitor size={12} />,
                title: "Front desk",
              },
              { key: "lounge", icon: <Armchair size={12} />, title: "Lounge" },
            ] as const
          ).map(({ key, icon, title }) => (
            <button
              key={key}
              title={title}
              onClick={() => {
                cameraPresetRef.current = CAMERA_PRESET_MAP[key];
              }}
              className="w-7 h-7 flex items-center justify-center rounded-md bg-[#1c1610]/80 text-amber-500/60 border border-amber-900/20 hover:bg-[#2a1e14] hover:text-amber-400 backdrop-blur-sm transition-colors"
            >
              {icon}
            </button>
          ))}
        </div>
      ) : null}

      {/* Title — top center overlay. */}
      {!immersiveOverlayActive ? (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-3 pointer-events-none select-none z-10">
          <div className="h-px w-12 bg-gradient-to-r from-transparent to-amber-500/40" />
          <span className="text-sm tracking-[0.3em] text-amber-300/80 font-bold uppercase">
            {officeTitle}
          </span>
          <div className="h-px w-12 bg-gradient-to-l from-transparent to-amber-500/40" />
        </div>
      ) : null}

      {!immersiveOverlayActive && standupMeeting ? (
        <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
          <div className="rounded-xl border border-emerald-500/20 bg-[#0b1410]/90 px-3 py-2 text-right shadow-lg backdrop-blur-sm">
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-emerald-200/80">
              Standup
            </div>
            <div className="mt-1 text-[11px] font-semibold text-white/90">
              {standupMeeting.phase === "gathering"
                ? "Gathering in meeting room."
                : standupMeeting.phase === "in_progress"
                  ? `Speaking: ${standupSpeakerCard?.agentName ?? "Team"}`
                  : "Standup complete."}
            </div>
            <div className="mt-1 font-mono text-[10px] text-white/50">
              {standupMeeting.arrivedAgentIds.length}/
              {standupMeeting.participantOrder.length} arrived
            </div>
          </div>
          <button
            type="button"
            onClick={() => setStandupBoardOpen(true)}
            className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-emerald-100 transition-colors hover:border-emerald-400/50 hover:text-white"
          >
            Standup board
          </button>
        </div>
      ) : null}

      {/* Agent cards — compact single row pinned to top. */}
      {!immersiveOverlayActive ? (
        <div className="absolute top-10 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-40">
          {topBarAgents.map((agent) => {
            const status = agentStatusLookup[agent.id];
            const isError = status?.isError ?? agent.status === "error";
            const working = status?.working ?? agent.status === "working";
            const mood = moodByAgentId[agent.id];
            const dotClass = isError
              ? "bg-red-400"
              : working
                ? "bg-green-400"
                : "bg-yellow-400";
            const isCatStackChip =
              Boolean(selectedCatChipAgent) &&
              selectedCatChipAgent?.id === agent.id &&
              catAgents.length > 0;
            const hiddenCatCount = Math.max(0, catAgents.length - 1);
            return (
              <div
                key={agent.id}
                className="relative"
                ref={isCatStackChip ? catChipStackRef : null}
              >
                {isCatStackChip ? (
                  <>
                    <div className="absolute inset-0 translate-x-[2px] translate-y-[3px] rounded-lg border border-amber-800/20 bg-[#120d08]/80" />
                    <div className="absolute inset-0 translate-x-[1px] translate-y-[1.5px] rounded-lg border border-amber-700/20 bg-[#17110a]/85" />
                  </>
                ) : null}
                <div
                  className={`relative flex items-center gap-2 bg-[#1c1610]/90 backdrop-blur-sm px-2.5 py-1.5 rounded-lg border border-amber-900/20 shadow cursor-pointer select-none ${isCatStackChip ? "pr-2" : ""}`}
                  onClick={() => {
                    if (isCatStackChip) {
                      setCatChipStackOpen((previous) => !previous);
                    } else {
                      setSpotlightAgentId((prev) =>
                        prev === agent.id ? null : agent.id,
                      );
                    }
                  }}
                >
                  {/* E3 Idea 1: Mood emoji float. */}
                  {mood && (
                    <span
                      key={mood.ts}
                      className="absolute -top-6 left-1/2 -translate-x-1/2 text-sm pointer-events-none"
                      style={{ animation: "mood-float 2.5s ease-out forwards" }}
                    >
                      {mood.emoji}
                    </span>
                  )}
                  <div className="relative shrink-0">
                    <div
                      className="w-4 h-4 rounded-sm"
                      style={{ backgroundColor: agent.color }}
                    />
                    <div
                      className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-[#1c1610] ${dotClass}`}
                    />
                  </div>
                  <span className="text-[10px] font-semibold text-amber-100 whitespace-nowrap max-w-[128px] truncate">
                    {agent.name}
                  </span>
                  {isCatStackChip && hiddenCatCount > 0 ? (
                    <button
                      title="Toggle animal stack"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCatChipStackOpen((previous) => !previous);
                      }}
                      className="inline-flex items-center gap-1 rounded-full border border-amber-700/40 bg-amber-600/10 px-1.5 py-0.5 text-[8px] font-bold text-amber-300 hover:text-amber-100 transition-colors"
                    >
                      +{hiddenCatCount}
                      <ChevronDown
                        size={9}
                        className={`transition-transform ${catChipStackOpen ? "rotate-180" : ""}`}
                      />
                    </button>
                  ) : null}
                  {/* Follow cam toggle button. */}
                  <button
                    title={
                      followAgentId === agent.id
                        ? "Exit follow cam"
                        : "Follow cam"
                    }
                    onClick={(e) => {
                      e.stopPropagation();
                      setFollowAgentId((prev) =>
                        prev === agent.id ? null : agent.id,
                      );
                    }}
                    className={`w-4 h-4 flex items-center justify-center rounded transition-colors ${
                      followAgentId === agent.id
                        ? "text-white opacity-100"
                        : "text-white/50 hover:text-white opacity-70 hover:opacity-100"
                    }`}
                  >
                    <Camera size={9} />
                  </button>
                  <button
                    title={
                      monitorAgentId === agent.id
                        ? "Close desk monitor"
                        : "Open desk monitor"
                    }
                    onClick={(e) => {
                      e.stopPropagation();
                      onMonitorSelect?.(
                        monitorAgentId === agent.id ? null : agent.id,
                      );
                    }}
                    className={`w-4 h-4 flex items-center justify-center rounded transition-colors ${
                      monitorAgentId === agent.id
                        ? "text-emerald-300 opacity-100"
                        : "text-white/50 hover:text-emerald-200 opacity-70 hover:opacity-100"
                    }`}
                  >
                    <Monitor size={9} />
                  </button>
                  {/* Idea 9 (original): Run counter badge. */}
                  {(runCountByAgentId[agent.id] ?? 0) > 0 && (
                    <span className="text-[8px] font-bold bg-amber-600/30 text-amber-400 border border-amber-700/30 rounded-full px-1.5 py-0.5 leading-none">
                      {runCountByAgentId[agent.id]}
                    </span>
                  )}
                </div>
                {isCatStackChip && catChipStackOpen && catAgents.length > 1 ? (
                  <div className="absolute top-full left-0 mt-1 w-52 max-h-72 overflow-y-auto rounded-lg border border-amber-800/30 bg-[#120e08]/95 shadow-xl backdrop-blur-sm p-1.5 z-50">
                    {catAgents.map((catAgent) => {
                      const catStatus = agentStatusLookup[catAgent.id];
                      const catIsError =
                        catStatus?.isError ?? catAgent.status === "error";
                      const catWorking =
                        catStatus?.working ?? catAgent.status === "working";
                      const catDotClass = catIsError
                        ? "bg-red-400"
                        : catWorking
                          ? "bg-green-400"
                          : "bg-yellow-400";
                      const isSelected = selectedCatChipAgent?.id === catAgent.id;
                      const isRemovableSyntheticCat =
                        Boolean(onRemoveSyntheticCat) &&
                        catAgent.id !== GARFIELD_COMPANION.agentId &&
                        (catAgent.id.startsWith(SYNTHETIC_CAT_ID_PREFIX) ||
                          catAgent.id.startsWith(SYNTHETIC_ANIMAL_ID_PREFIX));
                      return (
                        <div
                          key={catAgent.id}
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCatChipId(catAgent.id);
                            setCatChipStackOpen(false);
                            setSpotlightAgentId(catAgent.id);
                          }}
                          onKeyDown={(e) => {
                            if (e.key !== "Enter" && e.key !== " ") return;
                            e.preventDefault();
                            e.stopPropagation();
                            setSelectedCatChipId(catAgent.id);
                            setCatChipStackOpen(false);
                            setSpotlightAgentId(catAgent.id);
                          }}
                          className={`group w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors cursor-pointer ${isSelected ? "bg-amber-500/15 border border-amber-600/30" : "hover:bg-amber-600/10 border border-transparent"}`}
                        >
                          <div className="relative shrink-0">
                            <div
                              className="w-3.5 h-3.5 rounded-sm"
                              style={{ backgroundColor: catAgent.color }}
                            />
                            <div
                              className={`absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full border border-[#120e08] ${catDotClass}`}
                            />
                          </div>
                          <span className="text-[10px] text-amber-100 truncate flex-1">
                            {catAgent.name}
                          </span>
                          {isSelected ? (
                            <span className="text-[8px] uppercase tracking-wider text-amber-300">
                              Top
                            </span>
                          ) : null}
                          {isRemovableSyntheticCat ? (
                            <button
                              type="button"
                              title={`Delete ${catAgent.name}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                onRemoveSyntheticCat?.(catAgent.id);
                                setCatChipStackOpen(false);
                              }}
                              className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded border border-red-600/40 bg-red-500/10 text-red-300 opacity-0 transition-opacity hover:text-red-100 group-hover:opacity-100"
                            >
                              <X size={10} />
                            </button>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}

      {/* Idea 1: Agent tooltip — shown when hovering an agent in the 3D scene. */}
      {!immersiveOverlayActive &&
        hoveredAgent &&
        (() => {
          const isError = hoveredAgentStatus?.isError ?? hoveredAgent.status === "error";
          const working = hoveredAgentStatus?.working ?? hoveredAgent.status === "working";
          return (
            <div className="absolute top-24 left-1/2 -translate-x-1/2 z-30 pointer-events-none select-none">
              <div className="flex items-center gap-3 bg-[#120e08]/95 backdrop-blur-sm border border-amber-800/30 rounded-lg px-4 py-2.5 shadow-xl">
                <div className="relative shrink-0">
                  <div
                    className="w-6 h-6 rounded-sm"
                    style={{ backgroundColor: hoveredAgent.color }}
                  />
                  <div
                    className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-[#120e08] ${
                      isError
                        ? "bg-red-400"
                        : working
                          ? "bg-green-400"
                          : "bg-yellow-400"
                    }`}
                  />
                </div>
                <div>
                  <div className="text-xs font-bold text-amber-100">
                    {hoveredAgent.name}
                  </div>
                  <div className="text-[10px] text-amber-600 uppercase tracking-widest">
                    {hoveredAgent.item}
                  </div>
                  {/* New Idea 8: last seen timestamp. */}
                  {(() => {
                    const ts = lastSeenByAgentId[hoveredAgent.id];
                    if (!ts || ts <= 0) return null;
                    const mins = Math.round((Date.now() - ts) / 60_000);
                    if (mins <= 0) return null;
                    return (
                      <div className="text-[9px] text-amber-700/70">
                        last active {mins}m ago
                      </div>
                    );
                  })()}
                </div>
                <div
                  className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ml-1 ${
                    isError
                      ? "bg-red-900/40 text-red-400 ring-1 ring-red-800/40"
                      : working
                        ? "bg-green-900/40 text-green-400 ring-1 ring-green-800/40"
                        : "bg-yellow-900/30 text-yellow-500 ring-1 ring-yellow-800/30"
                  }`}
                >
                  {isError ? "error" : working ? "working" : "idle"}
                </div>
              </div>
            </div>
          );
        })()}

      {/* Speech bubble image overlay — shows the actual image when an agent's reply contains one. */}
      {!immersiveOverlayActive &&
        (() => {
          const visibleImageAgentId = [...speechAgentIds].find(
            (id) => speechImageUrlByAgentId[id],
          );
          if (!visibleImageAgentId) return null;
          const agent = agents.find((a) => a.id === visibleImageAgentId);
          const imageUrl = speechImageUrlByAgentId[visibleImageAgentId];
          if (!imageUrl) return null;
          return (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 pointer-events-none select-none">
              <div className="flex flex-col items-center gap-2 bg-[#120e08]/95 backdrop-blur-sm border border-amber-800/30 rounded-lg p-3 shadow-xl max-w-xs">
                {agent ? (
                  <div className="flex items-center gap-2 self-start">
                    <div
                      className="w-4 h-4 rounded-sm shrink-0"
                      style={{ backgroundColor: agent.color }}
                    />
                    <span className="text-[10px] font-bold text-amber-200 uppercase tracking-widest">
                      {agent.name}
                    </span>
                  </div>
                ) : null}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl}
                  alt=""
                  className="rounded max-h-52 w-full object-contain border border-white/10"
                />
              </div>
            </div>
          );
        })()}

      {/* New Idea 1: Right-click context menu on agents. */}
      {!immersiveOverlayActive &&
        contextMenu &&
        (() => {
          const agent = agents.find((a) => a.id === contextMenu.id);
          return (
            <div
              className="absolute z-50 bg-[#120e08] border border-amber-800/30 rounded-lg shadow-xl overflow-hidden"
              style={{ left: contextMenu.x, top: contextMenu.y }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <div className="px-3 py-1.5 border-b border-amber-900/20">
                <span className="text-[10px] font-bold text-amber-500/70 uppercase tracking-widest">
                  {agent?.name}
                </span>
              </div>
              <button
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-amber-200/80 hover:bg-amber-900/20 transition-colors text-left"
                onClick={() => {
                  navigator.clipboard.writeText(contextMenu.id);
                  setContextMenu(null);
                }}
              >
                Copy ID
              </button>
            </div>
          );
        })()}

      {/* Follow cam HUD — shown while a third-person follow camera is active. */}
      {!immersiveOverlayActive &&
        followAgentId &&
        (() => {
          const followed = agents.find((a) => a.id === followAgentId);
          return (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-[#120e08]/90 backdrop-blur-sm border border-amber-700/40 rounded-full px-3 py-1 z-20 pointer-events-none select-none">
              <Camera size={10} className="text-amber-400" />
              <span className="text-[10px] font-bold text-amber-300 tracking-widest uppercase">
                {followed?.name ?? "Agent"}
              </span>
              <span className="text-[9px] text-amber-600/60">
                · click 📷 to exit
              </span>
            </div>
          );
        })()}

      {!immersiveOverlayActive &&
      githubReviewAgentId &&
      !githubCommandArrived ? (
        <div className="pointer-events-none absolute top-16 left-1/2 z-20 -translate-x-1/2">
          <div className="rounded-full border border-cyan-300/18 bg-[#06101f]/88 px-4 py-2 text-[11px] uppercase tracking-[0.22em] text-cyan-100/78 backdrop-blur-sm">
            Agent walking to the Code Review room.
          </div>
        </div>
      ) : null}

      {!immersiveOverlayActive && qaTestingAgentId && !qaCommandArrived ? (
        <div className="pointer-events-none absolute top-28 left-1/2 z-20 -translate-x-1/2">
          <div className="rounded-full border border-violet-300/20 bg-[#12091d]/88 px-4 py-2 text-[11px] uppercase tracking-[0.22em] text-violet-100/80 backdrop-blur-sm">
            Agent walking to the QA Lab.
          </div>
        </div>
      ) : null}

      {monitorImmersive ? (
        <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
          <div className="absolute inset-0 bg-black/18" />
          <div className="absolute inset-x-0 top-0 h-[10vh] bg-black" />
          <div className="absolute inset-x-0 bottom-0 h-[13vh] bg-black" />
          <div className="absolute inset-y-0 left-0 w-[6vw] bg-black" />
          <div className="absolute inset-y-0 right-0 w-[6vw] bg-black" />
          <div className="absolute inset-[5vh_5vw_8vh_5vw] rounded-[28px] border border-[#3a3a3a] shadow-[0_0_0_18px_rgba(8,8,8,0.96),0_0_0_22px_rgba(64,64,64,0.7),0_24px_90px_rgba(0,0,0,0.65)]" />
          <div className="absolute inset-[5.7vh_5.7vw_8.7vh_5.7vw] rounded-[18px] border border-white/8 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)]" />
          <div className="pointer-events-auto absolute inset-[5.8vh_5.8vw_8.8vh_5.8vw] overflow-hidden rounded-[16px] bg-black">
            {activeMonitor ? (
              <MonitorImmersiveOverlay monitor={activeMonitor} />
            ) : null}
            <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-emerald-300/6" />
            <div
              className="absolute inset-0 opacity-[0.08]"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(to bottom, rgba(255,255,255,0.22) 0px, rgba(255,255,255,0.22) 1px, transparent 2px, transparent 4px)",
              }}
            />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_45%,rgba(0,0,0,0.22)_100%)]" />
          </div>
          <div className="absolute bottom-[3.1vh] left-1/2 h-[1.2vh] w-[12vw] -translate-x-1/2 rounded-full bg-[#0d0d0d] shadow-[0_0_0_1px_rgba(90,90,90,0.5)]" />
          <div className="absolute bottom-[1.1vh] left-1/2 h-[2vh] w-[20vw] -translate-x-1/2 rounded-[999px] bg-[#101010] shadow-[0_0_0_1px_rgba(82,82,82,0.5)]" />
          <div className="pointer-events-auto absolute right-[7vw] top-[7vh] flex items-center gap-3 rounded-full border border-white/10 bg-black/60 px-4 py-2 backdrop-blur-sm">
            <div className="h-2 w-2 rounded-full bg-emerald-400" />
            <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-200/90">
              Monitor View
            </div>
            <button
              type="button"
              onClick={() => onMonitorSelect?.(null)}
              className="rounded-full border border-white/10 px-3 py-1 text-[11px] text-white/70 transition-colors hover:border-white/20 hover:text-white"
            >
              Exit
            </button>
          </div>
        </div>
      ) : null}

      {standupImmersive && standupMeeting ? (
        <StandupImmersiveScreen
          meeting={standupMeeting}
          onClose={closeStandupBoard}
        />
      ) : null}

      {githubImmersive ? (
        <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.12),rgba(0,0,0,0.84))]" />
          <div className="absolute inset-x-0 top-0 h-[9vh] bg-[linear-gradient(180deg,rgba(1,5,16,0.98),rgba(1,5,16,0.75))]" />
          <div className="absolute inset-x-0 bottom-0 h-[11vh] bg-[linear-gradient(0deg,rgba(0,0,0,0.98),rgba(0,0,0,0.55))]" />
          <div className="absolute inset-y-0 left-0 w-[5vw] bg-black/94" />
          <div className="absolute inset-y-0 right-0 w-[5vw] bg-black/94" />
          <div className="absolute inset-[5vh_4.8vw_7vh_4.8vw] rounded-[34px] border border-cyan-300/16 bg-[#030815] shadow-[0_0_0_18px_rgba(1,5,16,0.96),0_0_0_22px_rgba(34,211,238,0.14),0_28px_110px_rgba(0,0,0,0.74)]" />
          <div className="absolute inset-[5.8vh_5.6vw_7.8vh_5.6vw] rounded-[26px] border border-cyan-300/12 bg-[#050d1d] shadow-[inset_0_0_0_1px_rgba(125,211,252,0.04)]" />
          <div className="pointer-events-auto absolute inset-[6vh_5.8vw_8vh_5.8vw] overflow-hidden rounded-[24px] bg-[#040a15]">
            <GithubImmersiveScreen
              agentName={
                githubReviewAgentId
                  ? (agents.find((agent) => agent.id === githubReviewAgentId)
                      ?.name ?? null)
                  : null
              }
              githubSkill={githubSkill}
              onOpenSetup={onOpenGithubSkillSetup}
            />
          </div>
          <div className="absolute bottom-[2vh] left-1/2 h-[2vh] w-[22vw] -translate-x-1/2 rounded-[999px] bg-[#061120] shadow-[0_0_0_1px_rgba(34,211,238,0.2)]" />
          <div className="pointer-events-auto absolute right-[5.2vw] top-[3.4vh]">
            <button
              type="button"
              onClick={() => {
                if (activeGithubTerminalUid) {
                  setActiveGithubTerminalUid(null);
                } else {
                  onGithubReviewDismiss?.();
                }
              }}
              aria-label="Close GitHub view"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-cyan-300/20 bg-[#05111f]/82 text-[18px] leading-none text-cyan-100/78 backdrop-blur-sm transition-colors hover:border-cyan-200/40 hover:text-white"
            >
              X
            </button>
          </div>
        </div>
      ) : null}

      {qaImmersive ? (
        <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(167,139,250,0.14),rgba(0,0,0,0.88))]" />
          <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,0.14)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.14)_1px,transparent_1px)] [background-size:52px_52px]" />
          <div className="absolute inset-x-0 top-0 h-[10vh] bg-[linear-gradient(180deg,rgba(12,6,24,0.98),rgba(12,6,24,0.78))]" />
          <div className="absolute inset-x-0 bottom-0 h-[12vh] bg-[linear-gradient(0deg,rgba(6,2,18,0.98),rgba(6,2,18,0.58))]" />
          <div className="absolute inset-y-0 left-0 w-[6vw] bg-[#05030d]/94" />
          <div className="absolute inset-y-0 right-0 w-[6vw] bg-[#05030d]/94" />
          <div className="absolute inset-[6vh_6vw_8vh_6vw] rounded-[32px] border border-violet-300/18 bg-[#090411] shadow-[0_0_0_18px_rgba(8,4,18,0.96),0_0_0_22px_rgba(167,139,250,0.16),0_30px_110px_rgba(0,0,0,0.72)]" />
          <div className="pointer-events-auto absolute inset-[6.7vh_6.7vw_8.7vh_6.7vw] overflow-x-hidden overflow-y-auto overscroll-contain rounded-[24px] border border-violet-300/10 bg-[#0d0718]">
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(167,139,250,0.08),transparent_22%,transparent_78%,rgba(56,189,248,0.06))]" />
            <div className="absolute inset-0 opacity-[0.08] [background-image:repeating-linear-gradient(to_bottom,rgba(255,255,255,0.22)_0px,rgba(255,255,255,0.22)_1px,transparent_2px,transparent_4px)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_44%,rgba(0,0,0,0.22)_100%)]" />
            <div className="relative flex min-h-full flex-col text-white">
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-violet-300/10 bg-[#0d0718]/95 px-8 py-5 backdrop-blur-sm">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-violet-200/72">
                    QA Lab
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-white/94">
                    Testing Console
                  </div>
                </div>
                <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-200/88">
                  Verifying Build
                </div>
              </div>
              <div className="grid flex-1 grid-cols-[1.4fr_1fr] gap-6 px-8 py-6">
                <div className="rounded-[22px] border border-violet-300/12 bg-black/26 p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-violet-200/70">
                      Active Workflow
                    </div>
                    <div className="text-[11px] uppercase tracking-[0.22em] text-cyan-200/70">
                      QA Ready
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {[
                      "Write tests",
                      "Run tests",
                      "Verify behavior",
                      "Reproduce bugs",
                      "Check if this works",
                      "Regression scan",
                    ].map((step) => (
                      <div
                        key={step}
                        className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-white/82"
                      >
                        {step}
                      </div>
                    ))}
                  </div>
                  <div className="mt-5 rounded-[20px] border border-violet-300/12 bg-[#120d22]/88 p-4">
                    <div className="flex items-center justify-between">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-violet-200/70">
                        Pipeline Health
                      </div>
                      <div className="text-[11px] uppercase tracking-[0.22em] text-emerald-200/82">
                        Stable
                      </div>
                    </div>
                    <div className="mt-4 space-y-3">
                      {[
                        {
                          label: "Unit suite",
                          width: "92%",
                          tone: "from-emerald-400 to-cyan-400",
                        },
                        {
                          label: "Regression pass",
                          width: "78%",
                          tone: "from-cyan-400 to-violet-400",
                        },
                        {
                          label: "Device verification",
                          width: "66%",
                          tone: "from-violet-400 to-fuchsia-400",
                        },
                      ].map((bar) => (
                        <div key={bar.label}>
                          <div className="mb-1 flex items-center justify-between text-[11px] text-white/68">
                            <span>{bar.label}</span>
                            <span>{bar.width}</span>
                          </div>
                          <div className="h-2 rounded-full bg-white/8">
                            <div
                              className={`h-2 rounded-full bg-gradient-to-r ${bar.tone}`}
                              style={{ width: bar.width }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="mt-5 rounded-[20px] border border-cyan-300/12 bg-[#07111d]/86 p-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-200/72">
                      Assigned Agent
                    </div>
                    <div className="mt-2 text-lg font-semibold text-cyan-50">
                      {qaTestingAgentId
                        ? (agents.find((agent) => agent.id === qaTestingAgentId)
                            ?.name ?? "Agent")
                        : "QA Operator"}
                    </div>
                    <div className="mt-2 text-sm leading-6 text-cyan-50/72">
                      Running validation passes across the lab monitors and
                      connected test devices.
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-4">
                  <div className="rounded-[22px] border border-violet-300/12 bg-black/26 p-5">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-violet-200/70">
                      Device Wall
                    </div>
                    <div className="mt-4 space-y-3">
                      {[
                        { label: "Web smoke tests", state: "online" },
                        { label: "Mobile repro pass", state: "online" },
                        { label: "Console verification", state: "online" },
                        { label: "Cross-device check", state: "queued" },
                      ].map(({ label, state }, index) => (
                        <div
                          key={label}
                          className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3"
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className={`h-2.5 w-2.5 rounded-full ${
                                index < 3 ? "bg-emerald-300" : "bg-amber-300"
                              }`}
                            />
                            <span className="text-sm text-white/82">
                              {label}
                            </span>
                          </div>
                          <span className="text-[11px] uppercase tracking-[0.22em] text-emerald-200/78">
                            {state}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-[22px] border border-cyan-300/12 bg-[#07111d]/88 p-5">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-200/72">
                      Live Findings
                    </div>
                    <div className="mt-4 space-y-3 text-sm">
                      {[
                        "Input validation mismatch on mobile settings view.",
                        "Repro path captured for flaky workspace sync issue.",
                        "Visual diff queued for monitor overlay transition.",
                      ].map((finding) => (
                        <div
                          key={finding}
                          className="rounded-2xl border border-cyan-300/10 bg-cyan-300/[0.04] px-4 py-3 text-cyan-50/78"
                        >
                          {finding}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-[22px] border border-amber-300/12 bg-[#161007]/88 p-5">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-amber-200/72">
                      Suggested Prompts
                    </div>
                    <div className="mt-4 space-y-2 text-sm text-amber-50/78">
                      <div>`write tests`</div>
                      <div>`run tests`</div>
                      <div>`verify`</div>
                      <div>`reproduce`</div>
                      <div>`check if this works`</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="absolute bottom-[2.4vh] left-1/2 h-[1.8vh] w-[20vw] -translate-x-1/2 rounded-[999px] bg-[#12081e] shadow-[0_0_0_1px_rgba(167,139,250,0.24)]" />
          <div className="pointer-events-auto absolute right-[5.2vw] top-[3.4vh]">
            <button
              type="button"
              onClick={() => {
                if (activeQaTerminalUid) {
                  setActiveQaTerminalUid(null);
                } else {
                  onQaLabDismiss?.();
                }
              }}
              aria-label="Close QA lab view"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-violet-300/20 bg-[#12091d]/82 text-[18px] leading-none text-violet-100/78 backdrop-blur-sm transition-colors hover:border-violet-200/40 hover:text-white"
            >
              X
            </button>
          </div>
        </div>
      ) : null}

      {smsBoothImmersive && effectiveTextMessageScenario && effectiveSmsBoothAgentId ? (
        <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
          <div className="absolute inset-0 bg-black/45" />
          <div className="absolute inset-x-0 top-0 h-[8vh] bg-[linear-gradient(180deg,rgba(0,0,0,0.94),rgba(0,0,0,0.62))]" />
          <div className="absolute inset-x-0 bottom-0 h-[12vh] bg-[linear-gradient(0deg,rgba(0,0,0,0.96),rgba(0,0,0,0.58))]" />
          <div className="absolute inset-y-0 left-0 w-[7vw] bg-black/94" />
          <div className="absolute inset-y-0 right-0 w-[7vw] bg-black/94" />
          <div className="absolute inset-[7vh_8vw_10vh_8vw] rounded-[34px] border border-sky-300/18 bg-[#010617] shadow-[0_0_0_18px_rgba(1,6,23,0.96),0_0_0_22px_rgba(56,189,248,0.15),0_28px_100px_rgba(0,0,0,0.8)]" />
          <div className="absolute inset-[7.8vh_8.8vw_10.8vh_8.8vw] rounded-[24px] border border-sky-200/14 bg-[#020817] shadow-[inset_0_0_0_1px_rgba(125,211,252,0.04)]" />
          <div className="pointer-events-auto absolute inset-[8vh_9vw_11vh_9vw] overflow-hidden rounded-[22px] bg-[#020617]">
            <SmsBoothImmersiveScreen
              scenario={effectiveTextMessageScenario}
              step={textMessageStep}
              typedMessage={typedMessageText}
              activeKey={activeTextKey}
              contacts={textContacts}
              activeContactIndex={activeTextContactIndex}
            />
          </div>
          <div className="absolute bottom-[4vh] left-1/2 h-[1.6vh] w-[16vw] -translate-x-1/2 rounded-full bg-[#07111f] shadow-[0_0_0_1px_rgba(56,189,248,0.22)]" />
          <div className="absolute bottom-[2vh] left-1/2 h-[2.2vh] w-[24vw] -translate-x-1/2 rounded-[999px] bg-[#07101c] shadow-[0_0_0_1px_rgba(56,189,248,0.18)]" />
          <div className="pointer-events-auto absolute right-[5.2vw] top-[3.4vh]">
            <button
              type="button"
              onClick={() => {
                if (smsBoothAgentId) {
                  onTextMessageComplete?.(smsBoothAgentId);
                  return;
                }
                closeManualSmsBoothView();
              }}
              aria-label="Close messaging booth view"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-sky-200/20 bg-[#03111f]/82 text-[18px] leading-none text-sky-50/78 backdrop-blur-sm transition-colors hover:border-sky-200/40 hover:text-white"
            >
              X
            </button>
          </div>
        </div>
      ) : null}

      {phoneBoothImmersive && effectivePhoneCallScenario && effectivePhoneBoothAgentId ? (
        <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
          <div className="absolute inset-0 bg-black/45" />
          <div className="absolute inset-x-0 top-0 h-[8vh] bg-[linear-gradient(180deg,rgba(0,0,0,0.94),rgba(0,0,0,0.62))]" />
          <div className="absolute inset-x-0 bottom-0 h-[12vh] bg-[linear-gradient(0deg,rgba(0,0,0,0.96),rgba(0,0,0,0.58))]" />
          <div className="absolute inset-y-0 left-0 w-[7vw] bg-black/94" />
          <div className="absolute inset-y-0 right-0 w-[7vw] bg-black/94" />
          <div className="absolute inset-[7vh_8vw_10vh_8vw] rounded-[34px] border border-sky-300/18 bg-[#010617] shadow-[0_0_0_18px_rgba(1,6,23,0.96),0_0_0_22px_rgba(56,189,248,0.15),0_28px_100px_rgba(0,0,0,0.8)]" />
          <div className="absolute inset-[7.8vh_8.8vw_10.8vh_8.8vw] rounded-[24px] border border-sky-200/14 bg-[#020817] shadow-[inset_0_0_0_1px_rgba(125,211,252,0.04)]" />
          <div className="pointer-events-auto absolute inset-[8vh_9vw_11vh_9vw] overflow-hidden rounded-[22px] bg-[#020617]">
            <PhoneBoothImmersiveScreen
              scenario={effectivePhoneCallScenario}
              step={phoneCallStep}
              typedDigits={dialedDigits}
            />
          </div>
          <div className="absolute bottom-[4vh] left-1/2 h-[1.6vh] w-[16vw] -translate-x-1/2 rounded-full bg-[#07111f] shadow-[0_0_0_1px_rgba(56,189,248,0.22)]" />
          <div className="absolute bottom-[2vh] left-1/2 h-[2.2vh] w-[24vw] -translate-x-1/2 rounded-[999px] bg-[#07101c] shadow-[0_0_0_1px_rgba(56,189,248,0.18)]" />
          <div className="pointer-events-auto absolute right-[5.2vw] top-[3.4vh]">
            <button
              type="button"
              onClick={() => {
                if (phoneBoothAgentId) {
                  onPhoneCallComplete?.(phoneBoothAgentId);
                  return;
                }
                closeManualPhoneBoothView();
              }}
              aria-label="Close phone booth view"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-sky-200/20 bg-[#03111f]/82 text-[18px] leading-none text-sky-50/78 backdrop-blur-sm transition-colors hover:border-sky-200/40 hover:text-white"
            >
              X
            </button>
          </div>
        </div>
      ) : null}

      {atmImmersive ? (
        <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
          <div className="absolute inset-0 bg-black/30" />
          <div className="absolute inset-x-0 top-0 h-[8vh] bg-[linear-gradient(180deg,rgba(0,0,0,0.92),rgba(0,0,0,0.65))]" />
          <div className="absolute inset-x-0 bottom-0 h-[12vh] bg-[linear-gradient(0deg,rgba(0,0,0,0.94),rgba(0,0,0,0.55))]" />
          <div className="absolute inset-y-0 left-0 w-[7vw] bg-black/92" />
          <div className="absolute inset-y-0 right-0 w-[7vw] bg-black/92" />
          <div className="absolute inset-[7vh_8vw_10vh_8vw] rounded-[34px] border border-[#7dfff0]/22 bg-[#010708] shadow-[0_0_0_18px_rgba(1,8,9,0.96),0_0_0_22px_rgba(86,255,234,0.18),0_28px_100px_rgba(0,0,0,0.72)]" />
          <div className="absolute inset-[7.8vh_8.8vw_10.8vh_8.8vw] rounded-[24px] border border-[#8efff2]/16 bg-[#021112] shadow-[inset_0_0_0_1px_rgba(130,255,232,0.04)]" />
          <div className="pointer-events-auto absolute inset-[8vh_9vw_11vh_9vw] overflow-hidden rounded-[22px] bg-[#031011]">
            {atmAnalytics ? <AtmImmersiveScreen {...atmAnalytics} /> : null}
            <div className="pointer-events-none absolute inset-0 opacity-[0.08] [background-image:repeating-linear-gradient(to_bottom,rgba(255,255,255,0.22)_0px,rgba(255,255,255,0.22)_1px,transparent_2px,transparent_4px)]" />
          </div>
          <div className="absolute bottom-[4vh] left-1/2 h-[1.6vh] w-[16vw] -translate-x-1/2 rounded-full bg-[#071617] shadow-[0_0_0_1px_rgba(86,255,234,0.24)]" />
          <div className="absolute bottom-[2vh] left-1/2 h-[2.2vh] w-[24vw] -translate-x-1/2 rounded-[999px] bg-[#071113] shadow-[0_0_0_1px_rgba(86,255,234,0.18)]" />
          <div className="pointer-events-auto absolute right-[5.2vw] top-[3.4vh]">
            <button
              type="button"
              onClick={() => setActiveAtmUid(null)}
              aria-label="Close ATM view"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[#8efff2]/20 bg-[#031214]/82 text-[18px] leading-none text-[#d7fff9]/78 backdrop-blur-sm transition-colors hover:border-[#8efff2]/40 hover:text-white"
            >
              X
            </button>
          </div>
        </div>
      ) : null}

      {/* Edit mode badge. */}
      {!immersiveOverlayActive && editMode && (
        <div className="absolute top-3 left-3 px-3 py-1 rounded-md bg-amber-500/90 text-[#1a1008] text-xs font-bold uppercase tracking-widest pointer-events-none z-10">
          Edit Mode
        </div>
      )}

      {!immersiveOverlayActive && editMode && selectedItem && (
        <div className="absolute top-12 right-16 w-64 rounded-lg border border-amber-800/30 bg-[#120e08]/95 p-3 shadow-xl backdrop-blur-sm z-20">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-500/65">
                Selected
              </div>
              <div className="mt-1 text-xs font-semibold text-amber-100">
                {PALETTE.find((entry) => entry.type === selectedItem.type)
                  ?.label ??
                  resolveItemTypeKey(selectedItem).replaceAll("_", " ")}
              </div>
              <div className="mt-1 text-[10px] text-amber-500/55">
                rot {Math.round(selectedItem.facing ?? 0)} deg · lift{" "}
                {(selectedItem.elevation ?? 0).toFixed(2)}
              </div>
            </div>
            <button
              onClick={closeSelectedEditor}
              title="Close object editor"
              className="flex h-7 w-7 items-center justify-center rounded-md border border-amber-800/25 bg-[#1c1610] text-amber-300/80 transition-colors hover:bg-[#261e16] hover:text-amber-200"
            >
              <X size={12} />
            </button>
          </div>
          <div className="mb-3">
            <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-amber-500/65">
              Move
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <div />
              <button
                onClick={() => moveSelectedItem(0, -SNAP_GRID)}
                className="rounded-md border border-amber-800/25 bg-[#1c1610] px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-amber-200/85 hover:bg-[#261e16]"
              >
                Forward
              </button>
              <div />
              <button
                onClick={() => moveSelectedItem(-SNAP_GRID, 0)}
                className="rounded-md border border-amber-800/25 bg-[#1c1610] px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-amber-200/85 hover:bg-[#261e16]"
              >
                Left
              </button>
              <button
                onClick={() => moveSelectedItem(0, 0, ELEVATION_STEP)}
                className="rounded-md border border-amber-800/25 bg-[#1c1610] px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-amber-200/85 hover:bg-[#261e16]"
              >
                Up
              </button>
              <button
                onClick={() => moveSelectedItem(SNAP_GRID, 0)}
                className="rounded-md border border-amber-800/25 bg-[#1c1610] px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-amber-200/85 hover:bg-[#261e16]"
              >
                Right
              </button>
              <div />
              <button
                onClick={() => moveSelectedItem(0, SNAP_GRID)}
                className="rounded-md border border-amber-800/25 bg-[#1c1610] px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-amber-200/85 hover:bg-[#261e16]"
              >
                Back
              </button>
              <div />
              <div />
              <button
                onClick={() => moveSelectedItem(0, 0, -ELEVATION_STEP)}
                className="rounded-md border border-amber-800/25 bg-[#1c1610] px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-amber-200/85 hover:bg-[#261e16]"
              >
                Down
              </button>
              <div />
            </div>
          </div>
          <div>
            <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-amber-500/65">
              Rotate
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => rotateSelectedItem(-ROTATION_STEP_DEG)}
                className="rounded-md border border-amber-800/25 bg-[#1c1610] px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-amber-200/85 hover:bg-[#261e16]"
              >
                -15 deg
              </button>
              <button
                onClick={() => rotateSelectedItem(ROTATION_STEP_DEG)}
                className="rounded-md border border-amber-800/25 bg-[#1c1610] px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-amber-200/85 hover:bg-[#261e16]"
              >
                +15 deg
              </button>
            </div>
            <div className="mt-2 text-[10px] text-amber-500/50">
              Arrows move on the floor. PageUp and PageDown lift. [ and ]
              rotate.
            </div>
          </div>
          {selectedItem.type === "desk_cubicle" ? (
            <div className="mt-3 border-t border-amber-900/20 pt-3">
              <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-amber-500/65">
                Desk Assignment
              </div>
              <select
                value={selectedDeskAssignmentAgentId}
                onChange={(event) => {
                  const nextAgentId = event.target.value.trim();
                  onDeskAssignmentChange?.(
                    selectedItem._uid,
                    nextAgentId || null,
                  );
                }}
                className="w-full rounded-md border border-amber-800/25 bg-[#1c1610] px-2 py-2 text-[11px] text-amber-100 outline-none transition-colors focus:border-amber-500/50"
              >
                <option value="">Unassigned desk.</option>
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name}
                  </option>
                ))}
              </select>
              <div className="mt-2 text-[10px] text-amber-500/50">
                Assigning a desk makes `target: desk` route that agent here.
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Edit Drawer — bottom right above toolbar when open. */}
      {!immersiveOverlayActive && editMode && drawerOpen && !selectedItem && (
        <div className="absolute bottom-14 right-3 w-[18.5rem] max-h-[calc(100vh-100px)] overflow-y-auto rounded-lg bg-[#1c1610]/95 border border-amber-800/20 p-3 shadow-xl backdrop-blur-sm z-20">
          <div className="mb-3 flex items-center gap-1 rounded-md border border-amber-900/25 bg-[#120e08] p-1">
            <button
              type="button"
              onClick={() => setEditDrawerTab("objects")}
              className={`flex-1 rounded px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em] transition-colors ${
                editDrawerTab === "objects"
                  ? "bg-amber-500/20 text-amber-200"
                  : "text-amber-500/75 hover:text-amber-300"
              }`}
            >
              Objects
            </button>
            <button
              type="button"
              onClick={() => setEditDrawerTab("cat_topia")}
              className={`flex-1 rounded px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em] transition-colors ${
                editDrawerTab === "cat_topia"
                  ? "bg-amber-500/20 text-amber-200"
                  : "text-amber-500/75 hover:text-amber-300"
              }`}
            >
              Zoo-Topia
            </button>
          </div>
          {editDrawerTab === "objects" ? (
            <div>
              <div className="mb-3 text-[10px] text-amber-500/70 font-bold uppercase tracking-widest">
                Objects
              </div>
              <div className="grid grid-cols-2 gap-2">
                {PALETTE.map((entry) => (
                  <button
                    key={entry.type}
                    onClick={() => startPlacing(entry.type)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-md border transition-all text-center ${
                      drag.kind === "placing" &&
                      (drag as { kind: "placing"; itemType: string }).itemType ===
                        entry.type
                        ? "bg-amber-500/20 border-amber-500/50 text-amber-300"
                        : "bg-[#120e08] border-amber-900/15 text-amber-200/70 hover:bg-[#261e16] hover:border-amber-800/30"
                    }`}
                  >
                    <span className="text-lg leading-none">{entry.icon}</span>
                    <span className="text-[9px] font-semibold uppercase tracking-wider leading-tight">
                      {entry.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <div className="mb-3 text-[10px] text-amber-500/70 font-bold uppercase tracking-widest">
                Zoo-Topia
              </div>
              <div className="space-y-3">
                <label className="block">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-400/80">
                      Main Animal Name
                    </span>
                    <button
                      type="button"
                      onClick={() => setCatTopiaHelpField("mainCatName")}
                      title="What does this setting do?"
                      className="flex h-4 w-4 items-center justify-center rounded-full border border-amber-700/60 bg-[#1f170f] text-[10px] font-bold leading-none text-amber-300/90 transition-colors hover:border-amber-500/80 hover:text-amber-200"
                    >
                      i
                    </button>
                  </div>
                  <input
                    type="text"
                    maxLength={CAT_TOPIA_MAIN_NAME_MAX_CHARS}
                    value={resolvedCatTopiaSettings.mainCatName}
                    onChange={(event) =>
                      onCatTopiaSettingsChange?.({
                        mainCatName: event.target.value,
                      })
                    }
                    className="w-full rounded-md border border-amber-800/30 bg-[#120e08] px-2 py-2 text-[11px] text-amber-100 outline-none transition-colors focus:border-amber-500/45"
                  />
                </label>

                <label className="block">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-400/80">
                      Enabled Species
                    </span>
                    <button
                      type="button"
                      onClick={() => setCatTopiaHelpField("enabledSpecies")}
                      title="What does this setting do?"
                      className="flex h-4 w-4 items-center justify-center rounded-full border border-amber-700/60 bg-[#1f170f] text-[10px] font-bold leading-none text-amber-300/90 transition-colors hover:border-amber-500/80 hover:text-amber-200"
                    >
                      i
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 rounded-md border border-amber-800/30 bg-[#120e08] p-2">
                    {ZOO_SPECIES_OPTIONS.map((species) => {
                      const checked = resolvedCatTopiaSettings.enabledSpecies.includes(
                        species,
                      );
                      const label = getZooSpeciesMeta(species).label;
                      return (
                        <label
                          key={species}
                          className="flex items-center gap-1.5 rounded px-1 py-0.5 text-[10px] text-amber-100 hover:bg-amber-500/10"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(event) => {
                              const selected = new Set(
                                resolvedCatTopiaSettings.enabledSpecies,
                              );
                              if (event.target.checked) {
                                selected.add(species);
                              } else {
                                selected.delete(species);
                              }
                              const next =
                                selected.size > 0
                                  ? Array.from(selected)
                                  : (["cat"] as ZooSpecies[]);
                              onCatTopiaSettingsChange?.({
                                enabledSpecies: next,
                              });
                            }}
                          />
                          <span className="truncate">{label}</span>
                        </label>
                      );
                    })}
                  </div>
                </label>

                <label className="block">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-400/80">
                      Animal Variety
                    </span>
                    <button
                      type="button"
                      onClick={() => setCatTopiaHelpField("catVariety")}
                      title="What does this setting do?"
                      className="flex h-4 w-4 items-center justify-center rounded-full border border-amber-700/60 bg-[#1f170f] text-[10px] font-bold leading-none text-amber-300/90 transition-colors hover:border-amber-500/80 hover:text-amber-200"
                    >
                      i
                    </button>
                  </div>
                  <select
                    value={resolvedCatTopiaSettings.catVariety}
                    onChange={(event) =>
                      onCatTopiaSettingsChange?.({
                        catVariety: event.target.value as CatTopiaSettings["catVariety"],
                      })
                    }
                    className="w-full rounded-md border border-amber-800/30 bg-[#120e08] px-2 py-2 text-[11px] text-amber-100 outline-none transition-colors focus:border-amber-500/45"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </label>

                <label className="block">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-400/80">
                      Animal Activity Levels
                    </span>
                    <button
                      type="button"
                      onClick={() => setCatTopiaHelpField("catActivityLevel")}
                      title="What does this setting do?"
                      className="flex h-4 w-4 items-center justify-center rounded-full border border-amber-700/60 bg-[#1f170f] text-[10px] font-bold leading-none text-amber-300/90 transition-colors hover:border-amber-500/80 hover:text-amber-200"
                    >
                      i
                    </button>
                  </div>
                  <select
                    value={resolvedCatTopiaSettings.catActivityLevel}
                    onChange={(event) =>
                      onCatTopiaSettingsChange?.({
                        catActivityLevel: event.target.value as CatTopiaSettings["catActivityLevel"],
                      })
                    }
                    className="w-full rounded-md border border-amber-800/30 bg-[#120e08] px-2 py-2 text-[11px] text-amber-100 outline-none transition-colors focus:border-amber-500/45"
                  >
                    <option value="low">Low (75%)</option>
                    <option value="medium">Medium (100%)</option>
                    <option value="high">High (150%)</option>
                  </select>
                </label>

                <label className="block">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-400/80">
                      New Animals Spawn / Hour
                    </span>
                    <button
                      type="button"
                      onClick={() => setCatTopiaHelpField("catSpawnRatePerHour")}
                      title="What does this setting do?"
                      className="flex h-4 w-4 items-center justify-center rounded-full border border-amber-700/60 bg-[#1f170f] text-[10px] font-bold leading-none text-amber-300/90 transition-colors hover:border-amber-500/80 hover:text-amber-200"
                    >
                      i
                    </button>
                  </div>
                  <input
                    type="number"
                    min={CAT_TOPIA_MIN_SPAWN_RATE_PER_HOUR}
                    max={CAT_TOPIA_MAX_SPAWN_RATE_PER_HOUR}
                    step={1}
                    value={resolvedCatTopiaSettings.catSpawnRatePerHour}
                    onChange={(event) =>
                      onCatTopiaSettingsChange?.({
                        catSpawnRatePerHour: Number(
                          event.target.value,
                        ),
                      })
                    }
                    className="w-full rounded-md border border-amber-800/30 bg-[#120e08] px-2 py-2 text-[11px] text-amber-100 outline-none transition-colors focus:border-amber-500/45"
                  />
                  <div className="mt-1 text-[10px] text-amber-500/65">
                    Allowed range: {CAT_TOPIA_MIN_SPAWN_RATE_PER_HOUR} to{" "}
                    {CAT_TOPIA_MAX_SPAWN_RATE_PER_HOUR}. Set 0 to pause spawning.
                  </div>
                </label>

                <label className="block">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-400/80">
                      Session Animal Cap
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setCatTopiaHelpField("maxSpawnedCatsPerSession")
                      }
                      title="What does this setting do?"
                      className="flex h-4 w-4 items-center justify-center rounded-full border border-amber-700/60 bg-[#1f170f] text-[10px] font-bold leading-none text-amber-300/90 transition-colors hover:border-amber-500/80 hover:text-amber-200"
                    >
                      i
                    </button>
                  </div>
                  <input
                    type="number"
                    min={CAT_TOPIA_MIN_SESSION_CAT_CAP}
                    max={CAT_TOPIA_MAX_SESSION_CAT_CAP}
                    step={1}
                    value={resolvedCatTopiaSettings.maxSpawnedCatsPerSession}
                    onChange={(event) =>
                      onCatTopiaSettingsChange?.({
                        maxSpawnedCatsPerSession: Number(event.target.value),
                      })
                    }
                    className="w-full rounded-md border border-amber-800/30 bg-[#120e08] px-2 py-2 text-[11px] text-amber-100 outline-none transition-colors focus:border-amber-500/45"
                  />
                  <div className="mt-1 text-[10px] text-amber-500/65">
                    Allowed range: {CAT_TOPIA_MIN_SESSION_CAT_CAP} to{" "}
                    {CAT_TOPIA_MAX_SESSION_CAT_CAP}.
                  </div>
                </label>

                <label className="block">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-400/80">
                      Animal Cuddle Level
                    </span>
                    <button
                      type="button"
                      onClick={() => setCatTopiaHelpField("catCuddleLevel")}
                      title="What does this setting do?"
                      className="flex h-4 w-4 items-center justify-center rounded-full border border-amber-700/60 bg-[#1f170f] text-[10px] font-bold leading-none text-amber-300/90 transition-colors hover:border-amber-500/80 hover:text-amber-200"
                    >
                      i
                    </button>
                  </div>
                  <select
                    value={resolvedCatTopiaSettings.catCuddleLevel}
                    onChange={(event) =>
                      onCatTopiaSettingsChange?.({
                        catCuddleLevel: event.target.value as CatTopiaSettings["catCuddleLevel"],
                      })
                    }
                    className="w-full rounded-md border border-amber-800/30 bg-[#120e08] px-2 py-2 text-[11px] text-amber-100 outline-none transition-colors focus:border-amber-500/45"
                  >
                    <option value="cuddle_city">CuddleCity</option>
                    <option value="express_lane">Express Lane</option>
                    <option value="anxious">Anxious</option>
                    <option value="normal">Normal</option>
                  </select>
                </label>

                <label className="block">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-400/80">
                      Animal Naming Convention
                    </span>
                    <button
                      type="button"
                      onClick={() => setCatTopiaHelpField("catNamingConvention")}
                      title="What does this setting do?"
                      className="flex h-4 w-4 items-center justify-center rounded-full border border-amber-700/60 bg-[#1f170f] text-[10px] font-bold leading-none text-amber-300/90 transition-colors hover:border-amber-500/80 hover:text-amber-200"
                    >
                      i
                    </button>
                  </div>
                  <input
                    type="text"
                    maxLength={CAT_TOPIA_NAMING_CONVENTION_MAX_CHARS}
                    value={resolvedCatTopiaSettings.catNamingConvention}
                    list="cat-topia-naming-presets"
                    onChange={(event) =>
                      onCatTopiaSettingsChange?.({
                        catNamingConvention: event.target.value,
                      })
                    }
                    className="w-full rounded-md border border-amber-800/30 bg-[#120e08] px-2 py-2 text-[11px] text-amber-100 outline-none transition-colors focus:border-amber-500/45"
                  />
                  <datalist id="cat-topia-naming-presets">
                    {CAT_TOPIA_NAMING_PRESETS.map((preset) => (
                      <option key={preset} value={preset} />
                    ))}
                  </datalist>
                  <div className="mt-1 text-[10px] text-amber-500/65">
                    Try: funny, silly, hilarious, wild, peace and love, punk rock.
                  </div>
                </label>
              </div>
            </div>
          )}
        </div>
      )}

      {!immersiveOverlayActive && editMode && catTopiaHelpField ? (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/55 p-4">
          <div className="w-full max-w-md overflow-hidden rounded-xl border border-amber-700/35 bg-[#120d08] shadow-2xl">
            <div className="flex items-start justify-between border-b border-amber-800/30 px-4 py-3">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-500/80">
                  Zoo-Topia Help
                </div>
                <div className="mt-1 text-sm font-semibold text-amber-100">
                  {CAT_TOPIA_HELP_COPY[catTopiaHelpField].title}
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-amber-200/80">
                  {CAT_TOPIA_HELP_COPY[catTopiaHelpField].summary}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCatTopiaHelpField(null)}
                className="flex h-7 w-7 items-center justify-center rounded-md border border-amber-800/30 bg-[#1d140d] text-amber-300/80 transition-colors hover:border-amber-500/45 hover:text-amber-100"
                aria-label="Close Zoo-Topia help"
              >
                <X size={12} />
              </button>
            </div>
            <div className="space-y-3 px-4 py-3">
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-500/75">
                What This Means
              </div>
              <ul className="space-y-2 pl-4 text-[11px] leading-relaxed text-amber-100/90">
                {CAT_TOPIA_HELP_COPY[catTopiaHelpField].meanings.map((line) => (
                  <li key={line} className="list-disc marker:text-amber-500/70">
                    {line}
                  </li>
                ))}
              </ul>
              {CAT_TOPIA_HELP_COPY[catTopiaHelpField].note ? (
                <div className="rounded-md border border-amber-800/35 bg-[#1a130d] px-3 py-2 text-[11px] leading-relaxed text-amber-200/85">
                  {CAT_TOPIA_HELP_COPY[catTopiaHelpField].note}
                </div>
              ) : null}
            </div>
            <div className="border-t border-amber-800/25 px-4 py-3">
              <button
                type="button"
                onClick={() => setCatTopiaHelpField(null)}
                className="w-full rounded-md border border-amber-700/45 bg-amber-500/15 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-amber-200 transition-colors hover:bg-amber-500/25"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Toolbar — top right. */}
      {!immersiveOverlayActive ? (
        <div className="absolute top-3 right-3 flex items-center gap-2 z-20">
          {/* New Idea 7: Heatmap toggle. */}
          <button
            onClick={() => setHeatmapMode((p) => !p)}
            title="Toggle heatmap"
            className={`w-7 h-7 flex items-center justify-center rounded-md transition-all backdrop-blur-sm border ${heatmapMode ? "bg-amber-500/30 text-amber-300 border-amber-500/50" : "bg-[#1c1610]/80 text-amber-500/40 border-amber-900/20 hover:text-amber-400"}`}
          >
            <MapIcon size={12} />
          </button>
          <button
            onClick={() => setTrailMode((p) => !p)}
            title="Toggle trails"
            className={`w-7 h-7 flex items-center justify-center rounded-md transition-all backdrop-blur-sm border ${trailMode ? "bg-amber-500/30 text-amber-300 border-amber-500/50" : "bg-[#1c1610]/80 text-amber-500/40 border-amber-900/20 hover:text-amber-400"}`}
          >
            <Maximize size={12} />
          </button>
          {/* Edit office toggle. */}
          <button
            onClick={toggleEdit}
            title={editMode ? "Done editing" : "Edit office"}
            className={`w-7 h-7 flex items-center justify-center rounded-md transition-all backdrop-blur-sm border ${editMode ? "bg-amber-500/30 text-amber-300 border-amber-500/50" : "bg-[#1c1610]/80 text-amber-500/40 border-amber-900/20 hover:text-amber-400"}`}
          >
            {editMode ? (
              <Check size={12} strokeWidth={2.5} />
            ) : (
              <Pencil size={12} strokeWidth={2} />
            )}
          </button>
          <button
            onClick={() => setSettingsModalOpen(true)}
            title="Voice reply settings"
            className={`w-7 h-7 flex items-center justify-center rounded-md transition-all backdrop-blur-sm border ${settingsModalOpen ? "bg-amber-500/30 text-amber-300 border-amber-500/50" : "bg-[#1c1610]/80 text-amber-500/40 border-amber-900/20 hover:text-amber-400"}`}
          >
            <Settings2 size={12} />
          </button>
          {editMode && (
            <>
              {drag.kind === "placing" && (
                <span className="text-[10px] text-amber-400/70">
                  {drag.itemType === "wall"
                    ? wallDrawStart
                      ? "Click the end point to finish the wall."
                      : "Click a start point, then click again to finish the wall."
                    : "Click floor to place. Esc cancels."}
                </span>
              )}
              <button
                onClick={handleReset}
                className="px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider bg-[#2a1e14]/90 text-amber-400/60 border border-amber-800/20 hover:bg-[#3a2a1a] backdrop-blur-sm"
              >
                Reset
              </button>
              {selectedUid && (
                <button
                  onClick={handleDelete}
                  className="px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider bg-red-900/40 text-red-400 border border-red-800/30 hover:bg-red-900/60 backdrop-blur-sm"
                >
                  Delete
                </button>
              )}
              <button
                onClick={() => setDrawerOpen((p) => !p)}
                className="px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider bg-[#2a1e14]/90 text-amber-400 border border-amber-800/30 hover:bg-[#3a2a1a] backdrop-blur-sm"
              >
                {drawerOpen ? "Hide Objects" : "Show Objects"}
              </button>
            </>
          )}
        </div>
      ) : null}
      {settingsModalOpen ? (
        <div className="absolute inset-0 z-30 flex items-start justify-end bg-black/35 p-4 backdrop-blur-[1px]">
          <div className="w-full max-w-sm overflow-hidden rounded-xl border border-cyan-500/20 bg-[#05090d]/95 shadow-2xl">
            <div className="flex items-start justify-between border-b border-cyan-500/10 px-4 py-3">
              <div>
                <div className="font-mono text-[10px] font-semibold tracking-[0.28em] text-cyan-300/75">
                  VOICE SETTINGS
                </div>
                <div className="mt-1 text-[11px] text-white/45">
                  Control natural-sounding spoken replies for agents across the
                  app.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSettingsModalOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-md border border-cyan-500/10 bg-black/20 text-cyan-100/70 transition-colors hover:border-cyan-400/30 hover:text-cyan-100"
                aria-label="Close voice settings"
              >
                <X size={12} />
              </button>
            </div>
            <SettingsPanel
              gatewayStatus={gatewayStatus}
              gatewayUrl={atmAnalytics?.gatewayUrl}
              onGatewayDisconnect={() => {
                onGatewayDisconnect?.();
                setSettingsModalOpen(false);
              }}
              officeTitle={officeTitle}
              officeTitleLoaded={officeTitleLoaded}
              onOfficeTitleChange={(title) => onOfficeTitleChange?.(title)}
              voiceRepliesEnabled={voiceRepliesEnabled}
              voiceRepliesVoiceId={voiceRepliesVoiceId}
              voiceRepliesSpeed={voiceRepliesSpeed}
              voiceRepliesLoaded={voiceRepliesLoaded}
              onVoiceRepliesToggle={(enabled) =>
                onVoiceRepliesToggle?.(enabled)
              }
              onVoiceRepliesVoiceChange={(voiceId) =>
                onVoiceRepliesVoiceChange?.(voiceId)
              }
              onVoiceRepliesSpeedChange={(speed) =>
                onVoiceRepliesSpeedChange?.(speed)
              }
              onVoiceRepliesPreview={(voiceId, voiceName) =>
                onVoiceRepliesPreview?.(voiceId, voiceName)
              }
            />
          </div>
        </div>
      ) : null}

      {/* Ideas 3 + 6 + 8: Mini status bar — bottom left. */}
      <div className="absolute bottom-3 left-3 flex flex-col items-start gap-1.5 z-10 pointer-events-none select-none">
        {/* Idea 3: Activity feed entries — newest on bottom. */}
        {statusFeedEvents
          .slice(0, 4)
          .reverse()
          .map((ev) => (
            <div
              key={`${ev.id}-${ev.ts}`}
              className="flex max-w-[28rem] items-center gap-2 rounded-full bg-black/60 px-3 py-1 text-[10px] font-mono backdrop-blur-sm"
            >
              <span className="text-amber-400/80 font-semibold">{ev.name}</span>
              <span className="truncate text-amber-600/70">
                {clampOverlayText(ev.text, STATUS_FEED_TEXT_MAX_CHARS)}
              </span>
            </div>
          ))}
        {/* Ideas 6 + 8: Gateway status, agent counts, vibe score. */}
        <div className="flex items-center gap-3 bg-black/60 backdrop-blur-sm rounded-full px-3 py-1 text-[10px] font-mono">
          <span className="text-amber-500/60">
            {agents.filter((a) => a.status === "working").length} working
          </span>
          <span className="opacity-30">·</span>
          <span className="text-amber-500/60">
            {agents.filter((a) => a.status === "idle").length} idle
          </span>
          <span className="opacity-30">·</span>
          <span className="text-amber-500/60">
            {agents.filter((a) => a.status === "error").length} error
          </span>
          {/* New Idea 6: Vibe score with animated EQ bars. */}
          {(() => {
            const workingCount = agents.filter(
              (a) => a.status === "working",
            ).length;
            const ratio = workingCount / Math.max(agents.length, 1);
            const label =
              ratio < 0.2 ? "quiet" : ratio < 0.6 ? "active" : "buzzing";
            const animDur = ratio < 0.2 ? "1.8s" : ratio < 0.6 ? "1s" : "0.5s";
            return (
              <>
                <span className="opacity-30">·</span>
                <span
                  className="flex items-end gap-px h-3"
                  style={{ ["--eq-dur" as string]: animDur }}
                >
                  {[0.6, 1, 0.7].map((h, i) => (
                    <span
                      key={i}
                      className="w-[3px] bg-amber-500/60 rounded-sm"
                      style={{
                        height: `${h * 100}%`,
                        animation: `eq-bar ${animDur} ${i * 0.15}s infinite ease-in-out alternate`,
                      }}
                    />
                  ))}
                </span>
                <span className="text-amber-500/50">{label}</span>
              </>
            );
          })()}
          {!editMode && !spaceDown && (
            <>
              <span className="opacity-30">·</span>
              <span className="text-amber-400/40">
                drag · scroll · space+drag · dbl-click
              </span>
            </>
          )}
          {spaceDown && (
            <>
              <span className="opacity-30">·</span>
              <span className="text-amber-300/80">pan mode</span>
            </>
          )}
        </div>
      </div>
      <style>{`
        @keyframes eq-bar {
          from { transform: scaleY(0.3); }
          to   { transform: scaleY(1); }
        }
        @keyframes mood-float {
          0%   { transform: translateX(-50%) translateY(0px); opacity: 1; }
          100% { transform: translateX(-50%) translateY(-28px); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
