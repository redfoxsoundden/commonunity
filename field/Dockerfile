# CommonUnity cOMmons (field/) — Node 20 + better-sqlite3 native build.
# Multi-stage build keeps the final image small while still having the
# toolchain available to compile better-sqlite3 from source if no
# prebuilt binary matches the runtime.

# ─── builder ─────────────────────────────────────────────────────────────
FROM node:20-bookworm-slim AS builder

# Native build deps for better-sqlite3 (node-gyp).
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
        python3 \
        make \
        g++ \
        ca-certificates \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install deps first for layer caching.
COPY package.json package-lock.json ./
RUN npm ci --include=optional --no-audit --no-fund

# Force a rebuild of better-sqlite3 against this exact Node ABI.
RUN npm rebuild better-sqlite3

# Copy the rest of the source.
COPY . .

# ─── runtime ─────────────────────────────────────────────────────────────
FROM node:20-bookworm-slim AS runtime

# libstdc++ is already present in the slim image; we still need
# ca-certificates for any outbound TLS the app may do.
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV NODE_ENV=production

# Copy compiled node_modules and application source from builder.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
COPY --from=builder /app/src ./src
COPY --from=builder /app/public ./public
COPY --from=builder /app/seeds ./seeds

# Railway injects $PORT at runtime; the app falls back to 5050 locally.
EXPOSE 5050

CMD ["node", "src/index.js"]
