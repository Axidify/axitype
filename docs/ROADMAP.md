# AxiType — Product Roadmap

**Last updated:** July 2026  
**Current version:** v1.0.0  
**Status:** Strong v1 — coherent tutor with a clear Retrain angle; next work should sharpen communication and double down on differentiation.

---

## Where we are today

AxiType is a browser-based touch typing tutor with:

- **Learn / Retrain tracks** — different coaching intensity and progression gates
- **12 campaign missions** + **5 habit drills**
- **Form Coach** — hand diagram, finger chip, home-row check, miss tips
- **Adaptive prompts** — digraph chain with weak-key weighting from `keyStats`
- **Live WPM sparkline**, combo scoring, pace gating (Retrain)
- **Local progress** — `localStorage` (`axitype.v1`), stats charts, star ratings

**Core differentiator:** Retrain is not just “hard mode.” It is a structured path for breaking bad habits — mandatory drills between stages, stronger coaching, pace gates, Eyes Up sprints.

**Main gaps vs mature typing apps:** in-app rule clarity, readable early prompts, broader timed/custom modes, accounts/leaderboards, deeper analytics.

**Progression scope (for clarity):**
- **Missions** — star ratings and `unlockedLevel` (Learn: accuracy gate; Retrain: accuracy gate + drill badges between stages)
- **Practice** — no stars, no unlocks; uses unlocked key charset
- **Drills** — grant Form badges on Retrain (required to unlock later missions); no campaign unlock on Learn

---

## Completed / in progress

Recent work not yet reflected in player-facing UX:

| Item | Status | Notes |
|------|--------|-------|
| Stable prompt layout (`PromptLine`) | **Done** | Measure/paint pattern; no reflow on wrap |
| Per-round `missCounts` in `roundHistory` | **Done** | `App.tsx` aggregates from `keyEvents` |
| Stats time windows + keyboard heatmap | **Done** | Last 12 / 7 days / all time; `MissedKeysHeatmap` |
| Post-mission miss coaching UI | **Not started** | Data exists; `Results.tsx` doesn’t use it yet |
| Hybrid readable prompts | **Not started** | See [hybrid-prompt-text.md](./plans/hybrid-prompt-text.md) |

---

## Guiding principles for what to build next

1. **Explain the rules in-app** — players should never need to read source code to understand stars, unlocks, or accuracy.
2. **Make Retrain the headline** — this is what Monkeytype and Keybr do not offer.
3. **Pedagogy before features** — readable drills beat random letter chains; see [hybrid-prompt-text.md](./plans/hybrid-prompt-text.md).
4. **Small, shippable slices** — each item below should be releasable on its own.
5. **Keep the codebase lean** — ~45 source files in `src/`; resist platform creep until core loop is undeniable.

**`coachPrefs` pattern:** New one-time flags (`seenTrackExplainer`, `seenRetrainIntro`, `seenTutorial`) should merge via the same `loadProgress()` spread used for existing prefs — don’t break saved games.

---

## Priority tiers

| Tier | Meaning | Target |
|------|---------|--------|
| **P0** | High impact, low–medium effort — do first | Next 1–2 weeks |
| **P1** | High impact, medium effort — core product bet | Next 1–2 months |
| **P2** | Medium impact — polish and retention | When P0/P1 are stable |
| **P3** | Nice-to-have or strategic bets | Later / if audience demands |

---

## P0 — In-app clarity (highest ROI)

Players currently miss rules that exist in code but are not surfaced in UI.

**Recommended order:** 1 → 4 → 5 → 7 (UI only) → 2 → 3

### 1. Results screen: show why stars were awarded

**Impact:** Very high · **Effort:** Low

On `Results.tsx`, add a short breakdown:

| Stars | Requirement |
|-------|-------------|
| ★ | Finish the full prompt (not timed out) |
| ★★ | Accuracy ≥ 94% (Learn) or ≥ 96% (Retrain) |
| ★★★ | ★★ + level WPM target for your track + no peek |

**Notes:**
- 3★ is available on **any mission** that has a WPM target — not only Level 12.
- **Peek** only exists on Eyes Up (Level 12, Retrain only). If you peek anywhere and meet the WPM target, 3★ is capped at 2★ (`calcStars`).
- **Timed out** (Level 12, 90s) → 0★, no unlock. Surface this explicitly on results.

