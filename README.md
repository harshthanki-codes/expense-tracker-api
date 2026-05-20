# Expense Tracker API

A production-ready REST API for personal expense tracking. Built with Node.js, TypeScript, PostgreSQL, and Redis. Supports JWT authentication with token rotation, multi-user data isolation, category management, and financial analytics.

**Live API:** `https://your-app.railway.app`
**Swagger Docs:** `https://your-app.railway.app/docs`

---

## Tech Stack

| Layer | Choice | Rationale |
|---|---|---|
| Runtime | Node.js 20 + TypeScript | Strong typing across the full codebase; async performance for I/O-heavy workloads |
| Framework | Express.js | Mature, minimal, well-understood middleware model |
| ORM | Prisma | Type-safe DB access with migration tooling; Decimal type for financial precision |
| Database | PostgreSQL 16 | ACID compliance required for financial data; composite indexes on hot query paths |
| Cache / Token store | Redis 7 | Sub-millisecond JWT blocklist lookups; rate limit counter backing |
| Validation | Zod | Schema-first validation with TypeScript inference; no runtime/compile-time drift |
| Auth | JWT (jsonwebtoken) | Stateless access tokens + rotating refresh tokens; blocklist via Redis |
| Logging | Pino | Structured JSON logs in production; negligible performance overhead |
| Docs | Swagger / OpenAPI 3 | Live, testable documentation; generated from JSDoc annotations |
| Container | Docker + Compose | Single-command local setup; reproducible builds |
| CI/CD | GitHub Actions | Lint → test → build → deploy pipeline |

---

## Architecture

```
src/
├── config/           # env validation, Prisma client, Redis, Swagger, logger
├── lib/              # shared: errors, response helpers, JWT utils, pagination
├── middleware/        # authenticate, errorHandler, rateLimiter
├── modules/
│   ├── auth/         # register, login, refresh, logout
│   ├── users/        # profile, password management
│   ├── transactions/ # CRUD + filtering + pagination
│   ├── categories/   # default + custom categories
│   └── analytics/    # summary, spending breakdown, monthly trend
└── types/            # shared TypeScript interfaces
```

Each module follows a strict three-layer pattern: **router → controller → service**. Routers handle routing and OpenAPI annotations. Controllers handle HTTP parsing and response formatting. Services contain all business logic and own the database interaction. No layer talks to the DB directly except services.

---

## Local Setup

### Prerequisites

- Docker + Docker Compose
- Node.js 20+ (for running scripts directly)

### One-command start

```bash
git clone https://github.com/your-username/expense-tracker-api
cd expense-tracker-api
cp .env.example .env

docker-compose up -d
docker-compose exec api npm run db:migrate
docker-compose exec api npm run db:seed
```

The API is now available at `http://localhost:3000`.
Swagger UI is at `http://localhost:3000/docs`.

**Demo credentials:** `demo@example.com` / `Password1`

### Without Docker

```bash
# Requires a local PostgreSQL and Redis instance
cp .env.example .env
# Edit DATABASE_URL and REDIS_URL in .env

npm install
npm run db:migrate
npm run db:seed
npm run dev
```

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | ✅ | — | PostgreSQL connection string |
| `REDIS_URL` | ✅ | — | Redis connection string |
| `JWT_SECRET` | ✅ | — | Min 32 chars. Use `openssl rand -base64 64` |
| `PORT` | — | `3000` | Server port |
| `JWT_ACCESS_EXPIRES_IN` | — | `15m` | Access token lifetime |
| `JWT_REFRESH_EXPIRES_IN` | — | `7d` | Refresh token lifetime |
| `BCRYPT_ROUNDS` | — | `12` | bcrypt cost factor (10–14) |
| `CORS_ORIGIN` | — | `*` | Allowed origin(s), comma-separated |
| `AUTH_RATE_LIMIT_MAX` | — | `10` | Max auth attempts per 15-minute window |

---

## API Reference

Base URL: `/api/v1`

Full interactive documentation is available at `/docs`.

### Authentication

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | — | Register a new account |
| POST | `/auth/login` | — | Login and receive tokens |
| POST | `/auth/refresh` | — | Rotate token pair |
| POST | `/auth/logout` | ✅ | Invalidate access token |

