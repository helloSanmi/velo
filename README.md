# Velo Learn

Velo Learn is a SaaS project workspace with a React frontend and a modular Node/Express backend.

## Project Layout

- `frontend/`: Vite + React app
- `backend/`: Express API, Prisma schema/seed, and org-scoped services
- `backend/data/*.json`: seed source data (orgs/users/projects/tasks/groups/teams/invites)
- Root docs: `README.md`, `PRIVACY_POLICY.md`, `TERMS_OF_SERVICE.md`, `SUPPORT.md`

## Tech Stack

- Frontend: React 19, TypeScript, Vite
- Backend: Node.js, TypeScript, Express, Prisma, PostgreSQL
- Realtime: WebSocket + SSE
- AI gateway: OpenAI (primary) + Gemini (fallback)

## Prerequisites

- Node.js 20+
- npm
- PostgreSQL 14+

## Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000`.

Optional frontend API target:

```bash
# frontend/.env.local
VITE_API_BASE_URL=http://localhost:4000/api/v1
```

## Backend Setup

1. Configure env:

```bash
cd backend
cp .env.example .env
```

2. Install and generate Prisma client:

```bash
npm install
npm run prisma:generate
```

3. Run migration (requires PostgreSQL from `.env`):

```bash
npm run prisma:migrate -- --name init
```

4. Seed current mock data into PostgreSQL:

```bash
npm run prisma:seed
```

5. Run API:

```bash
npm run dev
```

Backend runs at `http://localhost:4000` by default.

## Seeded Credentials

- Password for seeded users: `Password`
- Users:
1. `admin` (`admin@velo.ai`)
2. `alex` (`alex@velo.ai`)
3. `sarah` (`sarah@velo.ai`)
4. `mike` (`mike@velo.ai`)

## API Base

- `/api/v1`

Core endpoints:
- Auth: `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/me`
- Orgs: `/orgs/:orgId`, `/orgs/:orgId/users`, `/orgs/:orgId/users/role`, `/orgs/:orgId`
- Projects: `/orgs/:orgId/projects`
- Tasks: `/orgs/:orgId/tasks`, `/orgs/:orgId/projects/:projectId/tasks`
- AI: `/orgs/:orgId/ai/generate`, `/orgs/:orgId/ai/interactions`
- Usage: `/orgs/:orgId/usage/ai`
- Audit: `/audit?orgId=...`
- Realtime SSE: `/realtime/events?orgId=...`
- Realtime WS: `/ws?orgId=...`

## Security and Governance

- Single-DB multi-tenancy with strict `orgId` scoping.
- JWT access tokens + refresh token rotation table (server-side sessions).
- Centralized policy checks (`backend/src/modules/policy/policy.service.ts`).
- AI org quotas with soft warning + grace + daily block.
- Prompt/response storage and audit trails for AI and lifecycle events.
- Org deletion is soft-delete with 30-day retention; cleanup command:

```bash
cd backend
npm run retention:cleanup
```

## Launch Sizing Assumption

Initial tuning target:
- up to 50 orgs
- up to 500 users/org
- up to 200 projects/org
- up to 100,000 tasks/org

Indexes and query patterns are set for this range and can be tuned with production metrics.

## Legal

- Privacy Policy: `PRIVACY_POLICY.md`
- Terms of Service: `TERMS_OF_SERVICE.md`
- Support: `SUPPORT.md`
