# Build log

One entry per task: the date, the task, which JetBrains tool did what, what had to be fixed and why.

## 2026-11-24 - Task 1: scaffold
- Tool: Junie in PyCharm and WebStorm.
- What worked: Created the AGPL-3.0 license, gitignore rules, CI workflow, JetBrains run configurations, backend uv/FastAPI scaffold, and frontend Vite/React/Tailwind scaffold.
- What had to be fixed: Moved `Footer.tsx` out of an accidentally nested `frontend/frontend/` path created by a fast-tier subagent, and repopulated empty stub files after an interrupted subagent run.

## 2026-11-24 - Task 2: game model, geometry and role inference
- Tool: Junie (fast-tier coding subagent) in PyCharm.
- What worked: Wrote geometry and role inference tests first, verified the expected `ModuleNotFoundError`, then implemented `model.py`, `geometry.py`, and `roles.py` with all 7 tests, ruff, and mypy passing on the first run.
- What had to be fixed: Nothing.

## 2026-11-24 - Task 3: starter data, GRID schema, census and series parser
- Tool: Junie (fast-tier coding subagent) in PyCharm.
- What worked: Built `FeedBuilder`, `grid/source.py`, centralized `grid/schema.py`, `grid/census.py`, `grid/parser.py`, and `throughline grid census` CLI test-first; passed 9 unit tests and the real-data test against `meta/games.csv`, and generated `docs/data/events.md` (74 event types, median 3 s position gap).
- What had to be fixed: Anchored `/data/` in `.gitignore` so `docs/data/events.md` is tracked while root `data/` remains ignored.

## 2026-11-24 - Task 4: GameBuilder
- Tool: Junie (fast-tier coding subagent) in PyCharm, run in parallel with Task 3.
- What worked: Implemented `game/builder.py` and `tests/game/test_builder.py` test-first with all checks passing.
- What had to be fixed: Nothing.


## 2026-11-24 - Task 5: analytics store and ingest
- Tool: Junie (fast-tier coding subagent) in PyCharm.
- What worked: Implemented `store/analytics.py`, `grid/ingest.py`, and the `throughline ingest` CLI command test-first; all 4 store/ingest tests, ruff, and mypy passed.
- What had to be fixed: Pinned `click<8.2` in `backend/pyproject.toml` to resolve a `typer==0.15.1` vs `click 8.5` `make_metavar` crash on `--help`, and added `/backend/data/` to `.gitignore`.

## 2026-11-24 - Task 6: GameIndex
- Tool: Junie (fast-tier coding subagent) in PyCharm, run in parallel with Task 5.
- What worked: Implemented `game/index.py` (frame lookup, 20 s gap interpolation, gold diffs, proximity) and `tests/game/test_index.py` test-first with all checks passing.
- What had to be fixed: Nothing.

## 2026-11-24 - Task 5 (Step 9): full dataset ingest
- Tool: Junie orchestrator + DuckDB CLI check.
- What worked: Ingested all 1,738 parseable games across 20 tournaments (LCK, LEC, LTA, LCS; patches 15.1 to 16.17) into a 126 MB `backend/data/throughline.duckdb`; 1 expected failure (`3ac8f0c2-a0fc-4995-9ce1-8f4d31815c63`: blue has 6 players with a champion).
- What had to be fixed: Nothing.

## 2026-11-24 - Task 7: objective instances and setups
- Tool: Junie (fast-tier coding subagent) in PyCharm.
- What worked: Implemented `game/setups.py`, 5 unit tests, and the real-data spawn test; verified against all 1,738 ingested games that every game has spawns and no objective is taken before its first spawn.
- What had to be fixed: Nothing.

## 2026-11-24 - Task 8: fight detection
- Tool: Junie (fast-tier coding subagent) in PyCharm, run in parallel with Tasks 7 and 10.
- What worked: Implemented `game/fights.py` and `tests/game/test_fights.py` test-first with all checks passing.
- What had to be fixed: Nothing.

## 2026-11-24 - Task 10: frontend shell and replay player
- Tool: Junie (fast-tier coding subagent) in WebStorm, run in parallel with Tasks 7 and 8.
- What worked: Implemented `types.ts`, `api.ts`, `lib/time.ts`, `lib/ddragon.ts`, `map/transform.ts`, `replay/clock.ts`, `replay/draw.ts`, `ReplayPlayer.tsx`, `HomePage.tsx`, and `ReplayPage.tsx` test-first; ESLint, TypeScript, 7 Vitest assertions, and Vite production build all passed.
- What had to be fixed: Nothing.

## 2026-11-24 - Task 9: replay payload and games API
- Tool: Junie (fast-tier coding subagent) in PyCharm.
- What worked: Added `AnalyticsStore.reader()` and `champion_counts()`, `api/replay.py`, `api/routes_games.py`, `api/main.py`, and API test fixtures test-first with all checks passing.
- What had to be fixed: Nothing.

## 2026-11-24 - Task 13: plan models and text helpers
- Tool: Junie (fast-tier coding subagent) in PyCharm, run in parallel with Task 9.
- What worked: Implemented `plan/constants.py`, `plan/models.py`, `plan/text.py`, and `tests/plan/test_models.py` test-first with all 4 tests, ruff, and mypy passing.
- What had to be fixed: Nothing.

## 2026-11-24 - Task 11: participant features and build command
- Tool: Junie (fast-tier coding subagent) in PyCharm.
- What worked: Implemented `knowledge/items.py`, `knowledge/features.py`, `participant_features` table, and `throughline build` test-first; built all 1,738/1,738 real pro games using cached Data Dragon item JSONs.
- What had to be fixed: Nothing.

