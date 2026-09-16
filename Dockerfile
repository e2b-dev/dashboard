# Three stages: Bun resolves the dependencies (bun.lock is the lockfile), Node
# runs the Next build, Node serves. The runtime stage carries only Next's
# standalone output, so the full dependency tree never ships in the image.
#
# The build runs under Node, not Bun: `bun run build` forks Next's page-data
# workers, and Bun's CommonJS interop throws "Expected CommonJS module to have
# a function wrapper" on the webpack output those workers load.
#
# The build fetches three Google Fonts families through next/font/google
# (src/app/fonts.ts): it needs outbound HTTPS to fonts.googleapis.com and
# fonts.gstatic.com, and fails there in an air-gapped environment.
FROM oven/bun:1.2.20 AS deps

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM node:22-bookworm-slim AS builder

WORKDIR /app

# Only to run the prebuild env check, which is a TypeScript entrypoint.
COPY --from=deps /usr/local/bin/bun /usr/local/bin/bun
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

# Page-data collection imports API clients. This build-only domain is not
# carried into the runtime image; each installation must provide its own.
RUN PUBLIC_E2B_DOMAIN=build.invalid bun scripts/check-app-env.ts
RUN PUBLIC_E2B_DOMAIN=build.invalid node node_modules/next/dist/bin/next build --webpack

FROM node:22-bookworm-slim AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# server.js reads PORT (default 3000) and HOSTNAME (default 0.0.0.0). The
# default is 3001 so the dashboard does not land on 3000, which an E2B install
# already uses for its API when both share a host network.
ENV PORT=3001
ENV HOSTNAME=0.0.0.0

# Reported as service.version on OTEL traces (src/instrumentation.node.ts).
ARG BUILD=dev
ENV BUILD=${BUILD}

COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public

USER node
EXPOSE 3001

CMD ["node", "server.js"]
