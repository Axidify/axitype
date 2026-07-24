# AxiType

A browser typing game that teaches touch typing — including a **Retrain** track for breaking bad habits.

## Run

```bash
npm install
npm run dev
```

On your home Wi‑Fi, open the **Network** URL Vite prints (e.g. `http://192.168.x.x:5173`) from another device.

### Cursor Ports (internet)

1. Run `npm run dev` and confirm it listens on port **5173**.
2. Open the **Ports** panel in Cursor — port 5173 should appear (or add it manually).
3. Set visibility to **Public** (not Private) and open the forwarded HTTPS URL Cursor gives you.

If the page is blocked with “host is not allowed”, restart dev after pulling — `vite.config.ts` sets `server.allowedHosts: true` for tunnel hostnames. Dev-only; do not use that setting in production builds.

## Scripts

- `npm run dev` — local app
- `npm run build` — production build
- `npm test` — Vitest unit tests
- `npm run test:e2e` — Playwright smoke (all 7 hub modes)
- `npm run ci` — full local CI (lint, unit, build, e2e)

## Roadmap

See [docs/ROADMAP.md](docs/ROADMAP.md) for priorities. **Current focus:** Further polish / deeper E2E (PWA / achievements deferred).

## What’s included

- Learn / Retrain tracks with Form Coach (hand diagram, finger chip, reach cues)
- 12 campaign missions + habit drills (One Finger, Home Return, Alternating Hands, Eyes Up, Weak Finger)
- Focus rehab + Gauntlet waves; timed sprints; Daily challenge; paste-your-own practice; configurable Practice setup; Stats Insights + progress backup
- Local profiles (`axitype.profiles.v1`) — multiple named saves on one device
- Live WPM sparkline (AxiCharts)
- Adaptive weak-key prompts