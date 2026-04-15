import { describe, expect, it } from "vitest";

import {
  buildOfficeSkillTriggerHoldMaps,
  DEFAULT_SKILL_TRIGGER_FALLBACKS_BY_SKILL_KEY,
  OFFICE_SKILL_TRIGGER_PLACE_REGISTRY,
} from "@/lib/office/places";
import {
  listPackagedSkillTriggerDefinitions,
  resolveTriggeredSkillDefinition,
} from "@/lib/skills/triggers";

describe("skill triggers", () => {
  it("parses packaged skill trigger definitions from SKILL.md", () => {
    const amazonTrigger = listPackagedSkillTriggerDefinitions().find(
      (entry) => entry.skillKey === "amazon-ordering",
    );
    const todoTrigger = listPackagedSkillTriggerDefinitions().find(
      (entry) => entry.skillKey === "todo-board",
    );
    const taskManagerTrigger = listPackagedSkillTriggerDefinitions().find(
      (entry) => entry.skillKey === "task-manager",
    );

    expect(amazonTrigger).not.toBeUndefined();
    expect(amazonTrigger?.movementTarget).toBe("shop");
    expect(amazonTrigger?.activationPhrases).toContain("amazon");
    expect(amazonTrigger?.activationPhrases).toContain("amazon return");
    expect(todoTrigger).not.toBeUndefined();
    expect(todoTrigger?.movementTarget).toBe("desk");
    expect(todoTrigger?.activationPhrases).toContain("todo");
    expect(todoTrigger?.activationPhrases).toContain("blocked tasks");
    expect(taskManagerTrigger).not.toBeUndefined();
    expect(taskManagerTrigger?.movementTarget).toBe("desk");
    expect(taskManagerTrigger?.activationPhrases).toContain("add a task");
  });

  it("matches the running agent's latest request against enabled skill triggers", () => {
    const amazonTrigger = listPackagedSkillTriggerDefinitions().find(
      (entry) => entry.skillKey === "amazon-ordering",
    );

    const matched = resolveTriggeredSkillDefinition({
      isAgentRunning: true,
      lastUserMessage: "On telegram, can you buy this on Amazon for me?",
      transcriptEntries: [],
      triggers: amazonTrigger ? [amazonTrigger] : [],
    });

    expect(matched?.skillKey).toBe("amazon-ordering");
    expect(matched?.movementTarget).toBe("shop");
  });

  it("does not match triggers when the agent is not running", () => {
    const todoTrigger = listPackagedSkillTriggerDefinitions().find(
      (entry) => entry.skillKey === "todo-board",
    );

    const matched = resolveTriggeredSkillDefinition({
      isAgentRunning: false,
      lastUserMessage: "Add this to my todo list.",
      transcriptEntries: [],
      triggers: todoTrigger ? [todoTrigger] : [],
    });

    expect(matched).toBeNull();
  });

  it("keeps trigger places and fallback definitions in one central registry", () => {
    expect(OFFICE_SKILL_TRIGGER_PLACE_REGISTRY.desk.interactionTarget).toBe(
      "desk",
    );
    expect(OFFICE_SKILL_TRIGGER_PLACE_REGISTRY.github.interactionTarget).toBe(
      "server_room",
    );
    expect(
      DEFAULT_SKILL_TRIGGER_FALLBACKS_BY_SKILL_KEY["amazon-ordering"]
        ?.movementTarget,
    ).toBe("shop");
    expect(
      DEFAULT_SKILL_TRIGGER_FALLBACKS_BY_SKILL_KEY["todo-board"]
        ?.movementTarget,
    ).toBe("desk");
  });

  it("builds animation hold maps from the central place registry", () => {
    const holdMaps = buildOfficeSkillTriggerHoldMaps({
      "agent-a": "desk",
      "agent-b": "github",
      "agent-c": "gym",
      "agent-d": "qa_lab",
      "agent-e": "shop",
    });

    expect(holdMaps.deskHoldByAgentId).toEqual({ "agent-a": true });
    expect(holdMaps.githubHoldByAgentId).toEqual({ "agent-b": true });
    expect(holdMaps.gymHoldByAgentId).toEqual({ "agent-c": true });
    expect(holdMaps.qaHoldByAgentId).toEqual({ "agent-d": true });
    expect(holdMaps.shopHoldByAgentId).toEqual({ "agent-e": true });
    expect(holdMaps.skillGymHoldByAgentId).toEqual({ "agent-c": true });
  });
});
