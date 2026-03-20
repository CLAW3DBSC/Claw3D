import { expect, test } from "@playwright/test";
import { stubStudioRoute } from "./helpers/studioRoute";

test.beforeEach(async ({ page }) => {
  await stubStudioRoute(page);
});

test("connection panel reflects disconnected state", async ({ page }) => {
  await page.goto("/");

  await page.getByTestId("studio-menu-toggle").click();
  await page.getByTestId("gateway-settings-toggle").click();
  await expect(page.getByLabel("Upstream URL")).toBeVisible();
  await expect(
    page.getByRole("button", { name: /^(Connect|Disconnect)$/ })
  ).toBeVisible();
});
