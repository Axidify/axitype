# AxiType — Product Roadmap

**Last updated:** July 2026  
**Current version:** v1.7.0  
**Status:** Released — paste-your-own practice.

---

## Current focus (v1.8 — candidates)

**Ship next:**

1. PWA / offline install

**Just shipped (v1.7 — Paste practice):**

- Hub → **Paste text** — paste or type your own prompt
- Strips keys outside unlocked charset (with warning), 12-char min, 2000-char cap
- Arena run with restart / Type again

**Previously shipped (v1.6.1 — Insights):**

- Stats → Insights (finish rate, drill sources, coaching tips from `axitype.analytics.v1`)
- Soft Focus accuracy / Daily prompt length when restart rates climb

**Previously shipped (v1.6 — Daily lane):**

- Daily challenge — date-seeded prompt, local best, hub entry, results callout
- Restart / `dailyPlayed` / `roundRestarted` analytics
- Roadmap + README synced to post–v1.5 reality

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

**Defer:** Accounts, leaderboards, achievements / streaks, new missions beyond 12, full Keybr analytics parity.

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
- **Stats** — time windows, miss heatmap, WPM + accuracy trends, best-by-mission, backup
- **Local progress** — `axitype.v1` + optional `axitype.analytics.v1`

**Core differentiator:** Retrain + Focus are not “hard mode.” They are structured paths for breaking bad habits — mandatory drills, stronger coaching, pace gates, Eyes Up, and weakness-targeted rehab.

**Positioning:** Stronger than most apps at habit rehab and form coaching; behind Keybr on per-key analytics depth and behind Monkeytype on speed-test variety / social features. Compete on Retrain / Focus, not breadth.

**Main gaps vs mature typing apps:** daily/recurring reason to return, custom/paste practice, PWA install, accounts/leaderboards (intentionally deferred).

**Progression scope:**

- **Missions** — star ratings and `unlockedLevel` (Learn: accuracy gate; Retrain: accuracy gate + drill badges between stages)
- **Practice / sprints** — no stars; unlocked key charset; Restart in arena for timed sprints only among practice modes
- **Drills** — Form badges on Retrain; suggested from Results / Stats
- **Focus / Gauntlet** — separate loops with their own pass rules and bests; Restart mid-run

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

---

## Guiding principles

1. **Explain the rules in-app** — players should never need to read source to understand stars, unlocks, or accuracy.
2. **Make Retrain / Focus the headline** — what Monkeytype and Keybr do not offer.
3. **Pedagogy before features** — readable drills beat random letter chains; see [hybrid-prompt-text.md](./plans/hybrid-prompt-text.md).
4. **Small, shippable slices** — each item below should be releasable on its own.
5. **Keep the codebase lean** — resist platform creep until the core loop is undeniable.
6. **Retention without bloat** — prefer daily challenge / useful practice over achievements, streaks, and XP walls.

**`coachPrefs` pattern:** New one-time flags merge via the same `loadProgress()` spread — don’t break saved games. Backup schema is `axitype.progress` v1 (`progressBackup.ts`). Extend that merge when adding `dailyBest`.

---

## Priority tiers

| Tier | Meaning | Target |
|------|---------|--------|
| **P0** | Highest ROI for the next release | v1.6 |
| **P1** | Core product bets after daily lane | Next 1–2 months |
| **P2** | Polish / retention follow-ons | When P0/P1 stable |
| **P3** | Strategic / audience-demand | Later |

---

## P0 — v1.6 Daily challenge ✅ shipped

Daily challenge loop is live in **v1.6.0**: date-seeded prompt, `dailyBest` on progress (merged in backup), hub entry, results best callout, `dailyPlayed` + `roundRestarted` analytics.

---

## P1 — After daily lane

### 2. Custom text / paste-your-own ✅ shipped (v1.7.0)

**Impact:** Medium · **Effort:** Medium

Hub → **Paste text** modal; normalizes line breaks, strips keys outside your unlocked charset (with warning), caps at 2000 chars, then runs in the arena with restart.

### 3. Extend existing hub explainers (only if needed)

**Impact:** Medium · **Effort:** Low

Not a new heavy tutorial — only if playtesting shows gaps after track explainer + RetrainIntro: tighten Learn/Retrain → ★★ unlock → Stats/Focus copy.