If the player got 1★, show: *“Need 94% accuracy to unlock the next mission — you had 91.2%.”*

**Touches:** `Results.tsx`, `levels.ts` (`accuracyGate`, `wpmTarget`), `scoring.ts` (`calcStars`).

---

### 2. Hub: explain Learn vs Retrain before first mission

**Impact:** High · **Effort:** Low

Add a one-time tooltip or expandable panel on `LevelHub.tsx`:

- **Learn** — calmer coaching, 94% gate, optional Form Coach
- **Retrain** — mandatory home check, pace gates, drill gates between stages, 96% gate

**Touches:** `LevelHub.tsx`, `coachPrefs.seenTrackExplainer`.

*Overlaps with P1 Retrain onboarding — ship this first as a lightweight explainer; expand in v1.3 if needed.*

---

### 3. Accuracy tooltip in the arena HUD

**Impact:** Medium-high · **Effort:** Low

Accuracy works differently from most typing sites: each miss permanently costs `1 / promptLength` and correct keys never raise it again. Add a `?` or subtitle on the HUD:

> *“Accuracy = keys you got right out of the full prompt. Misses stick.”*

**Touches:** `Hud.tsx`, `scoring.ts` (`calcAccuracy` comment is already the spec).

---

### 4. Mission card: show unlock requirements on locked/next level

**Impact:** Medium · **Effort:** Low

On each mission node in `LevelHub.tsx`, show:

- `★★ 94%+ to unlock next` (Learn)
- `★★ 96%+ to unlock next` (Retrain)
- WPM target for 3★ (muted, per track via `wpmTarget`)

**Touches:** `LevelHub.tsx`, `levels.ts`.

---

### 5. Retrain drill-gate messaging on locked missions

**Impact:** High · **Effort:** Low

On Retrain, missions can be locked even when `unlockedLevel` is high. `stageLocked()` in `LevelHub.tsx` requires the **previous level’s drill Form badge** (`formBadgeKey`).

When a mission is drill-locked, show on the card:

> *“Complete **Home Return** drill to unlock Mission 5.”*

Link or highlight the relevant drill in the Habit drills section.

**Touches:** `LevelHub.tsx`, `levels.ts` (`unlockDrill`), `drills.ts`.

---

### 6. Post-mission miss summary on Results *(quick win — data exists)*

**Impact:** High · **Effort:** Low

**~40% done** — `roundHistory[].missCounts` and `ArenaResult.keyEvents` already capture per-run misses. UI not wired.

After a round with accuracy below gate, show top 3 missed keys from **this run** and a drill suggestion:

- Missed `r`, `f`, `v` → “Try One Finger (right index)”
- Many same-hand pairs → “Try Alternating Hands”

**Touches:** `Results.tsx` (pass `keyEvents` or round `missCounts` from `App.tsx`), `drills.ts`.

*Full drill-mapping logic can expand in P1; start with miss list + Weak Finger / Alternating Hands CTA.*

---

## P1 — Core product bets

### 7. Hybrid prompt text (readable missions)

**Impact:** Very high · **Effort:** Medium-high

Early missions currently use digraph chains that can read as gibberish. Levels 1–4 should teach finger placement with intentional chunks; 5–9 pseudo-words; 10–12 real sentences.

**Full spec:** [docs/plans/hybrid-prompt-text.md](./plans/hybrid-prompt-text.md)

**Why P1:** This is the single biggest pedagogy upgrade. Retrain and Learn both benefit immediately.

**Touches:** `prompts.ts`, new `promptChunks.ts` / `pseudoWords.ts` / `sentences.ts`, `App.tsx`, `drills.ts`, tests.

**Ship with v1.2:** Drill spacing fixes (Home Return, Alternating Hands) from the hybrid plan — don’t defer to v1.3.

---

### 8. Retrain onboarding flow

**Impact:** High · **Effort:** Medium

When switching to Retrain for the first time, walk through:

1. What “bad habit” means in this app (peeking, wrong finger, same-hand pecking)
2. Home-row check (why Space to start)
3. Pace gate (“slow down — reset to home”)
4. Drill gates between stages (must earn Form badge)

