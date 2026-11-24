FROM node:24.22.3-alpine AS web
WORKDIR /web
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM python:3.12.8-slim
RUN apt-get update && apt-get install -y --no-install-recommends git && rm -rf /var/lib/apt/lists/*
COPY --from=ghcr.io/astral-sh/uv:0.5.11 /uv /usr/local/bin/uv
WORKDIR /app/backend
COPY backend/pyproject.toml backend/uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project
COPY backend/ ./
RUN uv sync --frozen --no-dev
COPY --from=web /web/dist /app/frontend/dist
COPY scripts/start.sh /app/start.sh
ENV TL_DATA_DIR=/data STL_DATA_DIR=/data/stl TL_FRONTEND_DIST=/app/frontend/dist PATH="/app/backend/.venv/bin:$PATH"
EXPOSE 8000
CMD ["/app/start.sh"]