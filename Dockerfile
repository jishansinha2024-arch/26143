# ---- 1) build the React frontend (same-origin: API calls go to /api) ----
FROM node:20-slim AS frontend
WORKDIR /fe
COPY frontend/package.json frontend/yarn.lock ./
RUN yarn install --frozen-lockfile --network-timeout 600000
COPY frontend/ ./
ENV REACT_APP_BACKEND_URL="" \
    CI=false \
    GENERATE_SOURCEMAP=false \
    NODE_OPTIONS=--max-old-space-size=2048
RUN yarn build

# ---- 2) backend + built frontend ----
FROM python:3.12-slim
ENV PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1 MALLOC_ARENA_MAX=2
RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY backend/requirements.txt /tmp/requirements.txt
# Drop packages the app never imports (dev tools, pandas/scipy, Google/OpenAI SDKs, Emergent-private wheels)
# to keep the image small and the build fast on Render's free tier.
RUN tr -d '\r' < /tmp/requirements.txt | grep -viE '^(black|mypy|mypy_extensions|flake8|isort|pytest|pytest-xdist|execnet|iniconfig|pluggy|pyflakes|pycodestyle|mccabe|pathspec|pytokens|librt|ast_serialize|pandas|scipy|boto3|botocore|s3transfer|s5cmd|openai|tiktoken|tokenizers|huggingface_hub|hf-xet|google-ai-generativelanguage|google-api-core|google-api-python-client|google-auth|google-auth-httplib2|google-genai|google-generativeai|googleapis-common-protos|grpcio|grpcio-status|proto-plus|protobuf|httplib2|uritemplate|jq|tenacity|jiter|fastuuid|litellm|emergentintegrations)(==| @|$)' > /tmp/req.txt \
    && pip install -r /tmp/req.txt
COPY backend/ /app/backend/
COPY --from=frontend /fe/build /app/frontend_build
WORKDIR /app/backend
EXPOSE 10000
CMD ["sh", "-c", "export FRONTEND_URL=\"${FRONTEND_URL:-$RENDER_EXTERNAL_URL}\"; exec uvicorn render_app:app --host 0.0.0.0 --port ${PORT:-10000}"]
