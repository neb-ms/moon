import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const locationPreference = {
  source: "manual-city",
  label: "New York, NY",
  lat: 40.7128,
  lon: -74.006,
  updatedAt: "2026-03-07T00:00:00.000Z",
};

function formatViolations(violations: AxeBuilder.AxeResults["violations"]): string {
  return violations
    .map((violation) => {
      const nodeTargets = violation.nodes
        .slice(0, 3)
        .map((node) => node.target.join(" "))
        .join("; ");
      return `${violation.id} [${violation.impact ?? "unknown"}] -> ${nodeTargets}`;
    })
    .join("\n");
}

async function expectNoAxeViolations(page: Parameters<AxeBuilder["constructor"]>[0]["page"]) {
  const results = await new AxeBuilder({ page }).analyze();
  const importantViolations = results.violations.filter((violation) =>
    ["critical", "serious", "moderate"].includes(violation.impact ?? ""),
  );

  expect(
    importantViolations,
    `Accessibility violations found:\n${formatViolations(importantViolations)}`,
  ).toEqual([]);
}

test.describe("Accessibility baseline", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((preference) => {
      window.localStorage.setItem("project-lunar/location-preference", JSON.stringify(preference));
    }, locationPreference);
  });

  test("dashboard and calendar meet axe baseline in mobile viewport", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Daily Dashboard" })).toBeVisible();
    await expectNoAxeViolations(page);

    await page.getByRole("link", { name: /^Calendar$/ }).first().click();
    await expect(page.getByRole("heading", { name: "Lunar Calendar" })).toBeVisible();
    await expectNoAxeViolations(page);

    await page.locator('button[data-current-month="true"]').first().click();
    await expect(page.getByRole("dialog", { name: "Moon details" })).toBeVisible();
    await expectNoAxeViolations(page);
  });
});
