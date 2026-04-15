import { describe, expect, it } from "vitest";

import {
  buildPackagedSkillGeneratedFiles,
  getPackagedSkillSetupDefinition,
} from "@/lib/skills/packaged-setup";

describe("packaged skill setup", () => {
  it("returns the Amazon setup definition", () => {
    const definition = getPackagedSkillSetupDefinition("amazon-ordering");

    expect(definition?.title).toBe("Amazon defaults");
    expect(definition?.fields.map((field) => field.key)).toEqual([
      "shippingAddress",
      "paymentMethod",
      "returnDropoff",
    ]);
  });

  it("builds the Amazon defaults file from setup values", () => {
    const files = buildPackagedSkillGeneratedFiles("amazon-ordering", {
      shippingAddress: "123 Main St",
      paymentMethod: "Visa ending in 4242",
      returnDropoff: "Whole Foods",
    });

    expect(files).toHaveLength(1);
    expect(files[0]?.relativePath).toBe("defaults.json");
    expect(JSON.parse(files[0]?.content ?? "{}")).toEqual({
      shippingAddress: "123 Main St",
      paymentMethod: "Visa ending in 4242",
      returnDropoff: "Whole Foods",
    });
  });

  it("rejects missing required Amazon setup values", () => {
    expect(() =>
      buildPackagedSkillGeneratedFiles("amazon-ordering", {
        shippingAddress: "123 Main St",
        paymentMethod: "",
        returnDropoff: "Whole Foods",
      })
    ).toThrow("Payment method is required.");
  });
});
