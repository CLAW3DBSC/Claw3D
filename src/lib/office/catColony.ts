import type {
  OfficeAgent,
  OfficeAnimalAppearance,
  OfficeCatAppearance,
} from "@/features/retro-office/core/types";
import type { CatTopiaVarietyLevel, ZooSpecies } from "@/lib/office/catTopia";
import { GARFIELD_COMPANION } from "@/lib/office/garfield";

export const ZOO_NAMES_MARKDOWN_PATH = "/data/zoo-names.md";
export const CAT_NAMES_MARKDOWN_PATH = ZOO_NAMES_MARKDOWN_PATH;
export const ANIMAL_AGENT_ID_PREFIX = "zootopia-animal";
export const CAT_AGENT_ID_PREFIX = ANIMAL_AGENT_ID_PREFIX;
export const CAT_COLONY_TEST_MODE = true;
export const CAT_MAX_NAME_CHARS = 20;

export type ZooNamePoolBySpecies = Record<ZooSpecies, string[]>;

export type ZooSpeciesMeta = {
  species: ZooSpecies;
  label: string;
  emoji: string;
  motionProfile: "shared" | "duck" | "monkey" | "snake";
  sounds: string[];
  baseCoatColors: string[];
  accentCoatColors: string[];
  eyeColors: string[];
  canPerch: boolean;
  canCuddle: boolean;
};

export type CatColonySpawnSettings = {
  minIntervalMs: number;
  maxIntervalMs: number;
  maxSpawnedCats: number;
  maxSpawnedCatsPerDay: number | null;
};

export const CAT_COLONY_TEST_SETTINGS: CatColonySpawnSettings = {
  minIntervalMs: 30_000,
  maxIntervalMs: 60_000,
  maxSpawnedCats: 11,
  maxSpawnedCatsPerDay: null,
};

export const CAT_COLONY_PRODUCTION_SETTINGS: CatColonySpawnSettings = {
  minIntervalMs: 30 * 60_000,
  maxIntervalMs: 60 * 60_000,
  maxSpawnedCats: 15,
  maxSpawnedCatsPerDay: 15,
};

const ZOO_SPECIES_ORDER: ZooSpecies[] = [
  "cat",
  "dog",
  "duck",
  "snake",
  "horse",
  "goat",
  "monkey",
  "parrot",
  "rabbit",
  "turtle",
  "fox",
  "owl",
  "penguin",
  "alpaca",
  "hedgehog",
  "frog",
  "raccoon",
];