### Users

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/users/me` | ✅ | Get own profile |
| PATCH | `/users/me` | ✅ | Update name / email |
| PATCH | `/users/me/password` | ✅ | Change password |

### Transactions

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/transactions` | ✅ | List with filtering, sorting, pagination |
| POST | `/transactions` | ✅ | Create a transaction |
| GET | `/transactions/:id` | ✅ | Get single transaction |
| PATCH | `/transactions/:id` | ✅ | Update a transaction |
| DELETE | `/transactions/:id` | ✅ | Delete a transaction |

**Query parameters for GET /transactions:**

| Param | Type | Description |
|---|---|---|
| `page` | integer | Page number (default: 1) |
| `limit` | integer | Items per page (default: 20, max: 100) |
| `type` | `INCOME` \| `EXPENSE` | Filter by type |
| `categoryId` | uuid | Filter by category |
| `startDate` | `YYYY-MM-DD` | Date range start |
| `endDate` | `YYYY-MM-DD` | Date range end |
| `sortBy` | `date` \| `amount` | Sort field (default: date) |
| `order` | `asc` \| `desc` | Sort direction (default: desc) |

### Categories

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/categories` | ✅ | List all (default + custom) |
| POST | `/categories` | ✅ | Create custom category |
| PATCH | `/categories/:id` | ✅ | Rename custom category |
| DELETE | `/categories/:id` | ✅ | Delete (transactions move to Other) |

### Analytics

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/analytics/summary` | ✅ | Income, expenses, net for a period |
| GET | `/analytics/spending-by-category` | ✅ | Breakdown with percentages |
| GET | `/analytics/monthly-trend` | ✅ | Month-over-month for N months |

---

## Authentication Flow

```
Register / Login → { accessToken (15m), refreshToken (7d) }
   │
   ├── All protected routes: Authorization: Bearer <accessToken>
   │
   ├── When access token expires:
   │      POST /auth/refresh { refreshToken } → new token pair
   │      Old refresh token is immediately blocklisted (rotation)
   │
   └── Logout: access token JTI written to Redis blocklist until expiry
```

Passwords are hashed with bcrypt (cost factor 12 in production). The login endpoint uses a constant-time comparison on both existing and non-existing users to prevent timing-based user enumeration.

---

## Running Tests

```bash
# Unit tests only (no external services required)
npm run test:unit

# Full suite (requires running Docker services)
docker-compose up -d
npm run test

# With coverage
npm run test:coverage
```

---

## Deployment

### Railway (recommended)

1. Push to GitHub
2. Connect repository in Railway dashboard
3. Set all required environment variables
4. Railway auto-runs `prisma migrate deploy` via the start command

### Other platforms (Render, Fly.io)

The `Dockerfile` produces a minimal production image. Any platform that runs Docker containers works. Ensure `DATABASE_URL` and `REDIS_URL` point to managed instances (Supabase, Upstash, etc.).

---

## Design Decisions and Trade-offs

**Why Redis for token blocklist rather than a DB table?**
Access token TTLs are short (15 min). Redis key expiry maps directly to token expiry — no cleanup job needed. Blocklist checks are O(1) and add ~1ms to each authenticated request.

**Why Prisma Decimal for amounts?**
JavaScript's `Number` type cannot represent all decimal values exactly (0.1 + 0.2 ≠ 0.3). Storing financial amounts as `DECIMAL(12,2)` in PostgreSQL and using Prisma's `Decimal` wrapper prevents rounding errors at the persistence layer.

**Why not store userId on the JWT and skip the DB lookup on auth?**
We do store it on the JWT — this is how `req.user` is populated without a DB call on every request. The only DB interaction on authenticated routes is for the actual resource query, not re-validating the user identity.

**Why reassign transactions to "Other" on category deletion?**
Deleting a category that has transactions would violate the foreign key constraint. Soft-deleting categories adds complexity. Reassigning preserves history without orphaning records.

---

## What I'd Improve With More Time

- **Refresh token family tracking** — detect and alert on refresh token reuse (indicator of token theft)
- **Recurring transactions** — schedule-based creation for fixed monthly expenses
- **Multi-currency support** — store currency code per transaction, daily exchange rate snapshots
- **Export endpoints** — CSV/PDF statements for a date range
- **WebSockets** — push real-time balance updates to connected dashboard clients
- **Observability** — OpenTelemetry traces, Prometheus metrics, Grafana dashboards
