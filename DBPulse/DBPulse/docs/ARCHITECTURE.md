# DBPulse — Architecture Document

**Version:** 1.0
**Date:** 2026-05-29

---

## 1. System Overview

DBPulse follows a **monorepo** structure with a clear separation between the frontend, backend API, database connectors, and shared packages. All components communicate via REST and Server-Sent Events (SSE).

```
+-----------------------------------------------------+
|                   DBPulse Platform                  |
|                                                     |
|  +----------------+   +-------------------------+  |
|  | DB Connectors  |   |   Next.js Frontend      |  |
|  | (per engine)   |   |   Tree View / Timeline  |  |
|  | pg / mysql2    |   |   Diff View / Alerts UI |  |
|  | mssql / mongo  |   +-------------------------+  |
|  | sqlite / redis |           REST / SSE            |
|  +------+---------+   +-------------------------+  |
|         |             |   NestJS API Backend    |  |
|         v             |   Event Processor       |  |
|  +----------------+   |   Diff Engine           |  |
|  | Event Capture  |   |   Alert Manager         |  |
|  | CDC / Triggers |   +-------------------------+  |
|  | Change Streams |            |                   |
|  +----------------+  +---------+---------------+  |
|                       |  Supabase PostgreSQL   |  |
|                       |  (Audit Event Storage) |  |
|                       |  + Redis (Live cache)  |  |
|                       +-----------------------+   |
+-----------------------------------------------------+
```

---

## 2. Repository Structure

```
DBPulse/
+-- apps/
|   +-- web/                    # Next.js 14 frontend
|   |   +-- app/                # App Router pages
|   |   +-- components/
|   |   |   +-- tree/           # Activity Explorer tree
|   |   |   +-- diff/           # Diff viewer component
|   |   |   +-- timeline/       # Global timeline feed
|   |   |   +-- alerts/         # Alert rules UI
|   |   +-- lib/                # API client, utils
|   |   +-- types/              # Shared TS types
|   |
|   +-- api/                    # NestJS backend
|       +-- src/
|           +-- connectors/     # DB connector modules
|           +-- events/         # Event processing service
|           +-- diff/           # Diff engine service
|           +-- alerts/         # Alert rule engine
|           +-- auth/           # Supabase Auth guard
|           +-- storage/        # Supabase storage service
|
+-- packages/
|   +-- connectors/             # Pluggable DB adapters
|   |   +-- postgres/
|   |   +-- mysql/
|   |   +-- mssql/
|   |   +-- mongodb/
|   |   +-- sqlite/
|   |   +-- redis/
|   +-- diff-engine/            # Before/after diff module
|   +-- shared/                 # Types, constants, utils
|
+-- docs/
|   +-- PRD.md
|   +-- ARCHITECTURE.md
|   +-- ROADMAP.md
|
+-- docker-compose.yml
+-- .env.example
+-- turbo.json                  # Turborepo config
```

---

## 3. Frontend Architecture (Next.js 14)

### 3.1 Stack
- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **State Management:** Zustand
- **Data Fetching:** TanStack Query (React Query)
- **Real-time:** EventSource (SSE) for live event stream

### 3.2 Key Pages

| Route | Description |
|---|---|
| `/` | Dashboard overview |
| `/explorer` | Activity Explorer (Tree View) |
| `/timeline` | Global Timeline Feed |
| `/actor/[id]` | Actor profile & history |
| `/table/[db]/[table]` | Table history view |
| `/alerts` | Alert rules management |
| `/settings` | DB connections & config |

### 3.3 Activity Explorer Tree

The tree component is custom-built (no third-party tree library) for full control over expand/collapse, lazy loading, and event diff inline rendering. Each node type:

- **ClusterNode** — top-level grouping
- **DatabaseNode** — per connected DB
- **TableNode** — per table/collection
- **EventNode** — individual audit event (expandable to diff)

---

## 4. Backend Architecture (NestJS)

### 4.1 Stack
- **Framework:** NestJS 10
- **Language:** TypeScript
- **Transport:** REST API + SSE (Server-Sent Events)
- **ORM:** Supabase JS client (no ORM, raw SQL via supabase-js)
- **Queue:** BullMQ (Redis-backed) for event processing

### 4.2 Core Modules

