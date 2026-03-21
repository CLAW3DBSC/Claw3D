export type ZooSpecies =
  | "cat"
  | "dog"
  | "duck"
  | "snake"
  | "horse"
  | "goat"
  | "monkey"
  | "parrot"
  | "rabbit"
  | "turtle"
  | "fox"
  | "owl"
  | "penguin"
  | "alpaca"
  | "hedgehog"
  | "frog"
  | "raccoon";

export const ZOO_SPECIES_OPTIONS = [
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
] as const satisfies readonly ZooSpecies[];

export const DEFAULT_ENABLED_ZOO_SPECIES: ZooSpecies[] = ["cat"];

export type CatTopiaVarietyLevel = "low" | "medium" | "high";
export type CatTopiaActivityLevel = "low" | "medium" | "high";
export type CatTopiaSpawnRatePerHour = number;
export type CatTopiaCuddleLevel =
  | "cuddle_city"
  | "express_lane"
  | "anxious"
  | "normal";

export type CatTopiaSettings = {
  mainCatName: string;
  catVariety: CatTopiaVarietyLevel;
  catActivityLevel: CatTopiaActivityLevel;
  catCuddleLevel: CatTopiaCuddleLevel;
  catNamingConvention: string;
  catSpawnRatePerHour: CatTopiaSpawnRatePerHour;
  maxSpawnedCatsPerSession: number;
  enabledSpecies: ZooSpecies[];
};

export type CatTopiaCuddleProfile = {
  interactionDistanceScale: number;
  catSpacingScale: number;
  humanSpacingScale: number;
  nudgeScale: number;
};

export const CAT_TOPIA_STORAGE_KEY = "openclaw-zoo-topia-settings-v1";
export const CAT_TOPIA_LEGACY_STORAGE_KEY = "openclaw-cat-topia-settings-v1";
export const CAT_TOPIA_MAIN_NAME_MAX_CHARS = 12;
export const CAT_TOPIA_NAMING_CONVENTION_MAX_CHARS = 20;
export const CAT_TOPIA_MIN_SESSION_CAT_CAP = 1;
export const CAT_TOPIA_MAX_SESSION_CAT_CAP = 1000;
export const CAT_TOPIA_MIN_SPAWN_RATE_PER_HOUR = 0;
export const CAT_TOPIA_MAX_SPAWN_RATE_PER_HOUR = 60;

export const CAT_TOPIA_NAMING_PRESETS = [
  "funny",
  "silly",
  "hilarious",
  "wild",
  "peace and love",
  "punk rock",
] as const;

export const CAT_TOPIA_DEFAULT_SETTINGS: CatTopiaSettings = {
  mainCatName: "Garfield",
  catVariety: "medium",
  catActivityLevel: "medium",
  catCuddleLevel: "normal",
  catNamingConvention: "funny",
  catSpawnRatePerHour: 6,
  maxSpawnedCatsPerSession: 11,
  enabledSpecies: [...DEFAULT_ENABLED_ZOO_SPECIES],
};

const clampString = (value: string, maxChars: number): string =>
  value.trim().slice(0, maxChars).trim();

const normalizeMainCatName = (value: unknown): string => {
  if (typeof value !== "string") return CAT_TOPIA_DEFAULT_SETTINGS.mainCatName;
  const normalized = clampString(value, CAT_TOPIA_MAIN_NAME_MAX_CHARS);
  return normalized || CAT_TOPIA_DEFAULT_SETTINGS.mainCatName;
};

const normalizeVariety = (value: unknown): CatTopiaVarietyLevel =>
  value === "low" || value === "medium" || value === "high"
    ? value
    : CAT_TOPIA_DEFAULT_SETTINGS.catVariety;

const normalizeActivityLevel = (value: unknown): CatTopiaActivityLevel =>
  value === "low" || value === "medium" || value === "high"
    ? value
    : CAT_TOPIA_DEFAULT_SETTINGS.catActivityLevel;

const normalizeSpawnRatePerHour = (value: unknown): CatTopiaSpawnRatePerHour => {
  const numeric =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value.trim())
        : Number.NaN;
  if (!Number.isFinite(numeric)) {
    return CAT_TOPIA_DEFAULT_SETTINGS.catSpawnRatePerHour;
  }
  const rounded = Math.round(numeric);
  return Math.max(
    CAT_TOPIA_MIN_SPAWN_RATE_PER_HOUR,
    Math.min(CAT_TOPIA_MAX_SPAWN_RATE_PER_HOUR, rounded),
  );
};

