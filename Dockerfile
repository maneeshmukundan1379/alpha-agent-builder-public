# Single container for Railway (and similar): FastAPI + built React SPA on $PORT
FROM node:20-alpine AS frontend-build
WORKDIR /build
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci
COPY frontend/ ./
ENV VITE_API_BASE=
RUN npm run build

FROM python:3.12-slim
WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    ALPHA_APP_DATA_DIR=/data

RUN apt-get update \
    && apt-get install -y --no-install-recommends git ca-certificates curl xz-utils \
    && case $(dpkg --print-architecture) in amd64) NODE_ARCH=x64 ;; arm64) NODE_ARCH=arm64 ;; *) echo "unsupported arch"; exit 1 ;; esac \
    && NODE_VERSION=20.19.0 \
    && curl -fsSL "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-${NODE_ARCH}.tar.xz" \
    | tar -xJ --strip-components=1 -C /usr/local \
    && rm -rf /var/lib/apt/lists/* \
    && node --version \
    && npm --version

COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

COPY backend/ /app/backend/
COPY --from=frontend-build /build/dist /app/frontend/dist

RUN mkdir -p /data/generated_agents /data/repo_workdirs

# Railway injects PORT (often 8080)
CMD ["/bin/sh", "-c", "exec python -m uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-8080} --proxy-headers --forwarded-allow-ips=*"]
