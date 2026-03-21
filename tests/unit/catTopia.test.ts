import { describe, expect, it } from "vitest";

import {
  CAT_TOPIA_DEFAULT_SETTINGS,
  normalizeCatTopiaSettings,
} from "@/lib/office/catTopia";

describe("catTopia settings normalization", () => {
  it("keeps cats enabled by default", () => {
    const normalized = normalizeCatTopiaSettings(null);
    expect(normalized.enabledSpecies).toEqual(["cat"]);
    expect(normalized.mainCatName).toBe(CAT_TOPIA_DEFAULT_SETTINGS.mainCatName);
  });

  it("filters invalid species and keeps unique valid species", () => {
    const normalized = normalizeCatTopiaSettings({
      enabledSpecies: ["cat", "dog", "DOG", "unknown", "monkey"] as never,
    });
    expect(normalized.enabledSpecies).toEqual(["cat", "dog", "monkey"]);
  });

  it("falls back to cat when species list is empty", () => {
    const normalized = normalizeCatTopiaSettings({ enabledSpecies: [] });
    expect(normalized.enabledSpecies).toEqual(["cat"]);
  });
});