const normalizeCuddleLevel = (value: unknown): CatTopiaCuddleLevel =>
  value === "cuddle_city" ||
  value === "express_lane" ||
  value === "anxious" ||
  value === "normal"
    ? value
    : CAT_TOPIA_DEFAULT_SETTINGS.catCuddleLevel;

const normalizeNamingConvention = (value: unknown): string => {
  if (typeof value !== "string") {
    return CAT_TOPIA_DEFAULT_SETTINGS.catNamingConvention;
  }
  const normalized = clampString(value, CAT_TOPIA_NAMING_CONVENTION_MAX_CHARS);
  return normalized || CAT_TOPIA_DEFAULT_SETTINGS.catNamingConvention;
};

const normalizeSessionCatCap = (value: unknown): number => {
  const numeric =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value.trim())
        : Number.NaN;
  if (!Number.isFinite(numeric)) {
    return CAT_TOPIA_DEFAULT_SETTINGS.maxSpawnedCatsPerSession;
  }
  const rounded = Math.round(numeric);
  return Math.max(
    CAT_TOPIA_MIN_SESSION_CAT_CAP,
    Math.min(CAT_TOPIA_MAX_SESSION_CAT_CAP, rounded),
  );
};

const normalizeEnabledSpecies = (
  value: unknown,
  fallback: readonly ZooSpecies[] = DEFAULT_ENABLED_ZOO_SPECIES,
): ZooSpecies[] => {
  if (!Array.isArray(value)) return [...fallback];
  const parsed = value
    .map((entry) =>
      typeof entry === "string" ? entry.trim().toLowerCase() : "",
    )
    .filter((entry): entry is ZooSpecies =>
      (ZOO_SPECIES_OPTIONS as readonly string[]).includes(entry),
    );
  const unique = Array.from(new Set(parsed));
  return unique.length > 0 ? unique : [...fallback];
};

export const normalizeCatTopiaSettings = (
  value: Partial<CatTopiaSettings> | null | undefined,
): CatTopiaSettings => ({
  mainCatName: normalizeMainCatName(value?.mainCatName),
  catVariety: normalizeVariety(value?.catVariety),
  catActivityLevel: normalizeActivityLevel(value?.catActivityLevel),
  catCuddleLevel: normalizeCuddleLevel(value?.catCuddleLevel),
  catNamingConvention: normalizeNamingConvention(value?.catNamingConvention),
  catSpawnRatePerHour: normalizeSpawnRatePerHour(value?.catSpawnRatePerHour),
  maxSpawnedCatsPerSession: normalizeSessionCatCap(value?.maxSpawnedCatsPerSession),
  enabledSpecies: normalizeEnabledSpecies(value?.enabledSpecies),
});

export const resolveSpawnedCatActivityMultiplier = (
  level: CatTopiaActivityLevel,
): number =>
  level === "low" ? 0.75 : level === "high" ? 1.5 : 1;

const randomInRangeInclusive = (min: number, max: number): number => {
  const low = Math.min(min, max);
  const high = Math.max(min, max);
  return low + Math.floor(Math.random() * (high - low + 1));
};

export const randomCatSpawnIntervalMsForRate = (
  catsPerHour: CatTopiaSpawnRatePerHour,
): number => {
  if (catsPerHour <= 0) {
    return Number.MAX_SAFE_INTEGER;
  }
  if (catsPerHour === 60) {
    return randomInRangeInclusive(45_000, 75_000);
  }
  if (catsPerHour === 2) {
    return randomInRangeInclusive(25 * 60_000, 35 * 60_000);
  }
  if (catsPerHour === 4) {
    return randomInRangeInclusive(12 * 60_000, 18 * 60_000);
  }
  return randomInRangeInclusive(8 * 60_000, 12 * 60_000);
};

