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
