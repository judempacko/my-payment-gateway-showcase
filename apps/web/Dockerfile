FROM node:24-slim AS builder
RUN npm install -g pnpm@11.17.0
WORKDIR /app

ARG NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
ARG NEXT_PUBLIC_DEMO_API_KEY=demo_sk_local
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_DEMO_API_KEY=$NEXT_PUBLIC_DEMO_API_KEY

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/contracts/package.json packages/contracts/package.json
RUN pnpm install --frozen-lockfile --filter @pay/web... --fetch-timeout 600000 --network-concurrency 4

COPY . .
RUN pnpm --filter @pay/contracts build && pnpm --filter @pay/web build

FROM node:24-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN npm install -g pnpm@11.17.0
RUN useradd --create-home --uid 1001 app
COPY --from=builder --chown=app:app /app /app
USER app
WORKDIR /app/apps/web
ENV PORT=4310
ENV HOSTNAME=0.0.0.0
EXPOSE 4310
CMD ["pnpm", "start"]
