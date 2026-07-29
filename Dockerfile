# syntax=docker/dockerfile:1

# Debian (bookworm), never Alpine: bcrypt and sqlite3 are native addons and
# Alpine's musl libc breaks their prebuilt binaries, forcing a from-source
# compile that still occasionally fails on musl-specific edge cases.

FROM node:20-bookworm-slim AS builder
WORKDIR /app

# python3/make/g++ back node-gyp, used if bcrypt/sqlite3 have no prebuilt
# binary for this platform+Node ABI combination. Native modules are compiled
# once here; the runtime stage below copies the already-built node_modules
# instead of recompiling from scratch (cheaper, and avoids running two
# concurrent native-toolchain installs, which can starve a resource-limited
# Docker Desktop VM during `docker compose build`).
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src
RUN npm run build
RUN npm prune --omit=dev --legacy-peer-deps

FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package.json ./

RUN useradd --create-home --shell /usr/sbin/nologin appuser
USER appuser

EXPOSE 3000
CMD ["node", "dist/main.js"]
