import { expect, test } from "@playwright/test";
import {
  completeArenaRound,
  passHomeCheckIfNeeded,
  startDailyFromHub,
  startPasteFromHub,
  startPracticeFromHub,
  typeArenaPrompt,
} from "./helpers/arena";
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

  test("focus: hub → accuracy round → speed gate", async ({ page }) => {
    await seedDemoProfile(page, "learn");
    await page.goto("/");

    await page.getByRole("button", { name: /^Focus/ }).click();
    await passHomeCheckIfNeeded(page);
    await expect(page.getByText(/Goal:/)).toBeVisible();
    await typeArenaPrompt(page);

    await expect(page.getByText("Accuracy cleared")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("button", { name: /Start speed/i })).toBeVisible();
  });

  test("gauntlet: hub → wave 1 clear → wave 2", async ({ page }) => {
    await seedDemoProfile(page, "learn");
    await page.goto("/");

    await page.getByRole("button", { name: /^Gauntlet/ }).click();
    await passHomeCheckIfNeeded(page);
    await expect(page.getByText(/Clear wave 1:/)).toBeVisible();
    await typeArenaPrompt(page);

    await expect(page.getByText(/Clear wave 2:/)).toBeVisible({ timeout: 15_000 });
  });

  test("daily: hub → challenge → results", async ({ page }) => {
    await seedDemoProfile(page, "learn");
    await page.goto("/");

    await startDailyFromHub(page);
    await passHomeCheckIfNeeded(page);
    await typeArenaPrompt(page);

    await expect(page.getByRole("heading", { name: /Daily ·/ })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Demo run — daily best not saved")).toBeVisible();
  });

  test("practice: hub → modal → results", async ({ page }) => {
    await seedDemoProfile(page, "learn");
    await page.goto("/");

    await startPracticeFromHub(page);
    await passHomeCheckIfNeeded(page);
    await typeArenaPrompt(page);

    await expect(page.getByText("Demo run — progress not saved")).toBeVisible({ timeout: 15_000 });
  });

  test("paste: hub → modal → results", async ({ page }) => {
    await seedDemoProfile(page, "learn");
    await page.goto("/");

    await startPasteFromHub(page, "asdf jkl; asdf jkl;");
    await passHomeCheckIfNeeded(page);
    await typeArenaPrompt(page);

    await expect(page.getByText("Demo run — progress not saved")).toBeVisible({ timeout: 15_000 });
  });
});
