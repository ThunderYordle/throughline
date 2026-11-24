# AI showcase: building Throughline with JetBrains tools

This is the build story, written from `docs/BUILD_LOG.md`.

## 1. Setup

- **PyCharm** for the Python backend, **WebStorm** for the React frontend, **DataGrip** for the DuckDB and SQLite files.
- **Junie** as the main coding agent, running whole tasks from the implementation plan.
- Run configurations for ingest, build, the API, the frontend and the tests are committed in `.idea/runConfigurations`.

The rules in `.junie/AGENTS.md`, and why each exists:

- **Read the spec and plan first**, so Junie builds the designed thing and not a plausible one.
- **Test first**: write the failing test, run it, implement, run it again. It makes each task checkable.
- **Analysis is pure functions over `Game`; I/O only in `cli.py`, `grid/`, `store/` and `api/`.** It keeps the analysis testable without data.
- **Every GRID field name lives in `grid/schema.py`**, so a feed change touches one file.
- **Game units and feed seconds everywhere; gold differences from the named side's view.** It stops sign and frame mistakes.
- **Every threshold is a named constant.** The methodology can list them all.
- **Never commit GRID data or anything built from it.** The license forbids it, so this is a hard rule with a staged-files check.
- **Ask `GameIndex.position`, never assume a frame every second.** The feed samples positions every few seconds.
- **Prose and commit rules** (no em dashes, one sentence per line, Conventional Commits).

## 2. Stories

### Story 1: a parser against a real feed (Task 3)

- **Task**: read the GRID starter feed, split it into games, and write a census.
- **Prompt**: the plan's Task 3, with the schema, parser and census steps and the rule that every field name lives in one file.
- **What Junie produced**: a feed-builder test helper, `grid/schema.py`, the census, the parser and the CLI, with 9 unit tests and a real-data test comparing winners and patches with `meta/games.csv`. The census reports 74 event types and a median position gap of 3 s.
- **What was wrong**: the `.gitignore` rule for the data folder also hid the tracked `docs/data/events.md`.
- **How it was caught**: the generated census file did not show up as trackable.
- **Fix**: anchor the rule to the root (`/data/`).

### Story 2: the whole dataset (Tasks 5 and 11)

- **Task**: ingest every game, then compute per-participant features.
- **What Junie produced**: the DuckDB store, the ingest command, and a build command. All 1,738 parseable games went in across 20 tournaments, patches 15.1 to 16.17. One game failed (blue had 6 players with a champion), as expected. Features were built for all 1,738 games.
- **What was wrong**: the CLI crashed on `--help` with `typer` 0.15.1 against a newer `click`.
- **How it was caught**: a failing CLI test.
- **Fix**: pin `click<8.2` in `backend/pyproject.toml`.

### Story 3: parallel work and a stray folder (Task 1)

- **Task**: scaffold the repository, license, CI and both apps.
- **What was wrong**: a subagent created `Footer.tsx` under a nested `frontend/frontend/` path, and an interrupted run left empty stub files.
- **How it was caught**: reviewing the tree after the run.
- **Fix**: move the file and repopulate the stubs.

### Story 4: the validation result we did not like (Task 23)

- **Task**: build the time-split backtest and run it on the real data.
- **What Junie produced**: the backtest, the `throughline validate` command and `GET /api/validation`, with 89 backend tests passing. The real run covered 587 holdout sides. Win rate rose from 35.8% in the lowest adherence quartile to 55.0% in the highest, with a gold-adjusted +20.4 pp for `window` items.
- **What was wrong**: the `objective` items had 1 followed side against 247 not followed, and `concede` came out at -4.9 pp adjusted. The strict setup rule (3 or more grouped 20 s before spawn, grouped first, objective taken) marks nearly every real setup as partly or not followed.
- **How it was caught**: the per-item table, not a test. A passing suite could not show a rule that is too strict.
- **Fix**: none yet, by design. The generator is tuned on the earlier split only, so the result is reported as a finding in `docs/methodology.md`, and `objective` is the first rule to recalibrate.

## 3. What worked and what did not

What worked:

- Test-first tasks. Most tasks passed ruff, mypy and their tests on the first run.
- A strict plan with named files, so Junie rarely had to guess.
- Running independent tasks in parallel (for example Tasks 3 and 4, or 7, 8 and 10).
- Guidelines that encode the license risk, so GRID data never reached git.

What did not:

- Parallel runs and interruptions left stray paths and empty stubs, and only a human review of the tree found them.
- Dependency drift (`typer` and `click`) showed up only when running the CLI.
- Tests prove the code matches the plan, not that the plan's rules fit real pro play. The `objective` rule passed every test and still did not match real games.
- The planned VOD hand checks are not logged in the build log yet, so verdict accuracy is unmeasured.

## 4. Numbers

- Tasks: the build log has an entry for every task from 1 to 25, each run by a Junie subagent or the Junie orchestrator.
- Tests: 89 backend tests (plus real-data tests), 13 Vitest tests and 2 Playwright end-to-end tests, written test-first.
- Data: 1,738 games ingested and 17,380 participant rows built.
- Time from spec to deploy: all of Tasks 1 to 25 are dated 2026-11-24 in the build log. The hosted deploy and its date are to be added once it is live.
- Commit counts are not stated here, because they were not counted when this was written.