const ZOO_SPECIES_META: Record<ZooSpecies, ZooSpeciesMeta> = {
  cat: {
    species: "cat",
    label: "Cat",
    emoji: "🐱",
    motionProfile: "shared",
    sounds: ["mew", "mrrow", "prrrrp"],
    baseCoatColors: ["#d0831f", "#2f2b2a", "#d8d4cd", "#8c6a4a", "#6c6f78", "#3a2418", "#efe8dd"],
    accentCoatColors: ["#f6c87b", "#b2b6be", "#f5efe7", "#5a3e29", "#1e1e1e", "#c9a27d", "#7f5635"],
    eyeColors: ["#5d3a1a", "#1d1d1d", "#7aa9ff", "#9cc6ff", "#4a2b12", "#23201f"],
    canPerch: true,
    canCuddle: true,
  },
  dog: {
    species: "dog",
    label: "Dog",
    emoji: "🐶",
    motionProfile: "shared",
    sounds: ["woof", "ruff", "arf"],
    baseCoatColors: ["#b08a5a", "#6a4a2d", "#d3c6ad", "#2f2a24"],
    accentCoatColors: ["#efe4d1", "#8d6b48", "#4c3a29"],
    eyeColors: ["#2a1f14", "#3b2b20"],
    canPerch: false,
    canCuddle: true,
  },
  duck: {
    species: "duck",
    label: "Duck",
    emoji: "🦆",
    motionProfile: "duck",
    sounds: ["quack", "quaa", "quack-quack"],
    baseCoatColors: ["#e8d37c", "#f1e8b2", "#7aa15a"],
    accentCoatColors: ["#f59e0b", "#1f2937", "#d9f99d"],
    eyeColors: ["#1f2937", "#111827"],
    canPerch: false,
    canCuddle: true,
  },
  snake: {
    species: "snake",
    label: "Snake",
    emoji: "🐍",
    motionProfile: "snake",
    sounds: ["hiss", "ssss", "snik"],
    baseCoatColors: ["#5a8f3f", "#6b8e23", "#3f5f2f", "#8a6f3f"],
    accentCoatColors: ["#c3d48b", "#2f4f2f", "#d9c18f"],
    eyeColors: ["#facc15", "#111827"],
    canPerch: true,
    canCuddle: false,
  },
  horse: {
    species: "horse",
    label: "Horse",
    emoji: "🐴",
    motionProfile: "shared",
    sounds: ["neigh", "snort", "hrrr"],
    baseCoatColors: ["#8b5a2b", "#5f3f26", "#d1b38a", "#2f2a2a"],
    accentCoatColors: ["#f5f5f4", "#3f2d1f", "#a16207"],
    eyeColors: ["#2a1f14", "#111827"],
    canPerch: false,
    canCuddle: true,
  },
  goat: {
    species: "goat",
    label: "Goat",
    emoji: "🐐",
    motionProfile: "shared",
    sounds: ["maa", "bleat", "meh"],
    baseCoatColors: ["#ddd6c9", "#9a8f7d", "#5f5547"],
    accentCoatColors: ["#f5f5f4", "#7c6f64", "#3f3a35"],
    eyeColors: ["#facc15", "#1f2937"],
    canPerch: false,
    canCuddle: true,
  },
  monkey: {
    species: "monkey",
    label: "Monkey",
    emoji: "🐵",
    motionProfile: "monkey",
    sounds: ["ook", "eee", "ooh-ooh"],
    baseCoatColors: ["#8b5e34", "#5c3d24", "#b08968"],
    accentCoatColors: ["#f2d4b7", "#6b4423", "#3f2a1a"],
    eyeColors: ["#1f2937", "#2a1f14"],
    canPerch: true,
    canCuddle: true,
  },
  parrot: {
    species: "parrot",
    label: "Parrot",
    emoji: "🦜",
    motionProfile: "shared",
    sounds: ["squawk", "chirp", "kree"],
    baseCoatColors: ["#22c55e", "#ef4444", "#eab308", "#3b82f6"],
    accentCoatColors: ["#facc15", "#10b981", "#f97316"],
    eyeColors: ["#111827", "#1f2937"],
    canPerch: true,
    canCuddle: false,
  },
  rabbit: {
    species: "rabbit",
    label: "Rabbit",
    emoji: "🐰",
    motionProfile: "shared",
    sounds: ["sniff", "hmph", "bnnuy"],
    baseCoatColors: ["#f5efe6", "#bfb3a5", "#8b7f74"],
    accentCoatColors: ["#fbcfe8", "#e5ded3", "#6b5d52"],
    eyeColors: ["#111827", "#5b21b6"],
    canPerch: false,
    canCuddle: true,
  },
  turtle: {
    species: "turtle",
    label: "Turtle",
    emoji: "🐢",
    motionProfile: "shared",
    sounds: ["...", "hup", "glup"],
    baseCoatColors: ["#4d7c0f", "#365314", "#7c8f3a"],
    accentCoatColors: ["#a3e635", "#3f6212", "#d4d4aa"],
    eyeColors: ["#111827", "#1f2937"],
    canPerch: true,
    canCuddle: false,
  },
  fox: {
    species: "fox",
    label: "Fox",
    emoji: "🦊",
    motionProfile: "shared",
    sounds: ["ring-ding", "yip", "rawr"],
    baseCoatColors: ["#ea580c", "#c2410c", "#7c2d12"],
    accentCoatColors: ["#fff7ed", "#fed7aa", "#3f3f46"],
    eyeColors: ["#1f2937", "#111827"],
    canPerch: true,
    canCuddle: true,
  },
  owl: {
    species: "owl",
    label: "Owl",
    emoji: "🦉",
    motionProfile: "shared",
    sounds: ["hoo", "huh-woo", "tu-whit"],
    baseCoatColors: ["#6b4f3a", "#8b6b4f", "#a1887f"],
    accentCoatColors: ["#f5f5f4", "#d6c7b5", "#3f2d1f"],
    eyeColors: ["#facc15", "#f59e0b"],
    canPerch: true,
    canCuddle: false,
  },
  penguin: {
    species: "penguin",
    label: "Penguin",
    emoji: "🐧",
    motionProfile: "shared",
    sounds: ["honk", "peep", "brk"],
    baseCoatColors: ["#111827", "#1f2937", "#334155"],
    accentCoatColors: ["#f8fafc", "#e2e8f0", "#f59e0b"],
    eyeColors: ["#111827", "#0f172a"],
    canPerch: false,
    canCuddle: true,
  },
  alpaca: {
    species: "alpaca",
    label: "Alpaca",
    emoji: "🦙",
    motionProfile: "shared",
    sounds: ["hmm", "prrt", "blep"],
    baseCoatColors: ["#d6b089", "#a8825b", "#f5e6cc"],
    accentCoatColors: ["#f8fafc", "#7c5a3f", "#e2d3bf"],
    eyeColors: ["#2a1f14", "#111827"],
    canPerch: false,
    canCuddle: true,
  },
  hedgehog: {
    species: "hedgehog",
    label: "Hedgehog",
    emoji: "🦔",
    motionProfile: "shared",
    sounds: ["snuffle", "snk", "pff"],
    baseCoatColors: ["#7c5a3f", "#5b4636", "#b08968"],
    accentCoatColors: ["#f5efe6", "#8b6b4f", "#3f2d1f"],
    eyeColors: ["#111827", "#1f2937"],
    canPerch: false,
    canCuddle: true,
  },
  frog: {
    species: "frog",
    label: "Frog",
    emoji: "🐸",
    motionProfile: "shared",
    sounds: ["ribbit", "brrip", "croak"],
    baseCoatColors: ["#22c55e", "#16a34a", "#65a30d"],
    accentCoatColors: ["#86efac", "#facc15", "#14532d"],
    eyeColors: ["#111827", "#facc15"],
    canPerch: true,
    canCuddle: true,
  },
  raccoon: {
    species: "raccoon",
    label: "Raccoon",
    emoji: "🦝",
    motionProfile: "shared",
    sounds: ["chitter", "rrr", "snk"],
    baseCoatColors: ["#6b7280", "#4b5563", "#9ca3af"],
    accentCoatColors: ["#f3f4f6", "#1f2937", "#d1d5db"],
    eyeColors: ["#111827", "#1f2937"],
    canPerch: true,
    canCuddle: true,
  },
};