export const resolveCatCuddleProfile = (
  level: CatTopiaCuddleLevel,
): CatTopiaCuddleProfile => {
  if (level === "cuddle_city") {
    return {
      interactionDistanceScale: 1.25,
      catSpacingScale: 0.85,
      humanSpacingScale: 0.92,
      nudgeScale: 0.85,
    };
  }
  if (level === "express_lane") {
    return {
      interactionDistanceScale: 0.82,
      catSpacingScale: 1.12,
      humanSpacingScale: 1.1,
      nudgeScale: 1.2,
    };
  }
  if (level === "anxious") {
    return {
      interactionDistanceScale: 0.72,
      catSpacingScale: 1.22,
      humanSpacingScale: 1.2,
      nudgeScale: 1.35,
    };
  }
  return {
    interactionDistanceScale: 1,
    catSpacingScale: 1,
    humanSpacingScale: 1,
    nudgeScale: 1,
  };
};

const truncateWithEllipsis = (value: string, maxChars: number): string => {
  if (value.length <= maxChars) return value;
  const trimmed = value.slice(0, Math.max(1, maxChars - 3)).trimEnd();
  return `${trimmed}...`;
};

const hashText = (value: string): number =>
  [...value].reduce((total, character) => total + character.charCodeAt(0), 0);

export const applyCatNamingConvention = (
  baseName: string,
  convention: string,
): string => {
  const normalizedBase = clampString(baseName, CAT_TOPIA_NAMING_CONVENTION_MAX_CHARS);
  if (!normalizedBase) return "Animal";
  const normalizedConvention = convention.trim().toLowerCase();
  if (normalizedConvention === "funny") return normalizedBase;
  if (normalizedConvention === "silly") {
    return truncateWithEllipsis(
      `Silly ${normalizedBase}`,
      CAT_TOPIA_NAMING_CONVENTION_MAX_CHARS,
    );
  }
  if (normalizedConvention === "hilarious") {
    const punchWords = ["LOL", "Cha-Cha", "Bonkers", "Kaboom", "Giggle"];
    const hash = hashText(normalizedBase);
    const one = punchWords[hash % punchWords.length] ?? "LOL";
    const two = punchWords[(hash + 2) % punchWords.length] ?? "Giggle";
    return truncateWithEllipsis(
      `${one} ${normalizedBase} ${two}`,
      CAT_TOPIA_NAMING_CONVENTION_MAX_CHARS,
    );
  }
  if (normalizedConvention === "wild") {
    return truncateWithEllipsis(
      `${normalizedBase} X`,
      CAT_TOPIA_NAMING_CONVENTION_MAX_CHARS,
    );
  }
  if (normalizedConvention === "peace and love") {
    return truncateWithEllipsis(
      `Peace ${normalizedBase}`,
      CAT_TOPIA_NAMING_CONVENTION_MAX_CHARS,
    );
  }
  if (normalizedConvention === "punk rock") {
    return truncateWithEllipsis(
      `Punk ${normalizedBase}`,
      CAT_TOPIA_NAMING_CONVENTION_MAX_CHARS,
    );
  }
  return truncateWithEllipsis(
    normalizedBase,
    CAT_TOPIA_NAMING_CONVENTION_MAX_CHARS,
  );
};

export const claimUniqueCatName = (
  candidateName: string,
  usedNames: Set<string>,
): string => {
  const baseName = truncateWithEllipsis(
    clampString(candidateName, CAT_TOPIA_NAMING_CONVENTION_MAX_CHARS) || "Animal",
    CAT_TOPIA_NAMING_CONVENTION_MAX_CHARS,
  );
  const baseKey = baseName.toLowerCase();
  if (!usedNames.has(baseKey)) {
    usedNames.add(baseKey);
    return baseName;
  }
  let suffix = 2;
  while (suffix < 10_000) {
    const suffixText = ` ${suffix}`;
    const maxBaseLength = Math.max(
      1,
      CAT_TOPIA_NAMING_CONVENTION_MAX_CHARS - suffixText.length,
    );
    const trimmedBase = baseName.slice(0, maxBaseLength).trimEnd();
    const candidate = `${trimmedBase}${suffixText}`;
    const candidateKey = candidate.toLowerCase();
    if (!usedNames.has(candidateKey)) {
      usedNames.add(candidateKey);
      return candidate;
    }
    suffix += 1;
  }
  const fallback = `${baseName.slice(0, 12)}-${Date.now()}`.slice(
    0,
    CAT_TOPIA_NAMING_CONVENTION_MAX_CHARS,
  );
  usedNames.add(fallback.toLowerCase());
  return fallback;
};
