import { expect, test } from "@playwright/test";
import { stubStudioRoute } from "./helpers/studioRoute";

test.beforeEach(async ({ page }) => {
  await stubStudioRoute(page);
});

test("settings route shows connect UI while disconnected and can return to chat", async ({ page }) => {
  await page.goto("/agents/main/settings");

  await expect(page.getByRole("button", { name: "Back to chat" })).toBeVisible();
  await expect(page.getByLabel("Upstream URL")).toBeVisible();

  await page.getByRole("button", { name: "Back to chat" }).click();
  await expect
    .poll(() => new URL(page.url()).pathname, {
      message: "Expected back button to return to chat route.",
    })
    .toBe("/");
});
