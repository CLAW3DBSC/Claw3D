import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("**/api/studio", async (route, request) => {
    if (request.method() === "PUT") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          settings: { version: 1, gateway: null, focused: {}, avatars: {} },
        }),
      });
      return;
    }
    if (request.method() !== "GET") {
      await route.fallback();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        settings: { version: 1, gateway: null, focused: {}, avatars: {} },
      }),
    });
  });
});

test("shows_connection_settings_control_in_header", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByTestId("brain-files-toggle")).toHaveCount(0);
  await page.getByTestId("studio-menu-toggle").click();
  await expect(page.getByTestId("gateway-settings-toggle")).toBeVisible();
});

test("mobile_header_shows_connection_control", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await expect(page.getByTestId("brain-files-toggle")).toHaveCount(0);
  await page.getByTestId("studio-menu-toggle").click();
  await expect(page.getByTestId("gateway-settings-toggle")).toBeVisible();
});