Could be a 3-screen modal or a dedicated “Retrain intro” mission (Mission 0).

**Touches:** new `RetrainIntro.tsx`, `LevelHub.tsx`, `coachPrefs.seenRetrainIntro`.

*Build on P0 #2 and #5 — avoid repeating the same copy.*

---

### 9. Post-mission coaching → drill mapping (full)

**Impact:** High · **Effort:** Medium

Extend P0 #6 with smarter drill routing, miss pattern detection (same-hand pairs, reach errors), and deep links into `startDrill`.

**Touches:** `Results.tsx`, `drills.ts`, new `suggestDrill(missCounts)` helper.

---

### 10. Timed mode option (practice + late campaign)

**Impact:** Medium-high · **Effort:** Medium

Only Level 12 has `timedSeconds: 90` today (Retrain only; Eyes Up). Add optional 60s / 90s timed practice from the hub, and consider timed variants for missions 10–12.

**Timed-out behavior:** Clock hits zero → `timedOut: true`, `finished: true`, 0★. Explain on results and in hub copy before starting.

**Touches:** `levels.ts`, `App.tsx` (`startPractice`), `Arena.tsx`, `Hud.tsx` (timer already exists).

---

## P2 — Polish and retention

### 11. Hub onboarding (fold tutorial into P0)

**Impact:** Medium · **Effort:** Low–medium

Avoid a separate heavy tutorial if P0 explainers land. Optional 3-step first-visit overlay on hub:

1. Pick Learn or Retrain
2. Earn ★★ to unlock the next mission
3. Check Stats for weak keys

**Touches:** `LevelHub.tsx`, `coachPrefs.seenTutorial`.

*Skip if P0 items 1–5 are sufficient — validate with playtesting.*

---

### 12. Stats page — remaining depth

**Impact:** Medium · **Effort:** Medium

**Already shipped:** time windows (last 12 / 7 days / all time), keyboard heatmap (`MissedKeysHeatmap`), Weak Finger CTA.