const CAT_PATTERNS: OfficeAnimalAppearance["pattern"][] = [
  "solid",
  "patchy",
  "spotted",
  "tabby",
];

const CAT_FUR_LENGTHS: OfficeAnimalAppearance["furLength"][] = ["short", "long"];

const FALLBACK_ZOO_NAMES: ZooNamePoolBySpecies = {
  cat: ["Chairman Meow", "Whisker Biscuit", "Mittens McGee", "Sunny Bean"],
  dog: ["Sir Borks", "Captain Wiggle", "Noodle Nose", "Biscuit Rocket"],
  duck: ["Quackers", "Puddle Duke", "Waddle Prime", "Bill Nye"],
  snake: ["Slink", "Nope Rope", "Hiss Hemsworth", "Ribbon Fang"],
  horse: ["Clip Clop", "Hay Girl", "Stallionaire", "Thunder Hoof"],
  goat: ["Bleatles", "Goaty Gaga", "Nibble Knight", "Cliffhopper"],
  monkey: ["Banana Bandit", "Captain Oook", "Mischief Mike", "Coco Chaos"],
  parrot: ["Captain Squawk", "Polly Glitch", "RGB Beak", "Echo Pirate"],
  rabbit: ["Hop Solo", "Bun Diesel", "Velvet Ears", "Carrot Dash"],
  turtle: ["Slowpoke", "Shellby", "Turbo Turt", "Pebble Tank"],
  fox: ["Foxy Brown", "Rusty Zoom", "Sneak Peak", "Velvet Tail"],
  owl: ["Night Shift", "Hootie", "Library Boss", "Moon Specs"],
  penguin: ["Slidey", "Tux Byte", "Ice Bean", "Wobble Dot"],
  alpaca: ["Fluff Unit", "Drama Llama", "Cloud Sock", "Wooliam"],
  hedgehog: ["Needles", "Spike Lee", "Pocket Cactus", "Snuffle Tank"],
  frog: ["Ribbit Ross", "Lily Pad", "Croaklyn", "Spring Bean"],
  raccoon: ["Trash Panda", "Midnight Mitts", "Bandit Byte", "Snack Heist"],
};

const randomInRangeInclusive = (min: number, max: number): number => {
  const low = Math.min(min, max);
  const high = Math.max(min, max);
  return low + Math.floor(Math.random() * (high - low + 1));
};

