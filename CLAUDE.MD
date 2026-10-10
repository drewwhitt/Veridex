# CLAUDE.md — Veridex

Context file for working on this project. Based on the repo snapshot as of **2026-10-09** (`main`, last commit `1ac489d` on 2026-09-21, 197 commits total, plus uncommitted-to-snapshot TS6133 cleanup and NFL admin/home fixes pending commit).

---

## 1. What Veridex is

- Sports predictive analytics and forecasting platform. Positioning: a "Bloomberg Terminal for sports," with an editorial/newspaper visual identity (the "Broadsheet" design system).
- Solo-built and owned by Drew (GitHub `drewwhitt`).
- Live at `veridex-sports.vercel.app`. Repo: `drewwhitt/World-Cup-Predictor` (the name is historical; the project has outgrown it).
- **Product philosophy (owner-stated, treat as a constraint):** "Quick insights, actionable widgets." Features must feel fast. Anything that blocks the UI for several seconds does not ship to the live nav.
- **Current focus (Oct 2026):** NFL. Soccer, Formula 1, and MLB are being hidden or marked "coming soon" so the nav centers on NFL, then NBA and NHL.

## 2. Status at a glance

| Area | State |
|---|---|
| FIFA World Cup 2026 | **Complete.** Spain won; simulation locked at 100%. Tournament views use retrospective language. Hero and home headlines still read World Cup data. |
| NFL 2026 | **Partially live.** Manual admin score entry, standings, schedule, and Elo-based rankings and forecasts are built. Admin panel now defaults to the next unscored week. Home NFL card shows the latest scored week. Score ingestion automation is not deployed. |
| Fantasy football (PPR redraft) | **Built and most active workstream.** Simulation engine, rankings import, and board view exist. Calibration is short of target. |
| Daily automation | **Live.** Vercel cron snapshots odds and publishes the morning briefing daily at 09:00 UTC. |
| NBA / NHL / MLB / MLS | Infrastructure planned; not built. |
| Live score ingestion (The-Odds-API) | Designed, **not deployed** (no `api/ingest-live-scores.ts` in repo). Needs `ODDS_API_KEY`. |

## 3. Stack and repo layout

- **Frontend:** React 19, TypeScript, Vite 6, CSS Modules (hand-rolled, no component library, no charting library; SVG drawn by hand).
- **Backend:** Vercel serverless functions (`api/`) and cron. Supabase (Postgres) for match results.
- **Other:** `@vercel/analytics`; Microsoft Clarity; nflverse data (schedules, history); eloratings.net snapshots.
- **Layout:**
  - `src/App.tsx`: tab routing (hash-based), data loading, admin panel gate (`?admin=true`).
  - `src/views/*/`: one folder per tab (`.tsx` + `.module.css`).
  - `src/components/`: shell (nav, masthead, ticker), admin panels, shared UI, `nfl/NflPreview`.
  - `src/lib/`: engines and logic (see §4).
  - `src/data/`: live builders plus static JSON (fixtures, baselines, NFL schedule, fantasy forecasts).
  - `src/insights/`: statically generated methodology and SEO pages (built by `scripts/generate-insights.tsx` during `npm run build`).
  - `api/save-result.ts`: the only write path to Supabase.
  - `api/cron-snapshot.ts`: daily snapshot and briefing job.
  - `scripts/`: baseline generators, forecast generators, backtests, calibration.
- **Tabs (routes, from `App.tsx`):** `home`, `forecasts`, `rankings`, `analytics`, `standings`, `bracket` (World Cup); `nflSchedule`, `nflRankings`, `nflStandings`, `nflForecasts`, `nflFantasy`.
- **Scripts:** `npm run dev`, `npm run build` (`vite build` then insights), `npm run generate-baseline`, `npm run generate-insights`. There is **no test script**; verification is done with standalone `tsx` scripts.

## 4. Engine architecture

