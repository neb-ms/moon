import { expect, test } from "@playwright/test";

const locationPreference = {
  source: "manual-city",
  label: "New York, NY",
  lat: 40.7128,
  lon: -74.006,
  updatedAt: "2026-03-07T00:00:00.000Z",
};

test.describe("MVP mobile flow", () => {
  test("launches dashboard and opens calendar detail modal", async ({ page }) => {
    await page.addInitScript((preference) => {
      window.localStorage.setItem("project-lunar/location-preference", JSON.stringify(preference));
    }, locationPreference);

    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Daily Dashboard" })).toBeVisible();
    await expect(page.getByText("Today's Moon")).toBeVisible();

    await page.getByRole("link", { name: /^Calendar$/ }).first().click();
    await expect(page).toHaveURL(/\/calendar$/);
    await expect(page.getByRole("heading", { name: "Lunar Calendar" })).toBeVisible();

    const dayButton = page.locator('button[data-current-month="true"]').first();
    await dayButton.click();

    const detailsModal = page.getByRole("dialog", { name: "Moon details" });
    await expect(detailsModal).toBeVisible();
    await expect(detailsModal.getByText("Date Detail")).toBeVisible();

    await detailsModal.getByRole("button", { name: "Close details" }).click();
    await expect(detailsModal).toBeHidden();
  });
});