const pickRandom = <T>(items: readonly T[], fallback: T): T => {
  if (!Array.isArray(items) || items.length === 0) return fallback;
  return items[Math.floor(Math.random() * items.length)] ?? fallback;
};

const normalizeAnimalName = (value: string): string => {
  const normalized = value.replace(/\s+/g, " ").trim();
  const stripped = normalized.replace(/^["'`]+|["'`]+$/g, "");
  if (stripped.length <= CAT_MAX_NAME_CHARS) return stripped;
  const clipped = stripped.slice(0, CAT_MAX_NAME_CHARS - 3).trimEnd();
  return `${clipped}...`;
};

const isLikelyAnimalName = (value: string): boolean => {
  if (!value) return false;
  if (value.length < 2 || value.length > 42) return false;
  if (!/[a-z]/i.test(value)) return false;
  if (/^#+\s*/.test(value)) return false;
  if (/^name$/i.test(value)) return false;
  if (/^\|/.test(value)) return false;
  return true;
};

const normalizeSpeciesHeading = (raw: string): ZooSpecies | null => {
  const normalized = raw.trim().toLowerCase().replace(/\s+/g, "_");
  const aliasMap: Record<string, ZooSpecies> = {
    cats: "cat",
    dogs: "dog",
    ducks: "duck",
    snakes: "snake",
    horses: "horse",
    goats: "goat",
    monkeys: "monkey",
    parrots: "parrot",
    rabbits: "rabbit",
    turtles: "turtle",
    foxes: "fox",
    owls: "owl",
    penguins: "penguin",
    alpacas: "alpaca",
    hedgehogs: "hedgehog",
    frogs: "frog",
    raccoons: "raccoon",
  };
  const resolved = aliasMap[normalized] ?? normalized;
  if (ZOO_SPECIES_ORDER.includes(resolved as ZooSpecies)) {
    return resolved as ZooSpecies;
  }
  return null;
};

export const getZooSpeciesMeta = (species: ZooSpecies): ZooSpeciesMeta =>
  ZOO_SPECIES_META[species] ?? ZOO_SPECIES_META.cat;

export const getZooSpeciesList = (): ZooSpecies[] => [...ZOO_SPECIES_ORDER];

export const getCatColonySpawnSettings = (
  testMode = CAT_COLONY_TEST_MODE,
): CatColonySpawnSettings =>
  testMode ? CAT_COLONY_TEST_SETTINGS : CAT_COLONY_PRODUCTION_SETTINGS;

export const randomCatSpawnIntervalMs = (
  settings = getCatColonySpawnSettings(),
): number => randomInRangeInclusive(settings.minIntervalMs, settings.maxIntervalMs);

export const randomCatActivityMultiplier = (): number => {
  const raw = 0.5 + Math.random();
  return Math.round(raw * 100) / 100;
};

export const randomAnimalAppearance = (
  species: ZooSpecies,
): OfficeAnimalAppearance => {
  const meta = getZooSpeciesMeta(species);
  const base = pickRandom(meta.baseCoatColors, meta.baseCoatColors[0] ?? "#d0831f");
  let accent = pickRandom(meta.accentCoatColors, meta.accentCoatColors[0] ?? "#f6c87b");
  if (accent.toLowerCase() === base.toLowerCase()) {
    accent = pickRandom(meta.accentCoatColors.slice(1), accent);
  }
  return {
    baseCoatColor: base,
    accentCoatColor: accent,
    eyeColor: pickRandom(meta.eyeColors, "#1f2937"),
    pattern: pickRandom(CAT_PATTERNS, "solid"),
    furLength: pickRandom(CAT_FUR_LENGTHS, "short"),
  };
};

export const randomCatAppearance = (): OfficeCatAppearance =>
  randomAnimalAppearance("cat");

export const resolveSpawnAnimalAppearance = (
  variety: CatTopiaVarietyLevel,
  species: ZooSpecies,
  mainAppearance: OfficeAnimalAppearance | undefined,
): OfficeAnimalAppearance => {
  if (variety === "low" && mainAppearance) {
    return { ...mainAppearance };
  }
  const generated = randomAnimalAppearance(species);
  if (variety === "high") {
    const extra = randomAnimalAppearance(species);
    return {
      ...generated,
      pattern:
        generated.pattern === "solid" && Math.random() < 0.7
          ? extra.pattern
          : generated.pattern,
      eyeColor: Math.random() < 0.5 ? extra.eyeColor : generated.eyeColor,
    };
  }
  return generated;
};

export const buildGarfieldCompanionAgent = (): OfficeAgent => ({
  id: GARFIELD_COMPANION.agentId,
  name: GARFIELD_COMPANION.name,
  status: "idle",
  color: GARFIELD_COMPANION.color,
  item: GARFIELD_COMPANION.item,
  avatarKind: "cat",
  animalSpecies: "cat",
  activityMultiplier: 1,
  catAppearance: {
    baseCoatColor: "#d0831f",
    accentCoatColor: "#f6c87b",
    eyeColor: "#4a2b12",
    pattern: "tabby",
    furLength: "short",
  },
  animalAppearance: {
    baseCoatColor: "#d0831f",
    accentCoatColor: "#f6c87b",
    eyeColor: "#4a2b12",
    pattern: "tabby",
    furLength: "short",
  },
});

export const buildCompanionAnimalAgent = (params: {
  id: string;
  name: string;
  species: ZooSpecies;
  appearance?: OfficeAnimalAppearance;
  activityMultiplier?: number;
}): OfficeAgent => {
  const appearance = params.appearance ?? randomAnimalAppearance(params.species);
  const avatarKind = params.species === "cat" ? "cat" : "animal";
  return {
    id: params.id,
    name: params.name,
    status: "idle",
    color: appearance.baseCoatColor,
    item: GARFIELD_COMPANION.item,
    avatarKind,
    animalSpecies: params.species,
    activityMultiplier: params.activityMultiplier ?? randomCatActivityMultiplier(),
    animalAppearance: appearance,
    catAppearance: params.species === "cat" ? appearance : undefined,
  };
};

export const buildCompanionCatAgent = (params: {
  id: string;
  name: string;
  appearance?: OfficeCatAppearance;
  activityMultiplier?: number;
}): OfficeAgent =>
  buildCompanionAnimalAgent({
    ...params,
    species: "cat",
    appearance: params.appearance,
  });

export const parseZooNamesMarkdown = (markdown: string): ZooNamePoolBySpecies => {
  const next: ZooNamePoolBySpecies = {
    cat: [],
    dog: [],
    duck: [],
    snake: [],
    horse: [],
    goat: [],
    monkey: [],
    parrot: [],
    rabbit: [],
    turtle: [],
    fox: [],
    owl: [],
    penguin: [],
    alpaca: [],
    hedgehog: [],
    frog: [],
    raccoon: [],
  };
  if (!markdown.trim()) {
    return getFallbackZooNames();
  }
  let currentSpecies: ZooSpecies | null = null;
  const seenBySpecies = new Map<ZooSpecies, Set<string>>();
  const lines = markdown.split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    const headingMatch = line.match(/^##\s+(.+)$/);
    if (headingMatch) {
      currentSpecies = normalizeSpeciesHeading(headingMatch[1] ?? "");
      continue;
    }
    if (!currentSpecies) continue;
    const bulletMatch = line.match(/^(?:[-*+]|\d+\.)\s+(.+)$/);
    if (!bulletMatch) continue;
    const normalized = normalizeAnimalName(bulletMatch[1] ?? "");
    if (!isLikelyAnimalName(normalized)) continue;
    const seen = seenBySpecies.get(currentSpecies) ?? new Set<string>();
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    seenBySpecies.set(currentSpecies, seen);
    next[currentSpecies].push(normalized);
  }

  for (const species of ZOO_SPECIES_ORDER) {
    if (next[species].length === 0) {
      next[species] = [...(FALLBACK_ZOO_NAMES[species] ?? FALLBACK_ZOO_NAMES.cat)];
    }
  }

  return next;
};

export const parseCatNamesMarkdown = (markdown: string): string[] =>
  parseZooNamesMarkdown(markdown).cat;

export const pickRandomZooName = (
  species: ZooSpecies,
  namePool: ZooNamePoolBySpecies,
  usedNames: Set<string>,
): string => {
  const pool = namePool[species] ?? FALLBACK_ZOO_NAMES[species] ?? FALLBACK_ZOO_NAMES.cat;
  const normalizedPool = pool.map((value) => normalizeAnimalName(value)).filter(Boolean);
  const available = normalizedPool.filter(
    (candidate) => !usedNames.has(candidate.toLowerCase()),
  );
  const source = available.length > 0 ? available : normalizedPool;
  const fallbackPool = FALLBACK_ZOO_NAMES[species] ?? FALLBACK_ZOO_NAMES.cat;
  const fallback =
    fallbackPool[randomInRangeInclusive(0, Math.max(0, fallbackPool.length - 1))] ??
    "Zoo Buddy";
  const selected = pickRandom(source, fallback);
  const selectedKey = selected.toLowerCase();
  if (!usedNames.has(selectedKey)) {
    usedNames.add(selectedKey);
    return selected;
  }
  let suffix = 2;
  while (suffix < 10_000) {
    const suffixText = ` ${suffix}`;
    const maxBaseLength = Math.max(1, CAT_MAX_NAME_CHARS - suffixText.length);
    const base = selected.slice(0, maxBaseLength).trimEnd();
    const candidate = `${base}${suffixText}`;
    const key = candidate.toLowerCase();
    if (!usedNames.has(key)) {
      usedNames.add(key);
      return candidate;
    }
    suffix += 1;
  }
  const generated = `${selected}-${Date.now()}`;
  usedNames.add(generated.toLowerCase());
  return generated;
};

export const pickRandomCatName = (
  names: readonly string[],
  usedNames: Set<string>,
): string => {
  const fallbackPool = names.length > 0 ? names : FALLBACK_ZOO_NAMES.cat;
  return pickRandomZooName(
    "cat",
    {
      cat: [...fallbackPool],
      dog: [...FALLBACK_ZOO_NAMES.dog],
      duck: [...FALLBACK_ZOO_NAMES.duck],
      snake: [...FALLBACK_ZOO_NAMES.snake],
      horse: [...FALLBACK_ZOO_NAMES.horse],
      goat: [...FALLBACK_ZOO_NAMES.goat],
      monkey: [...FALLBACK_ZOO_NAMES.monkey],
      parrot: [...FALLBACK_ZOO_NAMES.parrot],
      rabbit: [...FALLBACK_ZOO_NAMES.rabbit],
      turtle: [...FALLBACK_ZOO_NAMES.turtle],
      fox: [...FALLBACK_ZOO_NAMES.fox],
      owl: [...FALLBACK_ZOO_NAMES.owl],
      penguin: [...FALLBACK_ZOO_NAMES.penguin],
      alpaca: [...FALLBACK_ZOO_NAMES.alpaca],
      hedgehog: [...FALLBACK_ZOO_NAMES.hedgehog],
      frog: [...FALLBACK_ZOO_NAMES.frog],
      raccoon: [...FALLBACK_ZOO_NAMES.raccoon],
    },
    usedNames,
  );
};

export const pickRandomEnabledZooSpecies = (
  enabledSpecies: readonly ZooSpecies[],
): ZooSpecies => {
  const source: readonly ZooSpecies[] =
    enabledSpecies.length > 0 ? enabledSpecies : ["cat"];
  return pickRandom(source, "cat");
};

export const getFallbackFunnyCatNames = (): string[] => [
  ...FALLBACK_ZOO_NAMES.cat,
];

export const getFallbackZooNames = (): ZooNamePoolBySpecies => ({
  cat: [...FALLBACK_ZOO_NAMES.cat],
  dog: [...FALLBACK_ZOO_NAMES.dog],
  duck: [...FALLBACK_ZOO_NAMES.duck],
  snake: [...FALLBACK_ZOO_NAMES.snake],
  horse: [...FALLBACK_ZOO_NAMES.horse],
  goat: [...FALLBACK_ZOO_NAMES.goat],
  monkey: [...FALLBACK_ZOO_NAMES.monkey],
  parrot: [...FALLBACK_ZOO_NAMES.parrot],
  rabbit: [...FALLBACK_ZOO_NAMES.rabbit],
  turtle: [...FALLBACK_ZOO_NAMES.turtle],
  fox: [...FALLBACK_ZOO_NAMES.fox],
  owl: [...FALLBACK_ZOO_NAMES.owl],
  penguin: [...FALLBACK_ZOO_NAMES.penguin],
  alpaca: [...FALLBACK_ZOO_NAMES.alpaca],
  hedgehog: [...FALLBACK_ZOO_NAMES.hedgehog],
  frog: [...FALLBACK_ZOO_NAMES.frog],
  raccoon: [...FALLBACK_ZOO_NAMES.raccoon],
});
