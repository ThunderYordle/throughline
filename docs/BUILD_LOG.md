# Build log

One entry per task: the date, the task, which JetBrains tool did what, what had to be fixed and why.

## 2026-11-24 - Task 1: scaffold
- Tool: Junie in PyCharm and WebStorm.
- What worked: Created the AGPL-3.0 license, gitignore rules, CI workflow, JetBrains run configurations, backend uv/FastAPI scaffold, and frontend Vite/React/Tailwind scaffold.
- What had to be fixed: Moved `Footer.tsx` out of an accidentally nested `frontend/frontend/` path created by a fast-tier subagent, and repopulated empty stub files after an interrupted subagent run.