**Soccer / World Cup**
- `src/lib/elo.ts`: Elo engine. K = 40, home advantage 100 (host nations only, in genuine home fixtures), log-scale margin-of-victory multiplier, draw handling. Draws use multiplier 1 on purpose: draws have no margin, so margin-based dampening under-weights upsets.
- `src/lib/simulate.ts`: Monte Carlo tournament simulation, 10,000 runs. Every probability in the app comes from here.
- `src/lib/bracket.ts`, `src/lib/bracketTree.ts`: `bracketTree.ts` is the **single source of truth** for knockout topology (`KNOCKOUT_STRUCTURE`). Views read status from shared functions to avoid cross-tab inconsistency.
- `src/lib/teams.ts`: 48 teams, calibrated base Elos, confederation offsets (applied on top of base, never baked in).
- `src/lib/periods.ts`, `src/lib/matchCenter.ts`: sport-agnostic "period" system (Matchday/Round for soccer, Weeks/Playoffs for NFL). Current period is **completion-based**, not calendar-based, to match the admin's manual entry workflow.
- `src/lib/drivers.ts`: counterfactual driver attribution ("why this number").
- `src/lib/snapshots.ts`: daily probability snapshots to Supabase.

**Multi-sport core (new direction)**
- `src/lib/engine/core/EloEngine.ts`, `SportConfig.ts`: universal engine.
- `src/lib/engine/sports/NFL.ts`: NFL specifics. QB backup penalty (120 points, validated on a 7,000+ game backtest), divisional variance flattening, season mean reversion, EPA-blended updates.
- `src/lib/engine/sports/Soccer.ts`, `nflSeasonSim.ts`.

**NFL (live layer)**
- `src/data/nfl/nflLive.ts`: builders for standings, match center, and teams. Also `getNflWeekProgress(stored)` and `getNextNflWeek(stored)`, which drive the admin panel's default week.
- `src/data/nfl/eloLive.ts`: live Elo updated from actual results.
- `src/data/nfl/forecastLive.ts`: live Monte Carlo (5,000 sims) for projected wins, playoff, division, conference, and Super Bowl odds.
- `src/data/nfl/nflLiveUpdates.ts`: NFL breaking-ticker text.
- `src/components/nfl/NflPreview.tsx`: home-page NFL card. Shows the latest week with scores (falls back to a "no scores yet" line).
- `src/components/admin/AdminNflResultsPanel.tsx`: admin score entry. Opens on the next unscored week; stops auto-advancing once the admin picks a week by hand.
- Stored result keys are schedule IDs in the form `2026_WW_AWAY_HOME` (e.g. `2026_01_NE_SEA`). The Supabase write adds an `nfl-` prefix.
- Rating display formula: `50 + (elo − 1500) / 3`, clamped 0–100 (1500 Elo = 50, 1700 = 100). **This formula is duplicated** in `nflLive.ts` and `NFLRankingsView.tsx`.
- Data: `schedule-2026.json` (weeks 1–18 plus playoff bracket), `baseline-2026.json` (starting Elos), `historical-games.json`.

**Fantasy football**
- `src/lib/fantasy/`: `simulate.ts` (Monte Carlo), `curveFit.ts` (bootstrap resampling from real historical games/points pairs, no parametric distribution), `replacementLevel.ts` (VBD, correlated draws to avoid systematic RB undervaluation), `nameMatching.ts` (tiered matcher; initial and surname matches require admin confirmation), `rankings.ts` (versioned consensus snapshots), `precomputed.ts` (fast path).
- Data: 27 seasons of historical player data, ADP 2020 and 2021–2024 (`adp-vs-actual-*.json`), precomputed standard forecasts for 8, 10, 12, and 14-team leagues.
- View: `src/views/FantasyView/FantasyView.tsx` (~460 lines): league config, sortable table with ADP range, Model Rank shown independent of ADP, VBD in a dropdown, collapsible Biggest Values and Fades, raw range bar (10th–90th percentile).

## 5. Data flow and security

