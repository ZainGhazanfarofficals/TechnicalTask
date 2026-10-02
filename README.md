# Service Requests

A small full-stack app for managing service requests. Users sign up and file requests; admins review, update and delete them. Includes an AI assist that drafts a request from a one-line issue description.

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript · PostgreSQL 17 · Prisma 7 · Zod · Sonner (toasts) · Docker

## Features

- Sign up / sign in for users; sign-in only for admins (separate tab on the login screen)
- Dashboard of service requests with status filter, pagination, and loading / empty / error states
- Create, view, edit, delete requests (role-dependent, see below)
- **Generate with AI**: turns "Website checkout is failing for some customers." into a title, description and priority

| Role  | Create | View       | Edit                  | Change status | Delete |
| ----- | ------ | ---------- | --------------------- | ------------- | ------ |
| User  | yes    | own        | own (title, desc, priority) | no       | no     |
| Admin | **no** | all        | all                   | yes           | yes    |

## Setup

Requirements: Node 20+ (tested on 24), Docker with Compose.

```bash
cp .env.example .env        # then edit: set JWT_SECRET and LEMONFOX_API_KEY
npm install
```

Generate a session secret with `openssl rand -base64 48`.

### Environment variables

| Variable | Purpose |
| --- | --- |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | Credentials for the Postgres container |
| `DATABASE_URL` | Connection string used by the host (Prisma CLI, `npm run dev`). Compose overrides the host to `db` inside containers |
| `JWT_SECRET` | Signs session cookies. Required, 32+ characters |
| `LEMONFOX_API_KEY` | LemonFox AI key for "Generate with AI". Without it that endpoint returns 503; the rest of the app works |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Admin account created by the seed script (defaults `admin@example.com` / `ChangeMe123!`). **Change the password** |
| `COOKIE_SECURE` | Set to `false` to allow session cookies over plain http (compose does this for local use). Leave unset behind HTTPS |

## Run

### Option A: everything in Docker

```bash
docker compose up -d --build     # db + migrations + app
npm run db:seed                  # creates the admin user (runs on the host against the exposed Postgres port)
```

Open http://localhost:3000. Compose starts three services: `db` (Postgres with a persistent volume), `migrate` (one-shot `prisma migrate deploy`), and `app` (Next.js standalone build, non-root). The app starts only after migrations succeed.

### Option B: local dev with Dockerised Postgres

```bash
npm run db:up                    # start only Postgres
npm run db:migrate               # apply migrations (and create new ones when the schema changes)
npm run db:seed                  # create the admin user
npm run dev
```

### Useful commands

| Command | What it does |
| --- | --- |
| `npm run db:up` | Start Postgres only |
| `npm run db:migrate` | `prisma migrate dev` |
| `npm run db:seed` | Upsert the admin user (idempotent) |
| `npx prisma studio` | Browse the database |
| `npm run lint` / `npx tsc --noEmit` | Lint / type-check |
| `docker compose down -v` | Stop everything **and delete the database volume** |

## Database

Prisma schema: [prisma/schema.prisma](prisma/schema.prisma). Migrations are committed in `prisma/migrations`. The generated client goes to `app/generated/prisma` (git-ignored; created by `prisma generate`, which the Docker build runs).

- `User`: `id`, `name`, `email` (unique), `passwordHash` (bcrypt), `role` (`USER` | `ADMIN`)
- `ServiceRequest`: `id`, `title` (≤120), `description` (≤2000), `status` (`OPEN` | `IN_PROGRESS` | `RESOLVED` | `CLOSED`), `priority` (`LOW` | `MEDIUM` | `HIGH`), `createdById` → `User`, timestamps. Indexed on `createdById` and `(status, createdAt)`.

Admins can't self-register, so the seed script is the only way to create one.

## API

All routes are under `/api`, return JSON, and use one error shape: `{ "error": { "code", "message", "fields?" } }`.

| Method & path | Who | Notes |
| --- | --- | --- |
| `POST /auth/login` | anyone | Body `{ email, password, as?: "admin" }`. Sets an httpOnly session cookie |
| `POST /auth/register` | anyone | Always creates a `USER` |
| `POST /auth/logout` | anyone | Clears the cookie |
| `GET /requests` | signed in | `?status=&page=&pageSize=`. Users see their own, admins see all |
| `GET /requests/:id` | owner / admin | Others get 404 |
| `POST /requests` | **user only** | Admins get 403 |
| `PATCH /requests/:id` | owner / admin | Only admins may send `status` |
| `DELETE /requests/:id` | admin | |
| `POST /requests/generate` | user only | AI draft, nothing is saved. See below |

## Architecture and key decisions

