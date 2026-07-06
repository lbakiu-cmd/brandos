# BrandOS Project Context

BrandOS is an AI Visibility Operating System for businesses. It helps teams understand, improve, and act on how their business appears across AI search, local discovery, reviews, social channels, and customer conversations.

## Core Workflow

Sign up -> create organization -> create business -> add website -> run audit -> receive AI Visibility Score -> complete prioritized tasks.

## Product Modules

- Dashboard
- Businesses
- Website intelligence
- Google Business Profile
- Reviews
- Social scheduling
- Unified inbox
- AI Visibility
- Recommendations and tasks
- AI Copilot
- Reporting

## Stack

- pnpm + Turborepo
- Next.js web app
- NestJS Fastify API
- Worker app
- PostgreSQL + Prisma
- Redis
- Docker Compose
- TypeScript

## Engineering Rules

- Use strict TypeScript.
- Avoid `any`.
- Validate input at application boundaries.
- Enforce organization-level tenant isolation.
- Use migrations for database changes.
- Do not commit secrets.
- Keep commits small and reviewable.

## Product Rules

- Recommendations must lead to action, not just reports.
- Every score must be explainable.
- Tasks are central to the product experience.
- AI assists users, while users approve important actions.

## Current State

- Web runs on port `3000`.
- API health runs on port `4000`.
- Docker Compose runs Postgres and Redis.
- Initial Prisma migration exists.

## Next Milestone

Authentication, organizations, membership roles, business creation, and the dashboard shell.
