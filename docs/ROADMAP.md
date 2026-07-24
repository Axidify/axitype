# AxiType — Product Roadmap

**Last updated:** July 2026  
**Current version:** v2.10.0  
**Status:** Released — LevelHub hierarchy polish from playtest feedback.

---

## Current focus (v3.0 — candidates)

**Ship next:**

1. Insights-driven copy tweaks or broader playtest polish

**Deferred for now:** PWA / offline install; achievement catalogs / streaks / collection walls.

**Just shipped (v2.10 — LevelHub polish):**

- Current mission highlight (accent border + Current badge)
- Collapse chevrons on Rules & settings / Habit drills
- Colored stars, lock icons on locked rows, Form ✓ tooltip
- Practice modes label to separate chips from Learn/Retrain

**Previously shipped (v2.9 — Focus polish):**

- FocusGate Space/Escape shortcuts + kbd hint on primary CTA
- Speed tier progress copy (`Speed tier N of 3 cleared`)
- Focus full-session E2E — accuracy + 3 speed tiers → Rehab complete Results
- FocusGate component tests

**Previously shipped (v2.8 — lint cleanup):**

- Cleared all oxlint warnings (regex escapes, hook deps, Stats insights memo)
- `npm run lint` exits clean with no warnings

**Previously shipped (v2.7 — E2E depth):**

- Focus speed round — hub → accuracy → speed round → tier gate
- Gauntlet fail path — low-accuracy wave → Results coaching
- Shared hub helpers: `startFocusFromHub`, `startGauntletFromHub`, `typeArenaPromptWithMisses`

**Previously shipped (v2.6 — component tests):**

- `PromptLine` component tests — aria-label, paint layer, caret/miss states
- `Results` component tests — mission, Focus, Daily, Gauntlet copy and keyboard shortcuts
- `progression.ts` — extracted Retrain drill gate helpers + unit tests
- Vitest setup for jsdom component specs (`*.test.tsx`)

**Previously shipped (v2.5 — E2E full hub):**

- Daily smoke — hub → challenge → Results
- Practice smoke — hub → setup modal → Results
- Paste smoke — hub → paste modal → Results
- Hub navigation helpers for modal flows

**Previously shipped (v2.4 — CI):**

- GitHub Actions workflow on `master` push/PR — lint, Vitest, build, Playwright smoke
- `npm run ci` local parity script (lint → unit → build → e2e)

**Previously shipped (v2.3 — E2E expansion):**

- Focus smoke — hub → accuracy round → FocusGate speed transition
- Gauntlet smoke — hub → wave 1 clear → wave 2 coach strip
- Shared arena helpers split (`passHomeCheckIfNeeded`, `typeArenaPrompt`)

**Previously shipped (v2.2 — Focus/Gauntlet UX):**

- Focus failure hints surface before auto-retry (was silent)
- Gauntlet Arena shows per-wave accuracy gate (+ timer when timed)
- Focus hub tooltip includes rehab reason and phase structure
- FocusGate CTAs clarify speed transition and tier progression
- Focus Results use session title, honest retry count, “Rehab complete” kicker

**Previously shipped (v2.1 — E2E smoke):**

- Playwright config with dev-server bootstrap (`npm run test:e2e`)
- Demo-seeded Learn track: hub → Continue mission → type prompt → Results
- Demo-seeded Retrain track: same happy path after track switch

**Previously shipped (v2.0 — Insights coaching):**

- Practice prompt length eases when restart rate climbs (like Focus/Daily)
- Hub surfaces top warn-style insight from play analytics (non-demo)
- Mission Results adds finish-rate coaching when accuracy gate fails
- Focus speed gate nudge when overall finish rate is shaky
- Stats tuning note includes Practice length scale

**Previously shipped (v1.9.1 — Hub menu):**

- Compact hub header — brand + Stats/Profile top bar, play card with track + Continue
- Single-row mode pills (Practice, Paste, Daily, Focus, Gauntlet)
- Rules & settings + habit drills collapsed into `<details>` (drills auto-open when required)
- Fix Retrain milestone “next drill” hint when mission is drill-gated

**Previously shipped (v1.9 — Practice + milestones):**

- Hub **Practice…** modal — duration (short/long + timed sprints) and focus (all, weak finger, rows, hands, alternating, one finger)
- Weak finger uses recent-round misses with lifetime fallback; honest target hint in modal
- Hub milestone strip — Form badge progress (Retrain) or star summary (Learn); richer Daily/Gauntlet PB labels
- Results milestone copy — star earned / three stars, mission PB, Form badge earned, Gauntlet gap-to-best

**Previously shipped (v1.8 — Local profiles):**