### 4. Instrumentation-backed tuning ✅ shipped (v1.6.1)

**Impact:** Medium · **Effort:** Low–medium

`summarizeAnalytics` → Stats Insights (finish rate, drill sources, tips) + soft length overrides for Focus accuracy / Daily prompts when restart rates climb. Further gate/copy tweaks still open once more play data exists.

---

## P2 — Nice polish

| Item | Notes |
|------|--------|
| PWA / offline install | Vite PWA plugin; already fully client-side |
| More Focus/Gauntlet UX polish | From playtesting |
| E2E smoke (Playwright) | start → type → results per track |

---

## P3 — Strategic bets (later)

| Item | Impact | Effort | Notes |
|------|--------|--------|-------|
| Accounts + cloud sync | High (if scaling) | High | Backup JSON is enough until demand |
| Leaderboards | Medium | High | Need audience; daily local best is cheaper |
| Achievements / streaks | Low–medium | Medium | Defer — retention theater |
| Multiplayer / races | Medium | High | Different product direction |
| Mobile soft keyboard | Low | High | Desktop-first touch typing |
| Missions beyond 12 | Low now | Medium | Deepen existing loop first |

---

## Suggested release slices

### v1.8 — *(next)*
- PWA install
- Further analytics-informed copy / gate tweaks

### Shipped

| Slice | Contents |
|-------|----------|
| **v1.7 Paste practice** | Hub paste modal, charset filter, arena restart |
| **v1.6.1 Insights** | Stats Insights + soft Focus/Daily length tuning |
| **v1.6 Daily lane** | Daily challenge + local best; restart analytics cleanup |
| **v1.5 Stickiness** | Polish, stats depth, instrumentation, backup, Restart |
| **v1.4 Focus** | Focus rehab + gates; Gauntlet coaching; v1.4.1 syllable prompts |
| **v1.3 Gauntlet** | Gauntlet, Escape, arena layout |
| **v1.2 Know the rules** | Clarity, hybrid prompts, Retrain onboarding, timed practice, miss coaching |

---

## What not to build yet

- **Accounts / auth** — localStorage + export/import until retention proves demand.
- **Leaderboards** — audience first; daily local challenge is cheaper.
- **Achievement / streak systems** — not the AxiType wedge.
- **Full Keybr parity** — own form coaching and Focus, not letter-frequency dashboards.
- **Rewriting the engine** — `TypingEngine` is solid; extend, don’t replace.
- **More than 12 missions** — deepen daily + Focus before adding content.
- **Heavy first-run tutorial** — keep extending existing explainers; don’t add a standalone onboarding product.

---

## Technical health (ongoing)

| Item | Priority | Notes |
|------|----------|-------|
| Component tests for `PromptLine`, `Results` | Medium | Layout regressions are costly |
| E2E smoke (Playwright) | Medium | One happy path per track |
| `calcStars` / unlock / `stageLocked` tests | Medium | Retrain drill gate |
| `storage` / backup / analytics tests | Low–medium | Started (`progressBackup`, `analytics`, `statsSummary`) |
| Chart sample rate vs history window | Low | Fine for now |

---

## Success metrics

Events live in `axitype.analytics.v1` (capped at 200). Progress outcomes still in `roundHistory` / `levelStars`.

| Metric | Measurable? | Notes |
|--------|-------------|-------|
| Mission completion / abandon | **Yes*** | `roundCompleted` / `roundAbandoned` — *Restart currently counted as abandon until fixed* |
| Drill CTA source mix | **Yes** | `drillStarted` with `hub` \| `stats` \| `results` |
| Retrain adoption | **Partial** | `trackSwitched` + save `track` / form badges |
| 3★ rate on late missions | **Yes** | `levelStars` / `roundHistory` |
| Round starts | **Yes** | `roundStarted` (not in product KPIs yet) |
| Daily challenge return (v1.6) | **After ship** | Date-keyed `dailyBest` + play events |

---

## Related docs

- [Hybrid prompt text plan](./plans/hybrid-prompt-text.md) — prompt system reference
- [README](../README.md) — run scripts and feature summary

---

## Summary

AxiType’s core story (rules clarity → readable missions → Retrain / Focus rehab) plus **Daily** retention, **Insights** tuning, and **paste practice** is shipped through **v1.7**.

**Next:** distribution (**PWA**) — without bolting on streaks, XP, or accounts.
