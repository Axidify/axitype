# AxiType — Product Roadmap

**Last updated:** July 2026  
**Current version:** v2.1.0  
**Status:** Released — Playwright E2E smoke for Learn and Retrain happy paths.

---

## Current focus (v2.2 — candidates)

**Ship next:**

1. Focus/Gauntlet UX polish from playtesting

**Deferred for now:** PWA / offline install; achievement catalogs / streaks / collection walls.

**Just shipped (v2.1 — E2E smoke):**

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

**Main gaps vs mature typing apps:** optional shared-device profiles; PWA install (deferred); accounts/leaderboards (intentionally deferred).

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

| Tier | Meaning | Target |
|------|---------|--------|
| **P0** | Highest ROI for the next release | v1.8 candidates below |
| **P1** | Core follow-ons | Hub polish, analytics copy |
| **P2** | Nice polish | E2E, Focus/Gauntlet UX, PWA |
| **P3** | Demand-gated / strategic | Cloud later |

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

### Analytics-informed copy / gate tweaks

**Impact:** Medium · **Effort:** Low

Insights + soft length tuning shipped in v1.6.1. Further gate/copy changes only when local play data justifies them.

---

## P1 / P2 — Polish

| Item | Notes |
|------|--------|
| More Focus/Gauntlet UX polish | From playtesting |
| E2E smoke (Playwright) | start → type → results per track |
| PWA / offline install | Deferred — revisit when distribution matters |

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

### v2.0 — *(next)*
- Insights-driven copy / gate tweaks

### Later
- PWA / offline install (when distribution matters)

### Shipped

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

| Item | Priority | Notes |
|------|----------|-------|
| Component tests for `PromptLine`, `Results` | Medium | Layout regressions are costly |
| E2E smoke (Playwright) | Medium | One happy path per track |
| `calcStars` / unlock / `stageLocked` tests | Medium | Retrain drill gate |
| `storage` / backup / analytics tests | Low–medium | Started (`progressBackup`, `analytics`, `statsSummary`, `pastePractice`) |
| Chart sample rate vs history window | Low | Fine for now |

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

AxiType’s core story plus **Daily**, **Insights**, **paste practice**, **local profiles**, **practice setup**, **milestone surfacing**, and a **compact hub** is shipped through **v1.9.1**.

**Next:** Insights-driven copy / gate tweaks when play data justifies them. **Not next:** PWA, achievement catalogs, streaks, or collection walls. Cloud accounts can sync the same `axitype.profile` bundle later.