- Hub profile switcher — create / rename / switch / delete (max 5)
- Store `axitype.profiles.v1` with UUID ids; per-profile progress + analytics
- Migrate legacy `axitype.v1` → profile “Player”
- Export/import `axitype.profile` bundles (cloud sync unit)

**Previously shipped (v1.7 — Paste practice):**

- Hub → **Paste text** — paste or type your own prompt
- Strips keys outside unlocked charset (with warning), 12-char min, 2000-char cap
- Arena run with restart / Type again

**Previously shipped (v1.6.1 — Insights):**

- Stats → Insights (finish rate, drill sources, coaching tips from `axitype.analytics.v1`)
- Soft Focus accuracy / Daily prompt length when restart rates climb

**Previously shipped (v1.6 — Daily lane):**

- Daily challenge — date-seeded prompt, local best, hub entry, results callout
- Restart / `dailyPlayed` / `roundRestarted` analytics

**Previously shipped (v1.5 — Stickiness):**

- Visual polish (caret / hit / miss / combo; Results + Focus gate micro-celebration)
- Stats depth (WPM + accuracy trends, window averages + early/late delta, best-by-mission, smarter drill CTA)
- Local instrumentation (`axitype.analytics.v1`)
- Progress export / import (Stats → Backup)
- Arena Restart for timed sprints, Gauntlet, Focus (not campaign missions)

**Earlier:**

| Version | Theme |
|---------|--------|
| v1.4.1 | Focus syllable-shaped prompts |
| v1.4.0 | Focus mode + progress gates; Gauntlet results coaching |
| v1.3 | Gauntlet, Escape to hub, arena layout |
| v1.2 | Clarity, hybrid prompts, Retrain onboarding, timed practice, miss coaching |
| v1.1 | Wider layout + labeled WPM chart |

**Defer:** PWA / offline install, cloud accounts, leaderboards, achievement catalogs / streak counters / collection walls, new missions beyond 12, full Keybr analytics parity.

---

## Where we are today

AxiType is a browser-based touch typing tutor with:

- **Learn / Retrain tracks** — different coaching intensity and progression gates
- **12 campaign missions** + **5 habit drills**
- **Focus mode** — data-driven rehab (accuracy → speed tiers), unlock preview on hub, syllable-shaped prompts
- **Gauntlet** — endless escalating waves with personal best + results coaching
- **Form Coach** — hand diagram, finger chip, home-row check, miss tips
- **Hybrid prompts** — placement chunks (1–4), pseudo-words (5–9), sentences (10–12)
- **Live WPM sparkline**, combo scoring, pace gating (Retrain)
- **Timed sprints** (60s / 90s), **demo mode**, **Escape → hub** from arena / results / stats
- **Drills** — Form badges on Retrain; return-to-mission after rehab from Results; suggested from Results / Stats
- **Daily challenge** + **paste-your-own practice**
- **Stats** — time windows, miss heatmap, WPM + accuracy trends, best-by-mission, Insights, backup
- **Local progress** — `axitype.v1` + optional `axitype.analytics.v1`

**Core differentiator:** Retrain + Focus are not “hard mode.” They are structured paths for breaking bad habits — mandatory drills, stronger coaching, pace gates, Eyes Up, and weakness-targeted rehab.

**Positioning:** Stronger than most apps at habit rehab and form coaching; behind Keybr on per-key analytics depth and behind Monkeytype on speed-test variety / social features. Compete on Retrain / Focus, not breadth.

**Main gaps vs mature typing apps:** PWA install (deferred); accounts/leaderboards (intentionally deferred). Local profiles shipped in v1.8.

**Progression scope:**

- **Missions** — star ratings and `unlockedLevel` (Learn: accuracy gate; Retrain: accuracy gate + drill badges between stages)
- **Practice / sprints / paste** — no stars; unlocked key charset; Restart where supported
- **Drills** — Form badges on Retrain; suggested from Results / Stats
- **Focus / Gauntlet / Daily** — separate loops with their own pass rules and bests

---

## Completed (shipped)

