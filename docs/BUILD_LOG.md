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
