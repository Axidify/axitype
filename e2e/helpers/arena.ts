import { expect, type Page } from "@playwright/test";

/** Pass home check when Retrain / early missions require it. */
export async function passHomeCheckIfNeeded(page: Page): Promise<void> {
  const homeStart = page.getByRole("button", { name: /Press Space or click to start/i });
  if (await homeStart.isVisible().catch(() => false)) {
    await page.keyboard.press("Space");
  }
}

/** Type the current arena prompt to completion. */
export async function typeArenaPrompt(page: Page): Promise<void> {
  const promptWrap = page.locator('[class*="lineWrap"]').first();
  await expect(promptWrap).toBeVisible({ timeout: 10_000 });
  const prompt = await promptWrap.getAttribute("aria-label");
  expect(prompt).toBeTruthy();
  await page.keyboard.type(prompt!, { delay: 0 });
}

/** Pass home check (if shown) and type the arena prompt to completion. */
export async function completeArenaRound(page: Page): Promise<void> {
  await passHomeCheckIfNeeded(page);
  await typeArenaPrompt(page);
  await expect(page.getByRole("button", { name: "Hub" })).toBeVisible({ timeout: 15_000 });
}
