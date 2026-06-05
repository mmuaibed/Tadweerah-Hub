# Tadweerah Pilot Backend Dockerfile
# Target: Google Cloud Run

FROM node:24-alpine AS app

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY artifacts ./artifacts
COPY lib ./lib
COPY scripts ./scripts
COPY schema.sql ./schema.sql

RUN pnpm install --ignore-scripts --no-frozen-lockfile

RUN pnpm --filter @workspace/api-server run build

ENV NODE_ENV=production

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

RUN mkdir -p /app/public/uploads \
    && chown -R appuser:appgroup /app/public \
    && chown -R appuser:appgroup /app/artifacts/api-server/dist

USER appuser

EXPOSE 8080

CMD ["node", "--enable-source-maps", "./artifacts/api-server/dist/index.mjs"]