## 2026-11-24 - Task 19: review context and plan checkers
- Tool: Junie (fast-tier coding subagent) in PyCharm, run in parallel with Tasks 11 and 17-18.
- What worked: Implemented `review/context.py`, `review/checks.py` (all 6 plan-item checkers), and 7 tests test-first with all checks passing.
- What had to be fixed: Nothing.

## 2026-11-24 - Tasks 17 and 18: Draft, Plan pages and TempoChart
- Tool: Junie (fast-tier coding subagent) in WebStorm, run in parallel with Tasks 11 and 19.
- What worked: Implemented Draft/Plan pages, coach editing behind tokens, Discord export, and SVG `TempoChart` test-first; ESLint, TypeScript, 11 Vitest tests, and Vite build all passed.
- What had to be fixed: Nothing.

## 2026-11-24 - Task 12: KnowledgeBase
- Tool: Junie (fast-tier coding subagent) in PyCharm.
- What worked: Implemented `knowledge/base.py` with empirical Bayes shrinkage, patch-window/season fallback, time-split filtering, and season-scoped `first_spawn` test-first; all 7 tests, ruff, and mypy passed.
- What had to be fixed: Nothing.

## 2026-11-24 - Task 20: macro moment detectors
- Tool: Junie (fast-tier coding subagent) in PyCharm, run in parallel with Tasks 12 and 22.
- What worked: Implemented all 5 macro moment detectors (`objective_setups`, `unused_advantages`, `cross_map_trades`, `caught_before_objectives`, `gold_swings`) and impact capping in `review/moments.py` test-first; all 7 tests, ruff, and mypy passed.
- What had to be fixed: Nothing.

## 2026-11-24 - Task 22: Review page
- Tool: Junie (fast-tier coding subagent) in WebStorm, run in parallel with Tasks 12 and 20.
- What worked: Implemented `ReviewPage.tsx`, `ReviewTimeline`, `ReviewList`, game picker on `PlanPage`, confirm/dismiss/notes, read-only share link, and `reviewEntries.test.ts` test-first; ESLint, TypeScript, 13 Vitest tests, and Vite build all passed.
- What had to be fixed: Nothing.

## 2026-11-24 - Tasks 14 and 15: draft tempo, lane priorities and plan generator
- Tool: Junie (fast-tier coding subagent) in PyCharm.
- What worked: Implemented `plan/tempo.py`, `plan/generator.py`, `FakeKnowledge`, and 9 tests test-first with all checks passing.
- What had to be fixed: Nothing.

## 2026-11-24 - Task 16: app store and plans API
- Tool: Junie (fast-tier coding subagent) in PyCharm.
- What worked: Implemented SQLite `AppStore`, `AnalyticsStore.games_with_champions`, and `api/routes_plans.py` test-first with all tests, ruff, and mypy passing.
- What had to be fixed: Nothing.

## 2026-11-24 - Task 21: review assembly, storage and API
- Tool: Junie (fast-tier coding subagent) in PyCharm.
- What worked: Implemented `review/assemble.py`, `AppStore` review/entry storage, and `api/routes_reviews.py` test-first with all checks passing.
- What had to be fixed: Nothing.

## 2026-11-24 - Task 23: validation backtest
- Tool: Junie (fast-tier coding subagent) in PyCharm.
- What worked: Implemented `validation/backtest.py`, `throughline validate` CLI, and `GET /api/validation` test-first; all 89 backend tests, ruff, and mypy passed.
- What had to be fixed: Nothing.

## 2026-11-24 - Task 24: synthetic dataset, static frontend and deployment
- Tool: Junie (fast-tier coding subagent) in PyCharm.
- What worked: Implemented `synthetic.py`, `throughline seed`, `throughline build --offline`, static SPA fallback in `create_app`, `Dockerfile`, `scripts/start.sh`, and `.dockerignore`.
- What had to be fixed: Replaced a bare lane string tuple with `LANES` in `synthetic.py` to satisfy strict mypy.

## 2026-11-24 - Task 23 (Step 5): real-data validation run
- Tool: Junie orchestrator running `throughline validate --holdout-from 2025-08-20` on the 1,738-game DuckDB.
- What worked: Evaluated 587 holdout sides; win rate rises from 35.8% in the 0-25% adherence quartile (106 sides) to 55.0% in the 75-100% quartile (149 sides), with +20.4 pp gold-adjusted lift on `window` items and +8.8 pp on `lane` items.
- What had to be fixed: Nothing; documented honest negative/sparse findings on `concede` (-4.9 pp adjusted) and `objective` (1 followed vs 247 not followed under strict 20 s pre-spawn setup criteria) for `docs/methodology.md`.

## 2026-11-24 - Task 25: end-to-end test and polish pass
- Tool: Junie (standard-tier subagent) in WebStorm + Playwright.
- What worked: Added `scripts/e2e-backend.sh`, `frontend/playwright.config.ts`, `frontend/e2e/loop.spec.ts`, and the `e2e` job in `.github/workflows/ci.yml`; both end-to-end tests passed, responsive overflow fixes landed across Draft/Plan/Review pages, and 5 screenshots were captured into `docs/screenshots/`.
- What had to be fixed: Made the E2E API port configurable via `TL_E2E_PORT` (defaulting to 8000 for CI) to avoid colliding with a local service on port 8000, switched `vite.config.ts` to Vite's `loadEnv` so strict TypeScript compiles without `@types/node`, and added optional `PLAYWRIGHT_CHANNEL` so local runs on Node 26 can use installed Chrome while CI uses bundled Chromium.