- **Reads:** the browser reads `match_results` from Supabase via the public anon key (`VITE_SUPABASE_ANON_KEY`). Those keys are public by design. Local results are cached in `localStorage`.
- **Writes (intended):** admin panel → `callSaveResultApi` → `api/save-result.ts`, which uses the service-role key (server-side only) and checks `ADMIN_WRITE_SECRET`. Required Vercel env vars: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_WRITE_SECRET`. None of these are prefixed `VITE_`.
- **Goal:** RLS on `match_results` with a public SELECT-only policy, so the anon key cannot write. **Status of RLS in the live Supabase project is not verified from the repo.**
- **Cron:** `vercel.json` runs `/api/cron-snapshot` daily at `0 9 * * *` UTC. It requires `Authorization: Bearer $CRON_SECRET` (a separate secret).
- **Match ID formats:** World Cup uses `g-{GROUP}-{index}` and knockout IDs. NFL results are stored under schedule IDs (`2026_WW_AWAY_HOME`) with an `nfl-` prefix in Supabase. The save path routes by prefix.
- **Admin access:** `?admin=true` reveals three panels: World Cup results, NFL results, and fantasy rankings import. The URL gate is UI-only, not access control; the real control is the write secret.

## 6. Working conventions (owner's rules)

- **Before delivering any code change:** run `npx tsc --noEmit` and `npm run build`. A clean build is the minimum bar, not proof of correctness.
- **For anything computational** (Elo, probabilities, bracket structure, fantasy calibration, NFL week logic): write a small test script, run it against real data, and show actual output before claiming a fix works. This has caught real bugs that read fine on inspection.
- **Bracket changes:** verify the full cascade (R32→R16→QF→SF) against `KNOCKOUT_STRUCTURE`'s actual `home`/`away` feeders with a script. `BracketView.tsx` (`R32_MATCHUPS`) and `WhatIfBracket.tsx` (`R32_IDS`) keep their own arrays for rendering and have been wrong several times.
- **Delivery format (current, Oct 2026):** Claude does **not** edit the local repo. Claude provides full, paste-ready file contents or exact line-level replacements; the owner pastes them into the local repo on Windows, runs the verify commands, then commits and pushes. Use `git add -A` before `git commit` (a bare `git commit` only commits staged files).
- **Two machines** (desktop and laptop). Always `git pull` before starting a session. Divergence has caused conflicts before.
- **Explanations:** plain-language *why*, not just *what*. Owner is comfortable running terminal commands when given exact copy-paste text.
- **Commit attribution:** commit messages end with `Co-Authored-By: Claude Haiku 5.5 <noreply@anthropic.com>` and the session link line `Claude-Session: https://claude.ai/code/session_018cRyh8SLDaSt38jABEkFM6`.
- **Don't assume code is live.** Check `App.tsx` wiring before treating a view as active.

## 7. Known bug classes (watch for these)

1. **Bracket feeder mismatch:** rendering arrays drifting from `KNOCKOUT_STRUCTURE`.
2. **Headline text not matching data:** hardcoded rank words ("Sits Second") applied to whichever team is selected. Derive wording from computed values.
3. **Mock data as default props:** `component({ prop = mockData })` silently renders fake content if callers stop passing real data. Make props required.
4. **Group `matchday` is a tournament-wide counter (1–17ish)**, not per-group round. Derive per-group rounds by sorting each group's six matches by date.
5. **Probability math must be tested against real output**, not eyeballed. Past catches: draw scoring, Brier scaling, elimination status.
6. **Silent Supabase failure:** if env vars are missing, `loadNflResults()` returns empty without a visible error. localStorage can show "Saved" even when the DB write failed. Always verify the row in the Supabase dashboard.
7. **Admin week/state drift:** any component that initializes state from a one-time default (e.g. `useState(1)`) ignores saved results loaded later. Derive defaults from `stored` and re-sync when it changes.

## 8. Open issues (verified in this review)

1. ~~`tsc --noEmit` fails: 9 errors (TS6133, unused variables)~~ **Fixed.** `tsc --noEmit` passes. `npm run build` still needs a local confirmation run.
2. **Client-side direct-write fallback** in `src/lib/supabase.ts` (`callSaveResultApi`). If `/api/save-result` returns **404**, the browser upserts into `match_results` using the **anon key**. If the anon key can write, this bypasses the write secret and undermines the RLS plan. Recommend removing the fallback, then confirming RLS in the Supabase dashboard.
3. **`.gitignore` is partly corrupted.** Its last line is UTF-16 encoded (`s\0c\0r\0…`), so the intended `scripts/calibration/` ignore does not work. Recreate it as plain UTF-8.
4. **Build could not be verified from the earlier upload.** `node_modules` and `.venv` were installed on Windows (`.venv/Scripts/*.exe`); the native Rollup binary is missing there. Verify locally with `npm run build`. Exclude `node_modules`, `.venv`, and `dist` from future zips.
5. **Project memory vs. repo:**
   - Memory says `TrendsView` exists but is unwired. **No `TrendsView` exists in the repo.**
   - Memory says `AdminNFLRankings` and `update-nfl-overrides` are unmerged. **Not found in the repo.**
   - Memory says `src/lib/engine/nflElo.ts` is planned. **Not found.** Live NFL Elo already lives in `eloLive.ts` (commit `4d4b3c2`), so Phase 2A appears partly done.
   - NFL Phase 1 (admin score entry) is no longer blocked as of Oct 2026. Supabase env vars are present locally. **Vercel production config is still unverified.**