| Item | Version | Notes |
|------|---------|-------|
| Prompt layout (`PromptLine` measure/paint) | early | No reflow on wrap |
| Per-round `missCounts` + Stats windows | early | Last 12 / 7 days / all time |
| Finger-zone miss heatmap | early | `MissedKeysHeatmap` |
| Results star breakdown + unlock hints | **v1.2** | `explainStars` |
| Hub Learn/Retrain explainer + drill-gate copy | **v1.2** | |
| HUD accuracy tooltip | **v1.2** | |
| Hybrid readable prompts | **v1.2** | chunks / pseudo / sentences |
| Retrain onboarding | **v1.2** | `RetrainIntro` |
| Results miss coaching + `suggestDrill()` | **v1.2** | Stats CTA uses same helper in **v1.5** |
| Timed practice 60s / 90s + demo mode | **v1.2** | |
| Return-to-mission after drills | **v1.2** | |
| Gauntlet + Escape to hub | **v1.3** | |
| Focus mode + progress gates | **v1.4** | Hub preview / unlock gating |
| Gauntlet results coaching | **v1.4** | Gap tips on fail |
| Focus syllable-shaped prompts | **v1.4.1** | |
| Visual polish pass | **v1.5** | Arena feedback + Results/FocusGate motion |
| Stats depth (accuracy trend, best-by-mission) | **v1.5** | Window averages + early/late delta |
| Local instrumentation | **v1.5** | `src/lib/analytics.ts` |
| Progress export / import | **v1.5** | `src/lib/progressBackup.ts` |
| Challenge Restart (sprints / Gauntlet / Focus) | **v1.5** | Not campaign missions |
| Daily challenge | **v1.6** | Local best per day |
| Instrumentation-backed Insights | **v1.6.1** | Soft Focus/Daily length tuning |
| Paste-your-own practice | **v1.7** | Charset filter + arena restart |
| Local profiles | **v1.8** | Hub switcher, per-profile analytics, profile export |
| Practice setup modal | **v1.9** | Duration + focus chips; weak finger from recent misses |
| Hub/Results milestone surfacing | **v1.9** | Form badges, star deltas, PB callouts — no trophy catalog |
| Compact hub menu | **v1.9.1** | Play card, mode pills, collapsible rules/drills |
| Insights-driven coaching copy | **v2.0** | Hub warn, mission finish-rate, Focus speed nudge |
| E2E smoke (Playwright) | **v2.1–v2.7** | Learn/Retrain, Focus, Gauntlet, Daily, Practice, Paste; CI in v2.4 |
| Focus/Gauntlet UX polish | **v2.2** | Failure hints, wave gate strip, gate copy, Results recap |
| Component + progression tests | **v2.6** | `PromptLine`, `Results`, `progression.ts` |
| Lint + Focus gate polish | **v2.8–v2.9** | Zero-warning oxlint; FocusGate shortcuts, tier copy, full-session E2E |
| LevelHub hierarchy polish | **v2.10** | Current mission highlight, chevrons, colored stars, locks, Form tip |

---

## Guiding principles

1. **Explain the rules in-app** — players should never need to read source to understand stars, unlocks, or accuracy.
2. **Make Retrain / Focus the headline** — what Monkeytype and Keybr do not offer.
3. **Pedagogy before features** — readable drills beat random letter chains; see [hybrid-prompt-text.md](./plans/hybrid-prompt-text.md).
4. **Small, shippable slices** — each item below should be releasable on its own.
5. **Keep the codebase lean** — resist platform creep until the core loop is undeniable.
6. **Retention without bloat** — prefer Daily / useful practice / Form badges over achievement catalogs, streak counters, and XP walls.

**`coachPrefs` pattern:** New one-time flags merge via the same `loadProgress()` spread — don’t break saved games. Backup schema is `axitype.progress` v1 (`progressBackup.ts`). Bump export version when the save shape changes (profiles, habit fields, etc.).

---

## Priority tiers

| Tier | Meaning | Status (July 2026) |
|------|---------|-------------------|
| **P0** | Core product + shared-device | **Done** — profiles, milestones, insights baseline |
| **P1** | Hub/mode polish, analytics copy | **Mostly done** — v2.x closed E2E, Focus/Gauntlet, component tests |
| **P2** | CI, test depth, installability | **CI + tests done**; PWA deferred |
| **P3** | Demand-gated / strategic | Deferred — achievements, cloud, leaderboards |

---

## Plan status (July 2026)

**Product vision for v1.x–v2.x: feature-complete.** Learn/Retrain campaign, all hub modes, profiles, Insights, and milestone surfacing are shipped.

**Quality bar for v2.x: met.** GitHub Actions CI, 153 unit/component tests, 10 E2E smoke specs (all hub modes + Focus depth + Gauntlet fail), zero lint warnings.

**Only active P0 tail:** analytics-informed copy / gate tweaks when local play data justifies more (v3.0 candidate — not a greenfield feature).

**Explicitly not planned near-term:** PWA, achievement catalogs, streaks, cloud accounts, leaderboards, missions beyond 12.

---

## P0 — v1.8 candidates

### Thin local profiles ✅ shipped (v1.8.0)

