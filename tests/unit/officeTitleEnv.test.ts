import { afterEach, describe, expect, it, vi } from "vitest";

describe("resolveDefaultOfficeTitle", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.resetModules();
  });

  it("returns the env var value when CLAW3D_OFFICE_TITLE is set", async () => {
    process.env.CLAW3D_OFFICE_TITLE = "Voss Consulting Group";
    const { resolveDefaultOfficeTitle } = await import(
      "../../src/lib/studio/settings-store"
    );
    expect(resolveDefaultOfficeTitle()).toBe("Voss Consulting Group");
  });

  it("returns the hardcoded default when env var is unset", async () => {
    delete process.env.CLAW3D_OFFICE_TITLE;
    const { resolveDefaultOfficeTitle } = await import(
      "../../src/lib/studio/settings-store"
    );
    expect(resolveDefaultOfficeTitle()).toBe("Luke Headquarters");
  });

  it("returns the hardcoded default when env var is empty", async () => {
    process.env.CLAW3D_OFFICE_TITLE = "   ";
    const { resolveDefaultOfficeTitle } = await import(
      "../../src/lib/studio/settings-store"
    );
    expect(resolveDefaultOfficeTitle()).toBe("Luke Headquarters");
  });

  it("trims whitespace from the env var", async () => {
    process.env.CLAW3D_OFFICE_TITLE = "  My Office  ";
    const { resolveDefaultOfficeTitle } = await import(
      "../../src/lib/studio/settings-store"
    );
    expect(resolveDefaultOfficeTitle()).toBe("My Office");
  });
});

describe("loadLocalGatewayDefaults with CLAW3D_GATEWAY_URL", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.resetModules();
  });

  it("returns env-based defaults when CLAW3D_GATEWAY_URL is set and no openclaw.json exists", async () => {
    process.env.CLAW3D_GATEWAY_URL = "ws://my-gateway:18789";
    process.env.CLAW3D_GATEWAY_TOKEN = "my-token";
    // Point state dir to a non-existent location so openclaw.json is not found
    process.env.OPENCLAW_STATE_DIR = "/tmp/claw3d-test-nonexistent-" + Date.now();
    const { loadLocalGatewayDefaults } = await import(
      "../../src/lib/studio/settings-store"
    );
    const result = loadLocalGatewayDefaults();
    expect(result).toEqual({ url: "ws://my-gateway:18789", token: "my-token" });
  });

  it("returns env-based defaults with empty token when only URL is set", async () => {
    process.env.CLAW3D_GATEWAY_URL = "ws://my-gateway:18789";
    delete process.env.CLAW3D_GATEWAY_TOKEN;
    process.env.OPENCLAW_STATE_DIR = "/tmp/claw3d-test-nonexistent-" + Date.now();
    const { loadLocalGatewayDefaults } = await import(
      "../../src/lib/studio/settings-store"
    );
    const result = loadLocalGatewayDefaults();
    expect(result).toEqual({ url: "ws://my-gateway:18789", token: "" });
  });

  it("returns null when no env var and no openclaw.json", async () => {
    delete process.env.CLAW3D_GATEWAY_URL;
    delete process.env.CLAW3D_GATEWAY_TOKEN;
    process.env.OPENCLAW_STATE_DIR = "/tmp/claw3d-test-nonexistent-" + Date.now();
    const { loadLocalGatewayDefaults } = await import(
      "../../src/lib/studio/settings-store"
    );
    const result = loadLocalGatewayDefaults();
    expect(result).toBeNull();
  });
});
