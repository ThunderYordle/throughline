#!/usr/bin/env bash
set -euo pipefail
export TL_DATA_DIR="$(mktemp -d)"
PORT="${TL_E2E_PORT:-8000}"
cd "$(dirname "$0")/../backend"
uv run throughline seed --games 260
uv run throughline build --offline
exec uv run uvicorn throughline.api.main:app --port "$PORT"
