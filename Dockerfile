# node:22-bookworm-slim (not alpine, and not node:20 -- better-sqlite3@13
# requires Node >=22 and segfaults on load under Node 20 despite installing
# without error) avoids musl/native-module build friction and the Node
# version mismatch.
FROM node:22-bookworm-slim AS deps
WORKDIR /app
# Node 22's bundled npm/node-gyp compiles better-sqlite3 from source during
# npm ci (ignoring its bundled prebuilt binaries), unlike Node 20's older
# npm which used the prebuild directly. python3/make/g++ are required for
# that compile step to succeed.
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/db ./db
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.ts ./next.config.ts

EXPOSE 3000
CMD ["npm", "run", "start:migrate"]
