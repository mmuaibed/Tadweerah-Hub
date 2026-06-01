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

RUN pnpm install --ignore-scripts --frozen-lockfile

RUN pnpm --filter @workspace/api-server run build

ENV NODE_ENV=production

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

USER appuser

EXPOSE 8080

CMD ["node", "--enable-source-maps", "./artifacts/api-server/dist/index.mjs"]