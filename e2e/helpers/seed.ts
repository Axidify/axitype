import type { Page } from "@playwright/test";
import {
  createProfileRecord,
  createProfileStore,
  PROFILES_STORAGE_KEY,
} from "../../src/lib/profiles";
import { defaultProgress, type ProgressState } from "../../src/lib/storage";

export function buildE2EProgress(track: ProgressState["track"]): ProgressState {
  return {
    ...defaultProgress(),
    track,
    unlockedLevel: 12,
    coachPrefs: {
      ...defaultProgress().coachPrefs,
      demoMode: true,
      sound: false,
      seenTrackExplainer: true,
      seenRetrainIntro: true,
    },
  };
}

export async function seedDemoProfile(page: Page, track: ProgressState["track"]): Promise<void> {
  const store = createProfileStore([createProfileRecord("E2E", buildE2EProgress(track), [])]);
  await page.addInitScript(
    ({ key, value }) => {
      localStorage.setItem(key, value);
    },
    { key: PROFILES_STORAGE_KEY, value: JSON.stringify(store) },
  );
}
