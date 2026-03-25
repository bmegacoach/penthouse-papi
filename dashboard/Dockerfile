FROM node:20-alpine AS base

# Install dependencies
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Build
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Production
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Memory + uploads directories (will be mounted as volume)
RUN mkdir -p /app/memory /app/memory/uploads /app/memory/state /app/memory/research /app/memory/daily && chown -R nextjs:nodejs /app/memory

USER nextjs
EXPOSE 4000
ENV PORT=4000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
