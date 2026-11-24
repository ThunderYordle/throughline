#!/usr/bin/env bash
set -euo pipefail
DB="${TL_ANALYTICS_DB:-$TL_DATA_DIR/throughline.duckdb}"
# The real data only with the organizers' written permission to host it: TL_REAL_DATA=1.
if [ "${TL_REAL_DATA:-0}" = "1" ] && [ ! -f "$STL_DATA_DIR/lol/series.csv" ]; then
  git clone --filter=blob:none --sparse https://github.com/cloud9esports/stl-hackathon-2026-grid-starter.git "$STL_DATA_DIR"
  git -C "$STL_DATA_DIR" sparse-checkout set lol meta
fi
if [ ! -f "$DB" ]; then
  if [ "${TL_REAL_DATA:-0}" = "1" ]; then
    throughline ingest
    throughline build
  else
    throughline seed --games 400
    throughline build --offline
  fi
  throughline validate --holdout-from "${TL_HOLDOUT_FROM:-2026-08-01}"
fi
exec uvicorn throughline.api.main:app --host 0.0.0.0 --port "${PORT:-8000}"