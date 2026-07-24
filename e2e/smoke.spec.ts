import { expect, test } from "@playwright/test";
import { completeArenaRound } from "./helpers/arena";
import { seedDemoProfile } from "./helpers/seed";

test.describe("smoke", () => {
  test("learn track: hub → mission → results", async ({ page }) => {
    await seedDemoProfile(page, "learn");
    await page.goto("/");

    await expect(page.getByRole("button", { name: /Continue · Mission/i })).toBeVisible();
    await page.getByRole("button", { name: /Continue · Mission/i }).click();

    await completeArenaRound(page);
    await expect(page.getByText("Demo run — progress not saved")).toBeVisible();
  });

  test("retrain track: hub → mission → results", async ({ page }) => {
    await seedDemoProfile(page, "retrain");
    await page.goto("/");

    await page.getByRole("button", { name: "Retrain" }).click();
    await page.getByRole("button", { name: /Continue · Mission/i }).click();

    await completeArenaRound(page);
    await expect(page.getByText("Demo run — progress not saved")).toBeVisible();
  });
});
