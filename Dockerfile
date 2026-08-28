FROM node:20-alpine AS base

# ─── Dependencies Stage ───
FROM base AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
COPY package.json package-lock.json* ./
COPY prisma ./prisma
COPY prisma.config.ts ./
# Install ALL dependencies (including devDeps needed for build)
RUN npm ci && npm cache clean --force

# ─── Builder Stage ───
FROM base AS builder
RUN apk add --no-cache openssl
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
# Limit memory for constrained build environments (Render free tier)
ENV NODE_OPTIONS="--max-old-space-size=1024"
RUN npx prisma generate
RUN npm run build
# Prune devDependencies after build to reduce final image size
RUN npm prune --omit=dev

# ─── Runner Stage ───
FROM base AS runner
RUN apk add --no-cache openssl curl
WORKDIR /app

# Run as non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Copy only what's needed to run
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/server.js ./server.js
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts

USER nextjs

EXPOSE 3000

# Health check for container orchestrators
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:3000/api/auth/status || exit 1

CMD ["node", "--max-http-header-size=81920", "server.js"]
