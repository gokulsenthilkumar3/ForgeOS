<div align="center">

# 🔍 DBPulse

### Universal Database Activity Intelligence Platform

**Real-time audit logs · Row-level diffs · Cross-database observability**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-10-red.svg)](https://nestjs.com/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black.svg)](https://nextjs.org/)
[![Deploy](https://img.shields.io/badge/Deployed%20on-Vercel-black?logo=vercel)](https://dbpulse.vercel.app)

</div>

---

## What is DBPulse?

DBPulse is a **developer-first, universal database audit and activity intelligence platform** that connects to any database — MySQL, PostgreSQL, Microsoft SQL Server, MongoDB, SQLite, Redis — and presents a beautifully structured, real-time log of every operation across all your databases in one place.

It answers the most critical question in any data-driven system:

> **Who did what, to which data, on which table, and when?**

No more digging through raw query logs or enabling obscure server-side audit plugins manually. DBPulse surfaces everything in a rich, intuitive UI with tree-based navigation, timeline views, and diff-level change inspection.

---

## The Problem

Modern applications connect to multiple databases. When data changes unexpectedly — a row is missing, a column gets altered, a record is corrupted — the answer is never easy to find.

| Current Approach | Pain Point |
|---|---|
| Raw query logs | Unstructured, hard to read, varies per DB engine |
| Native audit tools (pg_audit, SQL Server Audit) | Complex config, verbose output, no cross-DB view |
| APM tools (Datadog, New Relic) | High-level query tracking, no row-level diff data |
| Manual investigation | Time-consuming, error-prone, no single source of truth |

DBPulse fills this gap entirely.

---

## Supported Databases

| Database | Engine | Capture Method |
|---|---|---|
| PostgreSQL | Relational | `pg_audit` extension + trigger-based logging |
| MySQL / MariaDB | Relational | General Query Log + Binary Log (binlog) parsing |
| Microsoft SQL Server | Relational | Change Data Capture (CDC) + SQL Server Audit |
| MongoDB | Document | Native Change Streams (`db.watch()`) |
| SQLite | Embedded | WAL (Write-Ahead Log) parsing |
| Redis | Key-Value | MONITOR command + keyspace notifications |

---

## Core Features

### Activity Explorer — Tree View

```
📦 Production Database Cluster
├── 🗄️ PostgreSQL — users_db
│   ├── 📋 users (table)
│   │   ├── 🟡 UPDATE · Gokul · 2026-05-29 14:32:11
│   │   │   ├── Row ID: 4821
│   │   │   ├── email: old@domain.com → new@domain.com
│   │   │   └── updated_at: NULL → 2026-05-29T14:32:11Z
│   │   ├── 🟢 INSERT · system_job · 2026-05-29 14:30:00
│   │   └── 🔴 DELETE · admin · 2026-05-29 13:55:42
│   └── 📋 orders (table)
│       └── 🟡 ALTER TABLE · migration_runner · 2026-05-29 12:00:00
│           └── Added column: `discount_code VARCHAR(50)`
├── 🗄️ MongoDB — analytics_db
│   └── 📦 events (collection)
│       └── 🟢 INSERT (bulk) · api_service · 2026-05-29 14:31:55
└── 🗄️ MySQL — legacy_crm
    └── 📋 contacts (table)
        └── 🔴 TRUNCATE · root · 2026-05-28 03:12:00 ⚠️
```

### Event Capture

- **DML** — SELECT, INSERT, UPDATE (with before/after diff), DELETE
- **DDL** — CREATE, ALTER, DROP, TRUNCATE, RENAME
- **DCL** — GRANT, REVOKE, CREATE USER, DROP USER
- **Connection Events** — Login attempts, session start/end, IP tracking

### Diff View

Every UPDATE shows a Git-style side-by-side column diff:

```diff
- email: old@domain.com
+ email: new@domain.com
- updated_at: NULL
+ updated_at: 2026-05-29T14:32:11Z
```

### Alerting

Real-time notifications for:
- TRUNCATE or DROP on production tables
- Bulk DELETE above configurable threshold
- Schema changes outside migration windows
- Login from unrecognized IP
- Access to sensitive PII/financial columns

Delivered via **Telegram · Email · Slack webhooks · In-app**

### Compliance & Export

- PDF/CSV audit reports (GDPR, SOC 2, HIPAA ready)
- Tamper-evident logs with integrity hashes
- Configurable retention policies (7 days → indefinite)

---

## UI Overview

### Dashboard Layout

```
┌─────────────────┬──────────────────────────────────────────────┐
│  ⚡ DBPulse  ●  │  ⚡ Live Events  │  📊 Statistics  │  🔔 Alerts  │
├─────────────────┼─────────────────────────┬────────────────────┤
│                 │                         │                    │
│  Connections    │   EventFeed             │   DiffViewer       │
│  ─────────────  │   (live stream)         │   before / after   │
│  🟢 prod-pg     │                         │   JSON diff        │
│  🔴 staging-pg  │   scrollable list       │   highlighted cols │
│  🔵 analytics   │   max 200 events        │                    │
│                 ├─────────────────────────┴────────────────────┤
│  + Add Conn     │   StatsPanel  /  AlertRulesPanel (on tab)    │
│                 │                                              │
│  ─────────────  │                                              │
│  ⎋ Sign out     │                                              │
└─────────────────┴──────────────────────────────────────────────┘
```

### Components

| Component | Description |
|---|---|
| `ConnectionTree` | Lists DB connections; green dot = live, click to connect/disconnect; inline add form |
| `EventFeed` | Real-time event stream via `useAuditStream`; click a row to load its diff; capped at 200 events |
| `DiffViewer` | Renders before/after JSON for selected event with highlighted changed columns |
| `StatsPanel` | 3-card analytics view: ops donut chart, top tables bar, top actors bar — fetched on tab switch |
| `AlertRulesPanel` | Full CRUD for alert rules — condition builder, enable/disable toggle, delete |

### Real-time Architecture

```
user selects connection
  → useAuditStream subscribes to Socket.IO room conn:<id>
    → server broadcasts audit_event
      → component receives, prepends to list (max 200)
        → click event → DiffViewer renders before/after diff
```

Switching connections emits `unsubscribe` to the old room before joining the new one — no cross-connection event bleed.

### Auth Flow

```
LoginPage → POST /auth/login → JWT
  → AuthContext stores token in localStorage
  → lib/api.ts attaches Authorization: Bearer <token> to every request
  → lib/socket.ts singleton uses same token on WebSocket handshake
  → auto-redirect to /login on any 401 response
```

### Tailwind Design Tokens

Add these custom tokens to `apps/web/tailwind.config.ts`:

```ts
theme: {
  extend: {
    colors: {
      brand:           '#6366f1',
      'brand-dark':    '#4f46e5',
      surface:         '#0f1117',
      'surface-card':  '#161b27',
      'surface-border':'#1e2535',
    },
  },
},
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| Backend API | NestJS, TypeScript |
| DB Drivers | `pg`, `mysql2`, `mssql`, `mongoose`, `better-sqlite3`, `ioredis` |
| Diff Engine | Custom TypeScript module |
| Audit Storage | Supabase (PostgreSQL) |
| Real-time | Socket.IO (WebSockets) |
| Auth | JWT (localStorage persistence) |
| Deployment | Vercel (frontend) · Render (API) · Docker Compose (self-hosted) |
| Notifications | Nodemailer, Telegram Bot API, Slack webhooks |

---

## Quick Start

```bash
# Clone the repo
git clone https://github.com/gokulsenthilkumar3/DBPulse.git
cd DBPulse

# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env
# Edit .env with your DB credentials and JWT secret

# Start with Docker Compose (recommended)
docker compose up -d

# Or run in dev mode
pnpm dev

# Access the UI
open http://localhost:3000
```

### Install UI Dependencies

```bash
cd apps/web
pnpm add socket.io-client clsx
```

---

## Deployment

### Vercel (Frontend)

The `vercel.json` at the repo root configures automatic deployment:

```bash
# One-time setup
npx vercel link
npx vercel env add NEXT_PUBLIC_API_URL

# Deploy
npx vercel --prod
```

Or connect the GitHub repo to Vercel for automatic deploys on every push to `main`.

**Required environment variables:**

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Backend API base URL (e.g. `https://dbpulse-api.onrender.com`) |
| `NEXT_PUBLIC_WS_URL` | WebSocket server URL |

### Docker (Self-hosted)

```bash
docker compose -f docker-compose.prod.yml up -d
```

---

## Project Structure

```
DBPulse/
├── apps/
│   ├── web/                  # Next.js 14 frontend
│   │   ├── app/              # App Router pages
│   │   ├── components/       # UI components
│   │   ├── context/          # AuthContext
│   │   ├── hooks/            # useAuditStream, useConnections
│   │   └── lib/              # api.ts, socket.ts
│   └── api/                  # NestJS backend
├── packages/
│   ├── connectors/           # Per-DB driver adapters
│   ├── diff-engine/          # Before/after diff module
│   └── shared/               # Shared types & utilities
├── docs/
│   ├── PRD.md
│   ├── ARCHITECTURE.md
│   └── ROADMAP.md
├── vercel.json
├── docker-compose.yml
└── .env.example
```

---

## Roadmap

| Phase | Focus | Status |
|---|---|---|
| Phase 1 — MVP | PostgreSQL + MySQL, DML capture, Tree UI, Docker | ✅ Complete |
| Phase 2 — Expansion | MSSQL + MongoDB, DDL tracking, Alerts | 📋 Planned |
| Phase 3 — Compliance | SQLite + Redis, PDF export, Tamper-evident logs | 📋 Planned |
| Phase 4 — SaaS | Cloud-hosted, multi-tenant, public API | 📋 Planned |

See [`docs/ROADMAP.md`](docs/ROADMAP.md) for full details.

---

## Why DBPulse?

| Capability | DBPulse | Datadog / APM | Native DB Audit |
|---|---|---|---|
| Multi-database (MySQL + Mongo + PG) | ✅ | ⚠️ Partial | ❌ Per-engine |
| Row-level before/after diff | ✅ | ❌ | ⚠️ Verbose raw |
| Beautiful tree UI | ✅ | ❌ | ❌ |
| Schema change tracking (DDL) | ✅ | ⚠️ | ✅ |
| Actor-level drill-down | ✅ | ⚠️ | ❌ |
| Self-hostable | ✅ | ❌ | N/A |
| Real-time alerts | ✅ | ✅ | ⚠️ Manual |
| Compliance export (PDF/CSV) | ✅ | ✅ | ❌ |
| Zero-config setup | ✅ | ❌ | ❌ |

---

## Contributing

Contributions are welcome! Please read [`CONTRIBUTING.md`](CONTRIBUTING.md) before submitting a PR.

---

## License

MIT © [Gokul Senthilkumar](https://github.com/gokulsenthilkumar3)
