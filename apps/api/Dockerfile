FROM node:24-slim AS builder
RUN npm install -g pnpm@11.17.0
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/contracts/package.json packages/contracts/package.json
RUN pnpm install --frozen-lockfile --filter @pay/api... --fetch-timeout 600000 --network-concurrency 4

COPY . .
RUN pnpm --filter @pay/contracts build && pnpm --filter @pay/api build

FROM node:24-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN useradd --create-home --uid 1001 app
COPY --from=builder --chown=app:app /app /app
USER app
WORKDIR /app/apps/api
EXPOSE 3001
CMD ["node", "dist/main.js"]
