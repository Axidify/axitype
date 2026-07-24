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
  const prompt = await readArenaPrompt(page);
  await page.keyboard.type(prompt, { delay: 0 });
}

/** Type the prompt with a miss before each character to tank accuracy. */
export async function typeArenaPromptWithMisses(page: Page): Promise<void> {
  const prompt = await readArenaPrompt(page);
  for (const ch of prompt) {
    await page.keyboard.type("q", { delay: 0 });
    await page.keyboard.type(ch, { delay: 0 });
  }
}

async function readArenaPrompt(page: Page): Promise<string> {
  const promptWrap = page.locator('[class*="lineWrap"]').first();
  await expect(promptWrap).toBeVisible({ timeout: 10_000 });
  const prompt = await promptWrap.getAttribute("aria-label");
  expect(prompt).toBeTruthy();
  return prompt!;
}

export async function startFocusFromHub(page: Page): Promise<void> {
  await page.getByRole("button", { name: /^Focus/ }).click();
}

export async function startGauntletFromHub(page: Page): Promise<void> {
  await page.getByRole("button", { name: /^Gauntlet/ }).click();
}

export async function startDailyFromHub(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Daily", exact: true }).click();
}

export async function startPracticeFromHub(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Practice", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Set up practice" })).toBeVisible();
  await page.getByRole("button", { name: "Start typing" }).click();
}

export async function startPasteFromHub(page: Page, text: string): Promise<void> {
  await page.getByRole("button", { name: "Paste", exact: true }).click();
  await page.getByPlaceholder("Paste or type here…").fill(text);
  await page.getByRole("button", { name: "Start typing" }).click();
}

/** Pass home check (if shown) and type the arena prompt to completion. */
export async function completeArenaRound(page: Page): Promise<void> {
  await passHomeCheckIfNeeded(page);
  await typeArenaPrompt(page);
  await expect(page.getByRole("button", { name: "Hub" })).toBeVisible({ timeout: 15_000 });
}
