# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Velo Learn is a multi-tenant SaaS task/project management platform with AI integration. It has a **Vite+React frontend** and a **Node/Express+Prisma backend** backed by PostgreSQL.

## Commands

### Frontend (`frontend/`)
- `npm run dev` — Dev server on port 3000
- `npm run build` — Production build
- `npm test` — Run all tests (Vitest)
- `npx vitest run services/__tests__/<file>.test.ts` — Run a single test file

### Backend (`backend/`)
- `npm run dev` — Dev server on port 4000 (tsx watch)
- `npm run build` — Compile TypeScript
- `npm run lint` — Type-check with `tsc --noEmit`
- `npm run prisma:generate` — Regenerate Prisma client (run after schema changes)
- `npm run prisma:migrate -- --name <name>` — Create and apply a migration
- `npm run prisma:seed` — Seed database with mock data from `backend/data/*.json`
- `npm run retention:cleanup` — Clean soft-deleted orgs past 30-day retention

### Environment

Requires Node.js 20+ and PostgreSQL 14+. Backend uses `.env`, frontend uses `.env.local` (with `VITE_API_BASE_URL`).

## Architecture

### Backend (`backend/src/`)

Modular Express API at `/api/v1`. Each domain lives in `modules/`:

- **`modules/auth/`** — JWT auth (access 15m + refresh 14d), session storage with refresh token hash rotation, bcrypt passwords
- **`modules/organizations/`** — Org CRUD, user management, invite tokens, soft-delete with 30-day retention
- **`modules/projects/`** — Project CRUD with lifecycle states (active/completed/archived/deleted), public sharing via tokens
- **`modules/tasks/`** — Task CRUD with subtasks, comments, audit log, time tracking, blocker relationships
- **`modules/teams/`**, **`modules/groups/`** — Team and security group management
- **`modules/ai/`** — Dual-gateway AI (OpenAI primary, Gemini fallback) with daily org quotas, grace periods, and interaction audit trail
- **`modules/policy/`** — Centralized permission checks
- **`modules/realtime/`** — WebSocket + SSE connections
- **`modules/audit/`** — Audit logging
- **`modules/usage/`** — AI usage tracking

**Middleware chain:** helmet → CORS → JSON parser → morgan → requestContext → authenticate → requireOrgAccess

**Multi-tenancy:** Single database, all queries scoped by `orgId`. The `requireOrgAccess` middleware enforces org isolation.

**Key libraries:** `lib/prisma.ts` (singleton client), `lib/httpError.ts` (error factory), `lib/ids.ts` (ID generation)

### Frontend (`frontend/`)

React 19 SPA with no state management library — uses hooks + context.

- **`services/`** — Business logic layer (apiClient, taskService, projectService, aiService, workflowService, backendSyncService, etc.)
- **`hooks/`** — Custom hooks for state and lifecycle (`useTasks`, `useWorkspaceBootstrap`, `useWorkspaceConnection`, `useAccessControl`, `useTaskPolicyActions`)
- **`components/`** — UI components
- **`types.ts`** — Shared TypeScript types

Path alias: `@/*` maps to the frontend root.

### Database (Prisma)

Schema at `backend/prisma/schema.prisma`. Key models: Organization, User, Session, Project, Task, Team, SecurityGroup, Invite, AiUsageDaily, AiInteraction, AuditLog.

User roles: `admin`, `member`, `guest`. Seed users: `admin@velo.ai`, `alex@velo.ai`, `sarah@velo.ai`, `mike@velo.ai` (all password: `Password`).

### CI

GitHub Actions: `frontend-ci.yml` runs tests + build; `backend-ci.yml` validates JSON seed data.
