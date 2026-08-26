# ---------- Stage 1: Dependencies (for build) ----------
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts

# ---------- Stage 2: Builder ----------
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# For PostgreSQL production, swap Prisma provider and simplify prisma.ts
RUN sed -i 's/provider = "sqlite"/provider = "postgresql"/' prisma/schema.prisma
RUN printf 'import { PrismaPg } from "@prisma/adapter-pg";\nimport { PrismaClient } from "@prisma/client";\nconst globalForPrisma = globalThis as unknown as { prisma: PrismaClient };\nfunction createClient() {\n  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });\n  return new PrismaClient({ adapter });\n}\nexport const prisma = globalForPrisma.prisma || createClient();\nif (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;\n' > src/lib/prisma.ts

RUN npx prisma generate
RUN npm run build

# ---------- Stage 3: Runner ----------
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma

# Install production deps as root, then download prisma engine
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev --ignore-scripts
RUN npx prisma generate

# Switch ownership and user
RUN chown -R nextjs:nodejs /app
USER nextjs

EXPOSE 3000
ENV HOSTNAME="0.0.0.0"

CMD ["sh", "-c", "npx prisma db push --skip-generate && node server.js"]
