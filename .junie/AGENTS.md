# Throughline: guidelines for Junie

Read `docs/SPEC.md` and the implementation plan before changing code.

## Stack
- Backend: Python 3.12 in `backend/`, managed with uv. FastAPI, DuckDB, SQLite, Pydantic 2, Typer, zstandard.
- Data: the hackathon's GRID starter repository at `../stl-hackathon-2026-grid-starter` (`STL_DATA_DIR`), one `.jsonl.zst` series feed per file. `docs/data/events.md` says what it carries.
- Frontend: React 18 + TypeScript + Vite in `frontend/`, Tailwind, React Router, TanStack Query.

## Rules
- Test first: write the failing test, run it, implement, run it again.
- Analysis code is pure functions over `throughline.game.model.Game`; I/O only in `cli.py`, `grid/`, `store/` and `api/`.
- Every GRID field name lives in `throughline/grid/schema.py`.
- Coordinates are game units (0 to 15000, as the feed gives x and y, blue base bottom left). Times are float seconds on the feed's clock.
- Gold differences are from the named side's point of view.
- Every threshold is a named constant at the top of its module.
- Never commit GRID data or anything built from it (`.zst`, `.jsonl`, `.parquet`, `.sqlite`, `.duckdb`, copies of `meta/`), even in a private branch. Never `git add -A` blindly: check `git diff --cached --name-only` first. Stop and tell the human if data was ever staged.
- Tests use `GameBuilder` (games) and `tests/grid/feed.py` (raw feeds); real-data tests are marked `realdata`.
- The feed has no wards and no roles, and positions arrive every few seconds: ask `GameIndex.position`, which may say unknown; never assume a frame every second.
- No team logos. Champion icons and the minimap come from Data Dragon.
- Prose: no em dashes; one sentence per line in Markdown.
- Commits: Conventional Commits, no AI co-author trailers.

## Commands
- Backend tests: `cd backend && uv run pytest` (real data: `uv run pytest -m realdata`)
- Lint and types: `cd backend && uv run ruff check . && uv run ruff format --check . && uv run mypy throughline`
- Frontend: `cd frontend && npm run lint && npm run typecheck && npm test && npm run build`
