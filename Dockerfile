# Образ приложения собирается без DATABASE_URL: при build запросов к БД нет.
FROM node:24-bookworm-slim AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM dependencies AS builder
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Мигратор — отдельный одноразовый сервис, запускаемый Compose перед приложением.
FROM node:24-bookworm-slim AS migrator
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts
COPY scripts/migrate.mjs ./scripts/migrate.mjs
COPY drizzle ./drizzle
USER node
CMD ["node", "scripts/migrate.mjs"]

FROM node:24-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=7s --start-period=20s --retries=5 CMD node -e "fetch('http://127.0.0.1:3000/api/ready',{signal:AbortSignal.timeout(6000)}).then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