```
app/
  page.tsx, components/AuthScreen.tsx   login / sign-up
  (app)/                                authenticated pages (layout checks the session server-side)
    dashboard, requests/new, requests/[id], requests/[id]/edit
  api/                                  thin route handlers
lib/
  shared/   zod schemas + constants + retry helper (used by BOTH client and server)
  server/   route() wrapper, session, permissions, rate limit, request & auth services, AI client
  client/   apiFetch (retry + toasts), typed api object, useAsync, form helpers
prisma/     schema, migrations, seed
```

- **One Next.js app, no separate backend.** Route handlers keep deployment to a single container and let the UI and API share types and validation.
- **Shared zod schemas** ([lib/shared/schemas.ts](lib/shared/schemas.ts)) are the single source of truth: the API enforces them, the forms reuse them for instant feedback, so rules can't drift.
- **`route()` wrapper** ([lib/server/route.ts](lib/server/route.ts)) gives every handler the same behaviour: same-origin check on writes, authentication and role gate, and error mapping (zod → 400, Prisma not-found → 404, DB down → 503 with `Retry-After`, anything else → generic 500 with no internals leaked). Handlers just return data.
- **Authorization lives in one place** ([lib/server/permissions.ts](lib/server/permissions.ts)). Queries are scoped with `visibleTo(session)`, so a user can't read or edit someone else's request (they get 404, not 403, so existence isn't revealed).
- **Sessions:** a signed JWT in an httpOnly, SameSite=Lax cookie. The user is re-read from the database on every request, so role changes and deletions take effect immediately.
- **Input handling (OWASP):** strict schemas (unknown keys rejected, which prevents mass assignment such as sending `role`), length and character limits, body-size cap, JSON content-type required, Prisma parameterised queries, React output escaping, bcrypt (cost 12) with a dummy compare for unknown emails, generic login errors, and login rate limiting (5 attempts / 15 min per IP + email, cleared on success).
- **Client retries:** [lib/client/http.ts](lib/client/http.ts) retries with exponential backoff and full jitter (400 ms base, 8 s cap, 3 retries) and honours `Retry-After`. Idempotent calls (GET/PATCH/DELETE) retry on network errors and 408/502/504; any call retries on 429/503, where the server did not process it. POST is never retried otherwise, so requests aren't created twice. A `Retry-After` longer than the cap (login lockout) is shown to the user instead of waited out.
- **Toasts:** every API call goes through `apiFetch`, which shows success toasts for mutations and error toasts for every failure; field-level validation errors are also marked inline.
- **Known limitation:** the rate limiter is in memory, so it is per instance. Use Redis or similar if you run multiple replicas.

## AI feature: Generate with AI

- **Provider / model:** [LemonFox AI](https://www.lemonfox.ai) (OpenAI-compatible chat completions API, `https://api.lemonfox.ai/v1/chat/completions`), model **`deepseek-v4-flash`**.
- **Flow:** on the New request screen the user types a short issue and clicks **Generate with AI**. The browser calls `POST /api/requests/generate` with `{ issue }`. The server calls LemonFox and returns `{ title, description, priority }`, which pre-fills the form. Nothing is saved until the user reviews and submits. The API key stays on the server.
- **Prompt approach** ([lib/server/ai.ts](lib/server/ai.ts)): a system prompt defines the exact JSON shape (title ≤100 chars, 2–4 sentence description with suggested first steps, priority from a short guide: HIGH for revenue/security/data loss/many users blocked, MEDIUM for degraded/some users, LOW for cosmetic). The user's text is sent as the `user` message with a standing instruction to treat it as untrusted data and never follow instructions inside it. `response_format: json_object`, `temperature: 0.3`.
- **Response handling:** the model's output is treated as untrusted. The outermost JSON object is extracted (some models add prose) and validated with the same zod rules as a user-created request, with priority restricted to the enum. Invalid output returns a clear 502 and the UI shows a toast.
- **Resilience:** 25 s timeout; retries on 429, 5xx and network errors with exponential backoff (3 attempts), then a 503 with `Retry-After`. Endpoint is limited to 10 calls/minute per user and 10–500 characters of input.

Example:

```
POST /api/requests/generate
{ "issue": "Website checkout is failing for some customers." }

200
{ "title": "Checkout failure affecting some customers",
  "description": "The website checkout process is failing for some customers. ... Suggested first steps: investigate recent changes to the checkout flow, check payment gateway logs, and replicate the issue in a test environment.",
  "priority": "HIGH" }
```

## Troubleshooting

- **Port 3000 already in use** when starting Docker: stop `npm run dev` (or change the published port in `docker-compose.yml`).
- **Can't sign in after `docker compose down -v`**: the database was wiped; run `npm run db:seed` again.
- **Generate returns 503 `AI_NOT_CONFIGURED`**: set `LEMONFOX_API_KEY` in `.env` and restart.
- **`npm ci` fails in Docker** with a missing `@emnapi/*` lockfile error: the explicit `@emnapi/core` / `@emnapi/runtime` dev dependencies in `package.json` exist to prevent this; keep them.
