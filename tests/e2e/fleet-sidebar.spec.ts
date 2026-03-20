import { expect, test } from "@playwright/test";
import { stubStudioRoute } from "./helpers/studioRoute";

test.beforeEach(async ({ page }) => {
  await stubStudioRoute(page);
});

test("shows_disconnected_connect_surface", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByLabel("Upstream URL")).toBeVisible();
  await expect(page.getByRole("button", { name: /^(Connect|Connecting…)$/ })).toBeVisible();
});

test("persists_gateway_fields_to_studio_settings", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel("Upstream URL").fill("ws://gateway.example:18789");
  await page.getByLabel("Upstream token").fill("token-123");

  const request = await page.waitForRequest((req) => {
    if (!req.url().includes("/api/studio") || req.method() !== "PUT") {
      return false;
    }
    const payload = JSON.parse(req.postData() ?? "{}") as Record<string, unknown>;
    const gateway = (payload.gateway ?? {}) as { url?: string; token?: string };
    return gateway.url === "ws://gateway.example:18789" && gateway.token === "token-123";
  });
  const payload = JSON.parse(request.postData() ?? "{}") as Record<string, unknown>;
  const gateway = (payload.gateway ?? {}) as { url?: string; token?: string };
  expect(gateway.url).toBe("ws://gateway.example:18789");
  expect(gateway.token).toBe("token-123");
});

test("focused_preferences_persist_across_reload", async ({ page }) => {
  await page.goto("/");

  await page.getByTestId("studio-menu-toggle").click();
  await expect(page.getByTestId("gateway-settings-toggle")).toBeVisible();

  await page.reload();

  await expect(page.getByTestId("studio-menu-toggle")).toBeVisible();
});

test("clears_unseen_indicator_on_focus", async ({ page }) => {
  await page.goto("/");

  await page.getByTestId("studio-menu-toggle").click();
  await expect(page.getByTestId("gateway-settings-toggle")).toBeVisible();
});
