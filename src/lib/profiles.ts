import type { AnalyticsEvent } from "./analytics";
import { ANALYTICS_KEY, ANALYTICS_MAX_EVENTS } from "./analytics";
import { defaultProgress, type ProgressState } from "./storage";

export const PROFILES_STORAGE_KEY = "axitype.profiles.v1";
export const LEGACY_PROGRESS_KEY = "axitype.v1";
export const LEGACY_KEYLANE_KEY = "keylane.v1";

export const PROFILES_SCHEMA = "axitype.profiles" as const;
export const PROFILE_BUNDLE_SCHEMA = "axitype.profile" as const;
export const PROFILES_STORE_VERSION = 1;
export const PROFILE_BUNDLE_VERSION = 1;
export const MAX_PROFILES = 5;
export const DEFAULT_PROFILE_NAME = "Player";

export interface ProfileRecord {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  progress: ProgressState;
  /** Per-profile events — same unit that cloud sync would move with the profile. */
  analytics: AnalyticsEvent[];
}

export interface ProfileStore {
  schema: typeof PROFILES_SCHEMA;
  version: number;
  activeProfileId: string;
  profiles: ProfileRecord[];
}

export type ProfileMutationResult =
  | { ok: true; store: ProfileStore }
  | { ok: false; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Lenient merge for local store reads (strict normalize lives in progressBackup for imports). */
export function coerceProgress(raw: unknown): ProgressState {
  if (!isRecord(raw)) return defaultProgress();
  const coachPrefs = isRecord(raw.coachPrefs) ? raw.coachPrefs : {};
  return {
    ...defaultProgress(),
    ...(raw as Partial<ProgressState>),
    coachPrefs: {
      ...defaultProgress().coachPrefs,
      ...(coachPrefs as ProgressState["coachPrefs"]),
    },
  };
}

export function createProfileId(now = Date.now()): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `p_${now.toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function sanitizeProfileName(name: string): string {
  return name.replace(/\s+/g, " ").trim().slice(0, 24);
}

export function createProfileRecord(
  name: string,
  progress: ProgressState = defaultProgress(),
  analytics: AnalyticsEvent[] = [],
  now = Date.now(),
): ProfileRecord {
  const clean = sanitizeProfileName(name) || DEFAULT_PROFILE_NAME;
  return {
    id: createProfileId(now),
    name: clean,
    createdAt: now,
    updatedAt: now,
    progress,
    analytics: analytics.slice(-ANALYTICS_MAX_EVENTS),
  };
}

export function createProfileStore(
  profiles: ProfileRecord[],
  activeProfileId?: string,
): ProfileStore {
  if (profiles.length === 0) {
    const fresh = createProfileRecord(DEFAULT_PROFILE_NAME);
    return {
      schema: PROFILES_SCHEMA,
      version: PROFILES_STORE_VERSION,
      activeProfileId: fresh.id,
      profiles: [fresh],
    };
  }
  const active =
    (activeProfileId && profiles.some((p) => p.id === activeProfileId) && activeProfileId) ||
    profiles[0].id;
  return {
    schema: PROFILES_SCHEMA,
    version: PROFILES_STORE_VERSION,
    activeProfileId: active,
    profiles,
  };
}

export function getActiveProfile(store: ProfileStore): ProfileRecord {
  return store.profiles.find((p) => p.id === store.activeProfileId) ?? store.profiles[0];
}

export function getActiveProgress(store: ProfileStore): ProgressState {
  return getActiveProfile(store).progress;
}

export function getActiveAnalytics(store: ProfileStore): AnalyticsEvent[] {
  return getActiveProfile(store).analytics;
}

/** Persist progress into the active profile; bumps updatedAt. */
export function setActiveProgress(
  store: ProfileStore,
  progress: ProgressState,
  now = Date.now(),
): ProfileStore {
  const activeId = store.activeProfileId;
  return {
    ...store,
    profiles: store.profiles.map((p) =>
      p.id === activeId ? { ...p, progress, updatedAt: now } : p,
    ),
  };
}

export function setActiveAnalytics(
  store: ProfileStore,
  analytics: AnalyticsEvent[],
  now = Date.now(),
): ProfileStore {
  const activeId = store.activeProfileId;
  const capped = analytics.slice(-ANALYTICS_MAX_EVENTS);
  return {
    ...store,
    profiles: store.profiles.map((p) =>
      p.id === activeId ? { ...p, analytics: capped, updatedAt: now } : p,
    ),
  };
}

export function switchActiveProfile(store: ProfileStore, profileId: string): ProfileMutationResult {
  if (!store.profiles.some((p) => p.id === profileId)) {
    return { ok: false, error: "That profile doesn't exist." };
  }
  return { ok: true, store: { ...store, activeProfileId: profileId } };
}

export function addProfile(store: ProfileStore, name: string, now = Date.now()): ProfileMutationResult {
  if (store.profiles.length >= MAX_PROFILES) {
    return { ok: false, error: `You can have up to ${MAX_PROFILES} profiles on this device.` };
  }
  const clean = sanitizeProfileName(name);
  if (!clean) return { ok: false, error: "Enter a profile name." };
  const profile = createProfileRecord(clean, defaultProgress(), [], now);
  return {
    ok: true,
    store: {
      ...store,
      activeProfileId: profile.id,
      profiles: [...store.profiles, profile],
    },
  };
}

export function renameProfile(
  store: ProfileStore,
  profileId: string,
  name: string,
  now = Date.now(),
): ProfileMutationResult {
  const clean = sanitizeProfileName(name);
  if (!clean) return { ok: false, error: "Enter a profile name." };
  if (!store.profiles.some((p) => p.id === profileId)) {
    return { ok: false, error: "That profile doesn't exist." };
  }
  return {
    ok: true,
    store: {
      ...store,
      profiles: store.profiles.map((p) =>
        p.id === profileId ? { ...p, name: clean, updatedAt: now } : p,
      ),
    },
  };
}

export function deleteProfile(store: ProfileStore, profileId: string): ProfileMutationResult {
  if (store.profiles.length <= 1) {
    return { ok: false, error: "Keep at least one profile." };
  }
  if (!store.profiles.some((p) => p.id === profileId)) {
    return { ok: false, error: "That profile doesn't exist." };
  }
  const profiles = store.profiles.filter((p) => p.id !== profileId);
  const activeProfileId =
    store.activeProfileId === profileId ? profiles[0].id : store.activeProfileId;
  return { ok: true, store: { ...store, profiles, activeProfileId } };
}

function normalizeAnalytics(value: unknown): AnalyticsEvent[] {
  if (!Array.isArray(value)) return [];
  return value.filter((e) => isRecord(e) && typeof e.type === "string") as AnalyticsEvent[];
}

export function normalizeProfileRecord(raw: unknown, now = Date.now()): ProfileRecord | null {
  if (!isRecord(raw)) return null;
  const progressRaw = "progress" in raw ? raw.progress : raw;
  if (!isRecord(progressRaw) && "progress" in raw) return null;
  const progress = coerceProgress(progressRaw);
  const name =
    sanitizeProfileName(typeof raw.name === "string" ? raw.name : DEFAULT_PROFILE_NAME) ||
    DEFAULT_PROFILE_NAME;
  const id =
    typeof raw.id === "string" && raw.id.trim().length > 0 ? raw.id.trim() : createProfileId(now);
  return {
    id,
    name,
    createdAt:
      typeof raw.createdAt === "number" && Number.isFinite(raw.createdAt) ? raw.createdAt : now,
    updatedAt:
      typeof raw.updatedAt === "number" && Number.isFinite(raw.updatedAt) ? raw.updatedAt : now,
    progress,
    analytics: normalizeAnalytics(raw.analytics),
  };
}

export function normalizeProfileStore(raw: unknown, now = Date.now()): ProfileStore | null {
  if (!isRecord(raw)) return null;
  if (raw.schema !== PROFILES_SCHEMA) return null;
  const version = typeof raw.version === "number" ? raw.version : 0;
  if (version < 1 || version > PROFILES_STORE_VERSION) return null;
  if (!Array.isArray(raw.profiles) || raw.profiles.length === 0) return null;

  const profiles: ProfileRecord[] = [];
  const seen = new Set<string>();
  for (const entry of raw.profiles) {
    const profile = normalizeProfileRecord(entry, now);
    if (!profile) continue;
    if (seen.has(profile.id)) {
      profile.id = createProfileId(now + profiles.length);
    }
    seen.add(profile.id);
    profiles.push(profile);
    if (profiles.length >= MAX_PROFILES) break;
  }
  if (profiles.length === 0) return null;

  const activeRaw = typeof raw.activeProfileId === "string" ? raw.activeProfileId : profiles[0].id;
  return createProfileStore(profiles, activeRaw);
}

/** One-shot migrate legacy progress (+ optional device analytics) into a profile store. */
export function migrateLegacyToProfileStore(
  legacyProgressRaw: string | null,
  legacyAnalyticsRaw: string | null,
  now = Date.now(),
): ProfileStore {
  let progress = defaultProgress();
  if (legacyProgressRaw) {
    try {
      progress = coerceProgress(JSON.parse(legacyProgressRaw));
    } catch {
      // keep defaults
    }
  }

  let analytics: AnalyticsEvent[] = [];
  if (legacyAnalyticsRaw) {
    try {
      const parsed = JSON.parse(legacyAnalyticsRaw) as unknown;
      analytics = normalizeAnalytics(parsed);
    } catch {
      analytics = [];
    }
  }

  const player = createProfileRecord(DEFAULT_PROFILE_NAME, progress, analytics, now);
  return createProfileStore([player], player.id);
}

export function loadProfileStoreFromLocalStorage(
  storage: Storage = localStorage,
  now = Date.now(),
): ProfileStore {
  try {
    const existing = storage.getItem(PROFILES_STORAGE_KEY);
    if (existing) {
      const normalized = normalizeProfileStore(JSON.parse(existing), now);
      if (normalized) return normalized;
    }
  } catch {
    // fall through to migrate
  }

  let legacyProgress = storage.getItem(LEGACY_PROGRESS_KEY);
  if (!legacyProgress) {
    const keylane = storage.getItem(LEGACY_KEYLANE_KEY);
    if (keylane) {
      legacyProgress = keylane;
      try {
        storage.setItem(LEGACY_PROGRESS_KEY, keylane);
      } catch {
        // ignore
      }
    }
  }
  const legacyAnalytics = storage.getItem(ANALYTICS_KEY);
  const migrated = migrateLegacyToProfileStore(legacyProgress, legacyAnalytics, now);
  saveProfileStoreToLocalStorage(migrated, storage);
  return migrated;
}

export function saveProfileStoreToLocalStorage(
  store: ProfileStore,
  storage: Storage = localStorage,
): void {
  storage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(store));
}