**Impact:** Medium (shared devices) · **Effort:** Medium  
**When:** Shared-machine demand — **not** bundled with achievements.

**Shipped shape:**

- Store `axitype.profiles.v1` — `{ activeProfileId, profiles[] }` with stable UUID ids
- Each profile holds `progress` + `analytics` (cloud sync unit)
- One-time migrate `axitype.v1` (+ legacy analytics) → profile “Player”
- Hub: create / rename / switch / delete (max 5; keep ≥1)
- Export active profile as `axitype.profile` v1; import replaces active (or full store)
- **Cloud later** = auth + sync the same profile bundle — no second format

**Do not** ship an achievement catalog in the same release as profiles.

### Hub / Results milestone surfacing ✅ shipped (v1.9.0)

**Impact:** Medium · **Effort:** Low

Surfaced existing milestones in Hub/Results — Form badges, star deltas, mission PBs, Daily/Gauntlet PB labels, Gauntlet gap-to-best. No trophy catalog.

### Analytics-informed copy / gate tweaks *(partial — v3.0)*

**Impact:** Medium · **Effort:** Low

**Shipped baseline:** v1.6.1 soft length tuning; v2.0 hub warn, mission finish-rate coaching, Focus speed nudge, Practice length scale in Stats.

**Still open:** further gate/copy changes only when local play data justifies them — no standing backlog until playtesting or analytics surfaces a gap.

---

## P1 / P2 — Polish

| Item | Status | Notes |
|------|--------|-------|
| Focus/Gauntlet UX polish | ✅ **v2.2, v2.9** | Failure hints, wave strip, gate copy, shortcuts, tier progress |
| LevelHub hierarchy polish | ✅ **v2.10** | Current mission, chevrons, stars, locks, Form tip, Practice modes label |
| E2E smoke (Playwright) | ✅ **v2.1–v2.7** | 10 specs — all hub modes + Focus full session + Gauntlet fail |
| GitHub Actions CI | ✅ **v2.4** | `npm run ci` local parity |
| Component / progression tests | ✅ **v2.6** | `PromptLine`, `Results`, `stageLocked` |
| Lint clean | ✅ **v2.8** | Zero oxlint warnings |
| PWA / offline install | ⏸ Deferred | Revisit when distribution matters |

---

## P3 — Achievements deferred + strategic

### Achievements / streaks / collection — deferred

Audited July 2026: a catalog + streak counters + trophy wall conflicts with Form badges (already gate Retrain), Daily messaging (“without streaks or XP”), and current data (`dailyBest` is today-only; `roundHistory` capped at 40 — streaks need new durable fields).

| Want | Better AxiType move |
|------|---------------------|
| Milestone feel | Celebrate existing Form badges / unlocks / Daily / Gauntlet PB in Results/Hub |
| Skill badges | Keep Form badges as the skill system — don’t duplicate |
| Streaks | Only if Daily return stalls; add durable habit fields, not a trophy wall |
| Collection wall | Defer — highest theater / lowest coaching ROI |
| Cloud accounts | After local profiles prove needed; backup JSON remains the portability path |

### Other P3

| Item | Impact | Effort | Notes |
|------|--------|--------|-------|
| Accounts + cloud sync | High (if scaling) | High | After thin local profiles; same bundle |
| Leaderboards | Medium | High | Need audience; daily local best is cheaper |
| Multiplayer / races | Medium | High | Different product direction |
| Mobile soft keyboard | Low | High | Desktop-first touch typing |
| Missions beyond 12 | Low now | Medium | Deepen existing loop first |

---

## Suggested release slices

### v3.0 — *(next candidate)*
- Insights-driven copy / gate tweaks when play data warrants
- Broader playtest polish (no fixed backlog)

### Later
- PWA / offline install (when distribution matters)
- P3 items (cloud, leaderboards, achievements) — demand-gated only

### Shipped (v2.x)

| Slice | Contents |
|-------|----------|
| **v2.10 LevelHub polish** | Current mission highlight, collapse chevrons, colored stars, lock icons, Form tip, Practice modes label |
| **v2.9 Focus gate** | Shortcuts, tier copy, full-session E2E, FocusGate tests |
| **v2.8 Lint** | Zero-warning oxlint pass |
| **v2.7 E2E depth** | Focus speed round, Gauntlet fail path |
| **v2.6 Component tests** | `PromptLine`, `Results`, `progression.ts` |
| **v2.5 E2E hub** | Daily, Practice, Paste smoke |
| **v2.4 CI** | GitHub Actions + `npm run ci` |
| **v2.3 E2E** | Focus + Gauntlet smoke |
| **v2.2 Focus/Gauntlet UX** | In-run coaching, gate copy, Results recap |
| **v2.1 E2E** | Learn + Retrain smoke, Playwright bootstrap |
| **v2.0 Insights coaching** | Analytics-informed hub/mission/Focus copy |

