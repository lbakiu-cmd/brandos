# BrandOS

BrandOS is an AI Visibility Operating System for businesses. This monorepo is the foundation for website AI/AEO/GEO audits, Google Business Profile intelligence, social scheduling, unified inbox workflows, AI Visibility Score, recommendations, and an AI Copilot.

## Stack

- pnpm + Turborepo
- `apps/web`: Next.js
- `apps/api`: NestJS with Fastify
- `apps/worker`: background jobs
- `packages/database`: Prisma + PostgreSQL schema
- Redis for queues and caching
- Docker Compose for local infrastructure

## Local Commands

Install dependencies:

```bash
pnpm install
```

Start Postgres 16 and Redis 7:

```bash
docker compose -f infrastructure/docker/docker-compose.yml up -d
```

Run all dev services:

```bash
pnpm dev
```

Run only the web app:

```bash
pnpm --filter @brandos/web dev
```

Run only the API:

```bash
pnpm --filter @brandos/api dev
```

Build, lint, and typecheck:

```bash
pnpm build
pnpm lint
pnpm typecheck
```

Generate the Prisma client:

```bash
pnpm --filter @brandos/database prisma:generate
```

Create a local Prisma migration:

```bash
pnpm --filter @brandos/database prisma:migrate
```

## Environment

Defaults are suitable for local Docker Compose:

```bash
DATABASE_URL=postgresql://brandos:brandos@localhost:5432/brandos
REDIS_URL=redis://localhost:6379
NEXT_PUBLIC_API_URL=http://127.0.0.1:4000
WEB_ORIGIN=http://127.0.0.1:3000
```
