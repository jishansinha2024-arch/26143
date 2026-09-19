# ---- 1) build the React frontend (same-origin: API calls go to /api) ----
FROM node:20-slim AS frontend
WORKDIR /fe
COPY frontend/package.json frontend/yarn.lock ./
RUN yarn install --frozen-lockfile --network-timeout 600000
COPY frontend/ ./
ENV REACT_APP_BACKEND_URL="" \
    CI=false \
    GENERATE_SOURCEMAP=false \
    NODE_OPTIONS=--max-old-space-size=3072
RUN yarn build

# ---- 2) backend + built frontend ----
FROM python:3.12-slim
ENV PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1
RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY backend/requirements.txt /tmp/requirements.txt
# emergentintegrations / litellm come from Emergent-private hosts; only the optional AI assistant uses them.
RUN tr -d '\r' < /tmp/requirements.txt | grep -vE '^(emergentintegrations|litellm)' > /tmp/req.txt \
    && pip install -r /tmp/req.txt
COPY backend/ /app/backend/
COPY --from=frontend /fe/build /app/frontend_build
WORKDIR /app/backend
EXPOSE 10000
CMD ["sh", "-c", "export FRONTEND_URL=\"${FRONTEND_URL:-$RENDER_EXTERNAL_URL}\"; exec uvicorn render_app:app --host 0.0.0.0 --port ${PORT:-10000}"]