### Shipped (v1.x)

| Slice | Contents |
|-------|----------|
| **v1.9.1 Hub menu** | Compact header, mode pills, collapsible rules/drills |
| **v1.9 Practice + milestones** | Practice setup modal, weak-finger hints, Hub/Results milestone surfacing |
| **v1.8 Local profiles** | UUID store, per-profile analytics, hub switcher, profile export |
| **v1.7 Paste practice** | Hub paste modal, charset filter, arena restart |
| **v1.6.1 Insights** | Stats Insights + soft Focus/Daily length tuning |
| **v1.6 Daily lane** | Daily challenge + local best; restart analytics cleanup |
| **v1.5 Stickiness** | Polish, stats depth, instrumentation, backup, Restart |
| **v1.4 Focus** | Focus rehab + gates; Gauntlet coaching; v1.4.1 syllable prompts |
| **v1.3 Gauntlet** | Gauntlet, Escape, arena layout |
| **v1.2 Know the rules** | Clarity, hybrid prompts, Retrain onboarding, timed practice, miss coaching |

---

## What not to build yet

- **PWA / offline install** — deferred for now; revisit when installability matters.
- **Achievement catalogs / streak counters / collection walls** — Form badges + Daily + Focus already own progression theater; don’t add a second trophy layer.
- **Cloud accounts / auth** — localStorage + export/import until shared-device or multi-device demand is proven; if profiles ship first, keep them local-only.
- **Leaderboards** — audience first; daily local challenge is cheaper.
- **Full Keybr parity** — own form coaching and Focus, not letter-frequency dashboards.
- **Rewriting the engine** — `TypingEngine` is solid; extend, don’t replace.
- **More than 12 missions** — deepen Daily + Focus before adding content.
- **Heavy first-run tutorial** — keep extending existing explainers; don’t add a standalone onboarding product.

---

## Technical health (ongoing)

| Item | Priority | Status |
|------|----------|--------|
| Component tests for `PromptLine`, `Results` | Medium | ✅ v2.6 |
| E2E smoke (Playwright) | Medium | ✅ 10 specs — all hub modes + Focus/Gauntlet depth (v2.1–v2.7, v2.9) |
| `calcStars` / unlock / `stageLocked` tests | Medium | **Partial** — `calcStars` in `engine.test.ts`; `stageLocked` in `progression.test.ts` |
| `storage` / backup / analytics tests | Low–medium | **Partial** — `progressBackup`, `analytics`, `statsSummary`, `pastePractice` |
| Chart sample rate vs history window | Low | Fine for now |
| Lint (oxlint) | Medium | ✅ Zero warnings (v2.8) |
| CI on `master` | Medium | ✅ lint → unit → build → e2e (v2.4) |

---

## Success metrics

Events live in `axitype.analytics.v1` (capped at 200). Progress outcomes still in `roundHistory` / `levelStars`.

| Metric | Measurable? | Notes |
|--------|-------------|-------|
| Mission completion / abandon | **Yes** | `roundCompleted` / `roundAbandoned`; Restart uses `roundRestarted` |
| Drill CTA source mix | **Yes** | `drillStarted` with `hub` \| `stats` \| `results` |
| Retrain adoption | **Partial** | `trackSwitched` + save `track` / form badges |
| 3★ rate on late missions | **Yes** | `levelStars` / `roundHistory` |
| Round starts | **Yes** | `roundStarted` |
| Daily challenge return | **Yes** | Date-keyed `dailyBest` + `dailyPlayed` |
| Paste practice adoption | **Partial** | `roundStarted` with `levelId: "paste"` |

---

## Related docs

- [Hybrid prompt text plan](./plans/hybrid-prompt-text.md) — prompt system reference
- [README](../README.md) — run scripts and feature summary

---

## Summary

AxiType’s **v1.x product plan is complete** through **v1.9.1** (campaign, all hub modes, profiles, Insights, milestones, compact hub).

The **v2.x quality plan is complete** through **v2.10.0** (CI, 153 unit tests, 10 E2E specs, component tests, lint clean, Focus + LevelHub polish).

**Next (v3.0):** insights-driven copy / gate tweaks when play data warrants, plus ad-hoc playtest polish — no fixed feature backlog.

**Not next:** PWA, achievement catalogs, streaks, collection walls, cloud accounts, or leaderboards. Cloud sync can reuse the `axitype.profile` bundle when/if demand appears.
