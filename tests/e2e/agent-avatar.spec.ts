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

test("empty focused view shows zero agents when disconnected", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByTestId("studio-menu-toggle")).toBeVisible();
  await expect(page.getByRole("button", { name: "Connect" }).first()).toBeVisible();
});
