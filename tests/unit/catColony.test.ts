import { describe, expect, it } from "vitest";

import {
  parseZooNamesMarkdown,
  pickRandomEnabledZooSpecies,
  pickRandomZooName,
} from "@/lib/office/catColony";

describe("catColony zoo helpers", () => {
  it("parses species-specific names from markdown headings", () => {
    const parsed = parseZooNamesMarkdown(`
## cat
- Sunny Bean
- Mittens McGee

## monkey
- Banana Bandit
`);

    expect(parsed.cat).toContain("Sunny Bean");
    expect(parsed.monkey).toContain("Banana Bandit");
    expect(parsed.dog.length).toBeGreaterThan(0);
  });

  it("returns cat when no species are enabled", () => {
    expect(pickRandomEnabledZooSpecies([])).toBe("cat");
  });

  it("picks names from the requested species pool", () => {
    const parsed = parseZooNamesMarkdown(`
## dog
- Sir Borks
`);
    const used = new Set<string>();
    const name = pickRandomZooName("dog", parsed, used);
    expect(name.length).toBeGreaterThan(0);
    expect(used.size).toBe(1);
  });
});
