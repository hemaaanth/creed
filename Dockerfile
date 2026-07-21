FROM node:22-bookworm-slim@sha256:6c74791e557ce11fc957704f6d4fe134a7bc8d6f5ca4403205b2966bd488f6b3 AS base

ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS dependencies

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci

FROM base AS builder

WORKDIR /app

ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

# Next.js embeds `NEXT_PUBLIC_*` variables into browser code at build time.
# Dokploy must pass each of these build arguments and also set the same values
# at runtime for server-rendered routes.
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

RUN npm run build

FROM builder AS verify

# An opt-in target for portable local/CI validation. It keeps dependency
# installation and test execution out of the host environment.
RUN npm run lint && npm test

FROM base AS runner

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

WORKDIR /app

RUN groupadd --system --gid 1001 creed \
  && useradd --system --uid 1001 --gid creed creed

COPY --from=builder --chown=creed:creed /app/public ./public
COPY --from=builder --chown=creed:creed /app/.next/standalone ./
COPY --from=builder --chown=creed:creed /app/.next/static ./.next/static

USER creed

EXPOSE 3000

CMD ["node", "server.js"]
