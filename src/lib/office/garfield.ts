export const GARFIELD_COMPANION = {
  agentId: "garfield",
  name: "Garfield",
  avatarKind: "cat" as const,
  color: "#d97706",
  item: "morale",
  home: {
    x: 760,
    y: 560,
    facing: -Math.PI / 2,
  },
  catHoldMinDurationMs: 2_000,
  catHoldMaxDurationMs: 60_000,
  patrolMinIntervalMs: 3 * 60 * 1000,
  patrolMaxIntervalMs: 11 * 60 * 1000,
};

export const GARFIELD_CAT_INTENT_PATTERNS: RegExp[] = [
  /\bcat\b/,
  /\bgarfield\b/,
  /\bkitty\b/,
  /\bkitten\b/,
  /\bpet\b/,
  /\bmeow\b/,
  /\bpurr\b/,
];

export const GARFIELD_CHECKIN_LINES = [
  "How are you doing today?",
  "Quick morale check. You good?",
  "Need a cat break?",
  "You are doing great. Keep going.",
];

export const GARFIELD_AGENT_REPLY_LINES = [
  "Thanks Garfield, feeling good.",
  "Morale boost received.",
  "All good over here. Thanks buddy.",
  "Back to it. Appreciate the check-in.",
];

export const GARFIELD_PET_LINES = [
  "purr... purr...",
  "Mrrp. That is quality petting.",
  "Tail wag activated.",
  "Morale levels rising.",
];

export const GARFIELD_PET_AGENT_LINES = [
  "Garfield seems happy.",
  "That was a solid morale break.",
  "Petting complete. Back to work.",
];

export const GARFIELD_MEOW_LINES = [
  "mew",
  "mmrrrrr",
  "mrrow",
  "mrraah",
  "nya",
  "mrao",
  "prrrrp",
  "brrp",
  "mmew",
  "mraow",
];

const randomInRangeInclusive = (min: number, max: number): number => {
  const span = Math.max(0, max - min);
  return min + Math.floor(Math.random() * (span + 1));
};

export const randomGarfieldIntervalMs = (): number => {
  const min = GARFIELD_COMPANION.patrolMinIntervalMs;
  const max = GARFIELD_COMPANION.patrolMaxIntervalMs;
  return randomInRangeInclusive(min, max);
};

export const randomGarfieldPetHoldMs = (): number => {
  const roll = Math.random();
  if (roll < 0.74) {
    return randomInRangeInclusive(2_000, 5_000);
  }
  if (roll < 0.92) {
    return randomInRangeInclusive(6_000, 10_000);
  }
  if (roll < 0.985) {
    return randomInRangeInclusive(11_000, 30_000);
  }
  return randomInRangeInclusive(
    Math.max(31_000, GARFIELD_COMPANION.catHoldMinDurationMs),
    GARFIELD_COMPANION.catHoldMaxDurationMs,
  );
};

export const randomGarfieldMeowBurstCount = (): number =>
  randomInRangeInclusive(1, 5);

export const randomGarfieldMeowPauseMs = (): number =>
  randomInRangeInclusive(1_000, 3_000);

export const randomGarfieldSittingMeowIntervalMs = (): number =>
  randomInRangeInclusive(14_000, 32_000);

export const randomGarfieldPettingMeowIntervalMs = (): number =>
  randomInRangeInclusive(6_000, 14_000);
