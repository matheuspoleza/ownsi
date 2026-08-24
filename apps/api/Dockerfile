# Build from the MONOREPO ROOT:
#   docker build -f apps/api/Dockerfile .
FROM oven/bun:1.4 AS base
WORKDIR /app

FROM base AS deps
COPY package.json bun.lock ./
COPY apps/api/package.json apps/api/
COPY packages/db/package.json packages/db/
COPY packages/emails/package.json packages/emails/
COPY packages/tsconfig/package.json packages/tsconfig/
RUN bun install --frozen-lockfile

FROM deps AS build
COPY . .
RUN cd packages/db && bunx prisma generate

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /app /app
# Railway injects PORT; 3000 is only the local default.
EXPOSE 3000
CMD ["bun", "apps/api/src/index.ts"]
