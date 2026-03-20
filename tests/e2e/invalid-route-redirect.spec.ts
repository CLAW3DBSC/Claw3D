import { expect, test } from "@playwright/test";
import { stubStudioRoute } from "./helpers/studioRoute";

test.beforeEach(async ({ page }) => {
  await stubStudioRoute(page);
});

test("redirects unknown app routes to root", async ({ page }) => {
  await page.goto("/not-a-real-route");
  await expect
    .poll(() => new URL(page.url()).pathname, {
      message: "Expected invalid route to redirect to root path.",
    })
    .toBe("/");
  await expect(page.getByTestId("studio-menu-toggle")).toBeVisible();
});