| Module | Responsibility |
|---|---|
| `ConnectorsModule` | Manages DB connections, health checks |
| `EventsModule` | Receives, classifies, stores audit events |
| `DiffModule` | Computes before/after column-level diffs |
| `AlertsModule` | Evaluates alert rules, triggers notifications |
| `StreamModule` | SSE endpoint for real-time event push |
| `AuthModule` | Supabase Auth JWT validation guard |
| `StorageModule` | Reads/writes to Supabase audit_events table |

### 4.3 Event Processing Pipeline

```
DB Change Detected
      |
      v
Connector Adapter (postgres/mysql/mongo/...)
      |
      v
Raw Event Normalized --> EventSchema
      |
      v
Diff Engine --> before_state + after_state + diff_columns[]
      |
      v
Event stored in Supabase (audit_events table)
      |
      v
Redis Pub/Sub publish --> SSE broadcast to connected clients
      |
      v
Alert Engine evaluates rules --> Notification dispatched
```

---

## 5. Connector Architecture

Each DB connector implements a shared `IConnector` interface:

```typescript
interface IConnector {
  connect(config: ConnectionConfig): Promise<void>;
  disconnect(): Promise<void>;
  startCapture(handler: EventHandler): Promise<void>;
  stopCapture(): Promise<void>;
  healthCheck(): Promise<HealthStatus>;
}
```

### Capture Methods Per Engine

| Engine | Method | Notes |
|---|---|---|
| PostgreSQL | pg_audit + LISTEN/NOTIFY | Requires pg_audit extension |
| MySQL | binlog parsing | Requires REPLICATION privilege |
| MSSQL | CDC polling | Requires CDC enabled on DB |
| MongoDB | Change Streams | Requires replica set |
| SQLite | WAL polling | File-based, periodic scan |
| Redis | MONITOR + keyspace | High-verbosity, use carefully |

---

## 6. Data Model

### audit_events (Supabase PostgreSQL)

```sql
CREATE TABLE audit_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL,
  database_name TEXT NOT NULL,
  schema_name   TEXT,
  table_name    TEXT,
  operation     TEXT NOT NULL,  -- INSERT/UPDATE/DELETE/DDL/DCL/CONNECT
  actor         TEXT NOT NULL,
  session_info  JSONB,
  before_state  JSONB,
  after_state   JSONB,
  diff_columns  JSONB,
  raw_query     TEXT,
  event_hash    TEXT,           -- SHA-256 tamper-evident hash
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### db_connections

```sql
CREATE TABLE db_connections (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  engine        TEXT NOT NULL,  -- postgres/mysql/mssql/mongodb/sqlite/redis
  host          TEXT,
  port          INTEGER,
  database_name TEXT,
  credentials   TEXT,           -- AES-256 encrypted JSON
  status        TEXT DEFAULT 'disconnected',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 7. Real-time Event Flow

```
DB Engine
   |
   | (binlog / change stream / trigger)
   v
NestJS Connector (per engine)
   |
   | normalize to AuditEvent
   v
Diff Engine
   |
   | computed diff
   v
Supabase INSERT
   |
   v
Redis PUBLISH channel:events
   |
   v
NestJS SSE Controller
   |
   | EventSource stream
   v
Next.js Frontend
   |
   | Zustand store update
   v
Tree / Timeline re-render
```

---

## 8. Security Architecture

| Concern | Implementation |
|---|---|
| DB credentials at rest | AES-256 encryption before storing in Supabase |
| API authentication | Supabase Auth JWT (Bearer token) |
| Row-level security | Supabase RLS policies per user/workspace |
| Tamper-evident logs | SHA-256 hash per event record (event_hash column) |
| Transport | HTTPS enforced in production, WSS for SSE |

---

## 9. Deployment Architecture

### Self-hosted (Docker Compose)

```yaml
services:
  web:       # Next.js frontend  (port 3000)
  api:       # NestJS backend    (port 3001)
  redis:     # Redis              (port 6379)
  # Supabase is external (cloud or self-hosted Supabase)
```

### Cloud Option
- **Frontend:** Vercel (Next.js)
- **Backend API:** Render (NestJS)
- **Database:** Supabase (managed PostgreSQL)
- **Cache:** Upstash Redis

---

*Last updated: 2026-05-29 — Gokul Senthilkumar*
