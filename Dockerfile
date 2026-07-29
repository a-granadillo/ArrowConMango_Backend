# syntax=docker/dockerfile:1

# Debian (bookworm), never Alpine: bcrypt and sqlite3 are native addons and
# Alpine's musl libc breaks their prebuilt binaries, forcing a from-source
# compile that still occasionally fails on musl-specific edge cases.

FROM node:20-bookworm-slim AS builder
WORKDIR /app

# python3/make/g++ back node-gyp, used if bcrypt/sqlite3 have no prebuilt
# binary for this platform+Node ABI combination.
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src
RUN npm run build

FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
# Native deps recompiled for the runtime stage's own layer; build tools are
# purged again immediately after so they don't bloat the final image.
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    && npm ci --omit=dev --legacy-peer-deps \
    && apt-get purge -y --auto-remove python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/dist ./dist

RUN useradd --create-home --shell /usr/sbin/nologin appuser
USER appuser

EXPOSE 3000
CMD ["node", "dist/main.js"]