6. **`MatchCenterView` exists but is not imported in `App.tsx`**, so it is not reachable from the nav.
7. **Duplicated NFL rating formula** in two files (see §4). Consolidate into one function.
8. **Home hero still shows World Cup headlines.** `Hero.tsx` takes a `Headline` from the World Cup pool, so it never reflects NFL results. The NFL home card (`NflPreview`) is fixed; the hero is not. Needs `src/data/worldCup.ts` to change, plus a decision on whether NFL should lead the home page while the World Cup is complete (recommended: yes).
9. **Nav still shows Soccer, Formula 1, and MLB.** Planned: hide or mark "coming soon" in `SPORTS_NAV` (`src/data/worldCup.ts`) so the nav centers on NFL, NBA, and NHL.
10. **World Cup model candidate v1.11 (draw under-prediction)** was noted in `MODEL_HISTORY.md` as found but not actioned. Low priority now that the tournament is complete.
11. **Fantasy calibration:** 10th–90th band coverage is about 76% (display ~75%), against an 80% target.
12. **Stale docs:** `README.md` is from the prototype era (old folder path, old "record a result" flow, pre-NFL). `design_handoff_veridex/` assumes a Cursor build with mock data; it is historical reference only.
13. **Console noise:** `console.log` calls in `src/` (including `[NFL Admin]` and `[App]` logs), plus a window debug object (`__veridexDebug`) exposed in production.

## 9. Suggested next steps (in priority order)

1. Confirm `npm run build` passes locally after the TS6133 cleanup, then push.
2. Remove the anon-key direct-write fallback in `callSaveResultApi`. Confirm `match_results` RLS in Supabase (public SELECT only).
3. Verify production: Vercel env vars for save-result and cron, a test NFL score entry, and the Supabase row. Then tick the open success criteria in the NFL doc.
4. Make the home hero show NFL (needs `worldCup.ts`). Hide or label Soccer, F1, and MLB in the nav.
5. Fix `.gitignore` encoding and clean up the upload hygiene.
6. Decide on live score ingestion: get an `ODDS_API_KEY`, then deploy `api/ingest-live-scores.ts` and the cron schedule (budget ~350–400 calls/month against the 500 free tier).
7. Consolidate the NFL rating formula. Decide whether to wire `MatchCenterView` into the nav.
8. Continue fantasy calibration toward the 80% band target, re-running `scripts/backtest-fantasy-sim.ts` after any change to `curveFit.ts` or `simulate.ts`.
9. Consider whether to act on the v1.11 draw-probability candidate, now that the World Cup is complete.

## 10. Key reference files

| File | Purpose |
|---|---|
| `MODEL_HISTORY.md` | Full World Cup engine history: versions, backtests, Elo values, fantasy engine notes. Most detailed doc in the repo. |
| `src/App.tsx` | Routing, data loading, admin gate. Check here before assuming a view is live. |
| `src/lib/elo.ts`, `simulate.ts`, `bracketTree.ts` | Soccer core. |
| `src/lib/engine/` | Multi-sport engine and NFL-specific rules. |
| `src/data/nfl/nflLive.ts`, `eloLive.ts`, `forecastLive.ts` | NFL live layer. |
| `src/components/nfl/NflPreview.tsx`, `src/components/admin/AdminNflResultsPanel.tsx` | NFL home card and admin entry panel. |
| `src/lib/fantasy/` | Fantasy engine. |
| `src/lib/supabase.ts`, `api/save-result.ts` | Read and write paths. |
| `api/cron-snapshot.ts`, `vercel.json` | Daily automation. |
| `scripts/backtest-*.ts`, `scripts/calibrate-draw-params.ts`, `scripts/diagnose-accuracy.ts` | Verification and calibration. |