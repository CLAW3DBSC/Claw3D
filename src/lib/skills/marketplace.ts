import {
  buildSkillMissingDetails,
  canRemoveSkill,
  deriveSkillReadinessState,
  groupSkillsBySource,
  hasInstallableMissingBinary,
  type SkillReadinessState,
} from "@/lib/skills/presentation";
import type { SkillStatusEntry } from "@/lib/skills/types";

export type SkillMarketplaceCollectionId =
  | "featured"
  | "installed"
  | "setup-required"
  | "built-in"
  | "workspace"
  | "extra"
  | "other";

export type SkillMarketplaceMetadata = {
  category: string;
  tagline: string;
  trustLabel: string;
  capabilities: string[];
  featured?: boolean;
  editorBadge?: string;
  rating?: number;
  installs?: number;
};

export type SkillMarketplaceEntry = {
  skill: SkillStatusEntry;
  readiness: SkillReadinessState;
  metadata: SkillMarketplaceMetadata;
  installable: boolean;
  removable: boolean;
  missingDetails: string[];
};

const SKILL_MARKETPLACE_OVERRIDES: Record<string, Partial<SkillMarketplaceMetadata>> = {
  github: {
    category: "Engineering",
    tagline: "Turns repository operations into a one-step teammate workflow.",
    capabilities: ["Pull request support", "Issue context", "Repository operations"],
    featured: true,
    editorBadge: "Popular",
    rating: 4.9,
    installs: 18240,
  },
  figma: {
    category: "Design",
    tagline: "Connects design files, specs, and implementation context.",
    capabilities: ["Design context", "Asset lookup", "Spec handoff"],
    featured: true,
    editorBadge: "Editor pick",
    rating: 4.8,
    installs: 9640,
  },
  slack: {
    category: "Communication",
    tagline: "Keeps agents plugged into team channels and notifications.",
    capabilities: ["Channel updates", "Message drafting", "Notification routing"],
    featured: true,
    rating: 4.7,
    installs: 14110,
  },
  linear: {
    category: "Planning",
    tagline: "Brings issue tracking and execution loops directly into agent workflows.",
    capabilities: ["Issue lookup", "Status updates", "Planning workflows"],
    featured: true,
    rating: 4.7,
    installs: 11980,
  },
};

const hashString = (value: string): number => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = value.charCodeAt(index) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
};

const titleCaseWords = (value: string): string =>
  value
    .split(/[\s_-]+/)
    .filter((part) => part.length > 0)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");

const buildFallbackCapabilities = (skill: SkillStatusEntry): string[] => {
  const capabilities: string[] = [];
  if (skill.primaryEnv) {
    capabilities.push(`Uses ${skill.primaryEnv}.`);
  }
  if (skill.install.length > 0) {
    capabilities.push("Supports guided dependency install.");
  }
  if (skill.always) {
    capabilities.push("Always available by policy.");
  }
  if (skill.homepage) {
    capabilities.push("Has external docs.");
  }
  if (capabilities.length === 0) {
    capabilities.push("Reusable operational workflow.");
  }
  return capabilities.slice(0, 3);
};

const buildFallbackMetadata = (skill: SkillStatusEntry): SkillMarketplaceMetadata => {
  const normalizedKey = skill.skillKey.trim().toLowerCase();
  const source = skill.source.trim();
  const seed = hashString(`${normalizedKey}:${source}`);
  const category =
    skill.bundled || source === "openclaw-bundled"
      ? "Built-in"
      : source === "openclaw-managed"
        ? "Installed"
        : source === "openclaw-workspace"
          ? "Workspace"
          : source === "openclaw-extra"
            ? "Community"
            : "Automation";
  const trustLabel =
    skill.bundled || source === "openclaw-bundled"
      ? "Verified"
      : source === "openclaw-managed"
        ? "Managed"
        : source === "openclaw-workspace"
          ? "Workspace"
          : "Community";
  return {
    category,
    tagline: skill.description.trim() || `${titleCaseWords(skill.name)} capability pack.`,
    trustLabel,
    capabilities: buildFallbackCapabilities(skill),
    featured: skill.bundled || source === "openclaw-managed",
    rating: 4.2 + (seed % 7) / 10,
    installs: 400 + (seed % 9500),
  };
};

export const resolveSkillMarketplaceMetadata = (skill: SkillStatusEntry): SkillMarketplaceMetadata => {
  const normalizedKey = skill.skillKey.trim().toLowerCase();
  const fallback = buildFallbackMetadata(skill);
  const override = SKILL_MARKETPLACE_OVERRIDES[normalizedKey];
  if (!override) {
    return fallback;
  }
  return {
    ...fallback,
    ...override,
    capabilities: override.capabilities ?? fallback.capabilities,
  };
};

export const buildSkillMarketplaceEntry = (skill: SkillStatusEntry): SkillMarketplaceEntry => {
  return {
    skill,
    readiness: deriveSkillReadinessState(skill),
    metadata: resolveSkillMarketplaceMetadata(skill),
    installable: hasInstallableMissingBinary(skill),
    removable: canRemoveSkill(skill),
    missingDetails: buildSkillMissingDetails(skill),
  };
};

export const buildSkillMarketplaceCollections = (
  skills: SkillStatusEntry[]
): Array<{
  id: SkillMarketplaceCollectionId;
  label: string;
  entries: SkillMarketplaceEntry[];
}> => {
  const entries = skills.map(buildSkillMarketplaceEntry);
  const sourceGroups = groupSkillsBySource(skills);
  const collections: Array<{
    id: SkillMarketplaceCollectionId;
    label: string;
    entries: SkillMarketplaceEntry[];
  }> = [];

  const featured = entries.filter((entry) => entry.metadata.featured).slice(0, 6);
  if (featured.length > 0) {
    collections.push({ id: "featured", label: "Featured", entries: featured });
  }

  const installed = entries.filter((entry) => entry.readiness === "ready" || entry.skill.disabled);
  if (installed.length > 0) {
    collections.push({ id: "installed", label: "Installed", entries: installed });
  }

  const setupRequired = entries.filter((entry) => entry.readiness === "needs-setup");
  if (setupRequired.length > 0) {
    collections.push({ id: "setup-required", label: "Needs setup", entries: setupRequired });
  }

  for (const group of sourceGroups) {
    const groupEntries = group.skills.map(buildSkillMarketplaceEntry);
    const groupId =
      group.id === "built-in" ||
      group.id === "workspace" ||
      group.id === "extra" ||
      group.id === "other"
        ? group.id
        : "installed";
    collections.push({
      id: groupId,
      label: group.label,
      entries: groupEntries,
    });
  }

  return collections;
};