**Still to add:**
- Accuracy trend chart (not just WPM)
- Best run per level (from `bestByLevel` / `roundHistory`)
- Smarter “Suggested drill” beyond Weak Finger (tie to P1 #9)

**Touches:** `Stats.tsx`, `roundHistory`, `ProgressTrendChart` or new accuracy chart.

---

### 13. Keyboard / visual polish pass

**Impact:** Medium · **Effort:** Medium

- Stronger caret animation on correct/miss (without layout shift — keep `PromptLine` measure/paint pattern)
- Mission-complete micro-celebration (combo flare, star pop)
- Consistent empty states (no stats yet, no drills unlocked)

**Touches:** `Keyboard.tsx`, `Results.module.css`, `Arena.module.css`, `tokens.css`.

---

### 14. Export / import progress

**Impact:** Medium (niche) · **Effort:** Low–medium

Let players back up `axitype.v1` as JSON or sync via file. No accounts required.

Include schema version validation on import — `ProgressState` shape will grow with new `coachPrefs` flags.

**Touches:** `storage.ts`, small UI in `LevelHub` or `Stats`.

---

### 15. Local instrumentation for success metrics

**Impact:** Medium (enables learning) · **Effort:** Low–medium

Success metrics below are mostly **not measurable today**. Add lightweight local events before optimizing gates:

- `roundStarted` / `roundCompleted` / `roundAbandoned` (Escape from arena)
- `drillStarted` with `source: "stats" | "results" | "hub"`
- `trackSwitched`

Store in `roundHistory` metadata or a small `analytics.v1` key. No third-party SDK required for v1.

**Touches:** `App.tsx`, `storage.ts`, optional `analytics.ts`.

---

## P3 — Strategic bets (later)

| Item | Impact | Effort | Notes |
|------|--------|--------|-------|
| Custom text / paste-your-own | Medium | Medium | Practice mode extension; charset filter |
| Daily challenge | Medium | Medium | One shared prompt per day, local best score |
| PWA / offline install | Low-medium | Low | Vite PWA plugin; already fully client-side |
| Accounts + cloud sync | High (if scaling) | High | Only if user base justifies it |
| Multiplayer / races | Medium | High | TypeRacer lane; different product direction |
| Mobile soft keyboard | Low | High | Touch typing tutor is desktop-first |

---

## Impact vs effort matrix

```
                    LOW EFFORT          HIGH EFFORT
                 ┌──────────────────┬──────────────────┐
    HIGH IMPACT  │ P0: Star rules   │ P1: Hybrid       │
                 │ P0: Track explainer│     prompts    │
                 │ P0: Retrain lock │ P1: Retrain intro│
                 │ P0: Miss summary │ P1: Drill mapping│
                 │ P0: Mission reqs │                  │
                 ├──────────────────┼──────────────────┤
    MED IMPACT   │ P0: Accuracy tip │ P2: Stats depth  │
                 │ P2: Export save  │ P2: Visual polish│
                 │ P2: Instrumentation│ P1: Timed practice│
                 │                  │ P3: Custom text  │
                 └──────────────────┴──────────────────┘
```

**Start here:** P0 items 1 → 4 → 5 → 6, then P1 item 7 (hybrid prompts).

---

## Suggested release slices

### v1.1 — “Know the rules”
- Results star breakdown + unlock / timed-out hints
- Hub track explainer
- HUD accuracy tooltip
- Mission unlock requirements on cards
- Retrain drill-gate messaging on locked missions
- Results miss summary (top keys this run)

### v1.2 — “Readable drills”
- Hybrid prompt system (per [hybrid-prompt-text.md](./plans/hybrid-prompt-text.md))
- Drill spacing fixes (Home Return, Alternating Hands) — ship with prompts, not later

### v1.3 — “Retrain matters”
- Retrain onboarding (extends v1.1 explainers)
- Full post-mission drill suggestions (P1 #9)
- Optional timed practice

### v1.4 — “Stickiness”
- Local instrumentation (P2 #15)
- Remaining stats depth (accuracy trend, best per level)
- Visual polish pass
- Export / import progress

---

## What not to build yet

- **Accounts / auth** — localStorage is fine until retention proves demand.
- **Leaderboards** — need audience first; daily local challenge is cheaper.
- **Full Keybr parity** — focus on form coaching, not letter-frequency heatmaps.
- **Rewriting the engine** — `TypingEngine` is solid; extend, don’t replace.
- **More than 12 missions** — fix prompt quality on existing levels before adding content.
- **Standalone first-run tutorial** — fold into P0 hub explainers unless playtesting shows a gap.

---

## Technical health (ongoing, not user-facing)

| Item | Priority | Notes |
|------|----------|-------|
| Component tests for `PromptLine`, `Results` | Medium | Layout regressions are costly |
| E2E smoke (Playwright): start → type → results | Medium | One happy path per track |
| `calcStars` / unlock / `stageLocked` integration test | Medium | Star rules + Retrain drill gate |
| `storage.test.ts` coverage for `aggregateMissCounts` | Low | Already started |
| Performance: chart sample rate vs history window | Low | 250ms / 240 samples is fine for now |

---

## Success metrics (how we know it’s working)

Requires P2 #15 instrumentation unless noted.

| Metric | Measurable today? | Notes |
|--------|-------------------|-------|
| Mission 1 completion rate | **No** | Needs `roundCompleted` events |
| Retry rate before unlock | **Partial** | Infer from `roundHistory` per `levelId` |
| Retrain track adoption | **Partial** | `progress.track` + drill badges in save |
| Drill usage from Stats / Results | **No** | Needs `drillStarted` with source |
| 3★ rate on late missions | **Yes** | `levelStars` / `roundHistory` |

---

## Related docs

- [Hybrid prompt text plan](./plans/hybrid-prompt-text.md) — detailed P1 prompt refactor
- [README](../README.md) — run scripts and feature summary

---

## Summary

AxiType’s path to a stronger v2 is not “more features.” It is:

1. **Tell players the rules** (P0 — including Retrain drill locks)
2. **Make missions readable and teach intentionally** (P1 prompts)
3. **Own the Retrain story** (P1 onboarding + miss coaching)

Do those three and the app moves from “solid side project” to “product I’d recommend to someone unlearning bad habits.”
