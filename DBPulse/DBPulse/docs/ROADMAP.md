# DBPulse — Roadmap

**Last updated:** 2026-05-29

This roadmap defines the phased delivery plan for DBPulse. Each phase builds on the previous one, with Phase 1 targeting a shippable MVP and subsequent phases adding depth, compliance, and SaaS capabilities.

---

## Phase 1 — MVP
**Timeline:** 4–6 weeks
**Goal:** Shippable self-hosted product with PostgreSQL + MySQL support

### Connectors
- [ ] PostgreSQL connector (pg + pg_audit / trigger fallback)
- [ ] MySQL connector (mysql2 + binlog parsing)
- [ ] Connection setup wizard UI
- [ ] Connection health check & status badge
- [ ] Multi-connection support (connect multiple DBs simultaneously)

### Event Capture
- [ ] INSERT capture with full new row values
- [ ] UPDATE capture with before/after state diff
- [ ] DELETE capture with deleted row snapshot
- [ ] Actor identification from DB session user
- [ ] Timestamp + timezone for all events

### Frontend UI
- [ ] Activity Explorer — Tree View (Cluster > DB > Table > Event)
- [ ] Color-coded event nodes (green/yellow/red)
- [ ] Event detail panel (actor, time, operation, target, query)
- [ ] Before/after diff view (Git-style column diff)
- [ ] Basic filter bar (by DB, table, operation type)

### Infrastructure
- [ ] NestJS API backend
- [ ] Supabase audit_events table + schema
- [ ] Redis real-time stream (SSE)
- [ ] Docker Compose self-hosted setup
- [ ] `.env.example` with all required vars
- [ ] Basic Supabase Auth (email/password)

### Deliverable
> A developer can connect their PostgreSQL or MySQL database and see a live tree of all INSERT/UPDATE/DELETE events with full before/after diffs in under 5 minutes.

---

## Phase 2 — Expansion
**Timeline:** 4 weeks
**Goal:** Broader DB support, schema change tracking, and alerting

### Connectors
- [ ] Microsoft SQL Server connector (mssql + CDC)
- [ ] MongoDB connector (mongoose + Change Streams)

### Event Capture
- [ ] DDL: CREATE TABLE, ALTER TABLE, DROP TABLE, TRUNCATE
- [ ] DDL: Column additions, type changes, constraint modifications
- [ ] DCL: GRANT, REVOKE, CREATE USER, DROP USER
- [ ] Connection events: login, logout, failed login, IP, session duration

### Frontend UI
- [ ] Global Timeline Feed (chronological, all DBs, with filters)
- [ ] Actor Profile page (full event history per DB user)
- [ ] Table History view (full lifecycle of a table)
- [ ] Anomaly highlights (bulk DELETE at odd hours, schema changes from unknown actors)
- [ ] Advanced filters (time range picker, multi-select operation types)

### Alerting
- [ ] Alert rule builder UI
- [ ] TRUNCATE / DROP on production table trigger
- [ ] Bulk DELETE > N rows trigger
- [ ] Schema change outside defined migration window
- [ ] Login from unrecognized IP / service account
- [ ] Access to sensitive columns (configurable column list)
- [ ] Email delivery (Nodemailer)
- [ ] Telegram Bot notification
- [ ] Slack webhook notification
- [ ] In-app notification center

### Deliverable
> Teams can track schema changes, monitor MSSQL and MongoDB, and receive instant Telegram/Email alerts for dangerous operations.

---

## Phase 3 — Compliance & Polish
**Timeline:** 3 weeks
**Goal:** SQLite/Redis support, compliance exports, tamper-evident logs

### Connectors
- [ ] SQLite connector (better-sqlite3 + WAL polling)
- [ ] Redis connector (ioredis + MONITOR + keyspace notifications)

### Compliance
- [ ] PDF audit report export (date range, actor, table, operation filters)
- [ ] CSV export of raw audit events
- [ ] Tamper-evident log hashing (SHA-256 per event, stored in event_hash)
- [ ] Log integrity verification endpoint
- [ ] Configurable retention policies (7d / 30d / 90d / indefinite)
- [ ] GDPR mode flag (masks PII columns in UI)

### Polish
- [ ] Dark/light theme toggle
- [ ] Keyboard shortcuts for tree navigation
- [ ] Onboarding flow for first-time users
- [ ] Performance: virtual scroll for high-volume event trees
- [ ] Export tree view snapshot as JSON

### Deliverable
> Compliance teams can generate PDF/CSV audit reports for GDPR, SOC 2, and HIPAA reviews. Logs are tamper-evident and retention is fully configurable.

---

## Phase 4 — SaaS Option
**Timeline:** Ongoing
**Goal:** Cloud-hosted multi-tenant version with team workspaces

### Multi-Tenancy
- [ ] Team workspaces (invite members, role-based access)
- [ ] Workspace-level DB connection isolation
- [ ] Workspace billing (Stripe integration)
- [ ] Usage-based pricing (events/month tiers)

### Cloud Infrastructure
- [ ] Vercel deployment for frontend
- [ ] Render / Fly.io for NestJS API
- [ ] Upstash Redis for managed cache
- [ ] Supabase managed PostgreSQL (per-workspace)

### Developer API
- [ ] Public REST API for programmatic audit log access
- [ ] API key management UI
- [ ] Webhook delivery for audit events (push to external systems)
- [ ] OpenAPI / Swagger documentation

### Open Source
- [ ] Open-source core (self-hosted) with MIT license
- [ ] Public roadmap & community voting
- [ ] Plugin system for custom connectors
- [ ] Docker Hub image publishing

---

## Version History

| Version | Phase | Date |
|---|---|---|
| v0.1.0 | Phase 1 MVP | TBD |
| v0.2.0 | Phase 2 Expansion | TBD |
| v0.3.0 | Phase 3 Compliance | TBD |
| v1.0.0 | Phase 4 SaaS | TBD |

---

*Roadmap is subject to change based on community feedback and priorities.*
*Last updated: 2026-05-29 — Gokul Senthilkumar*
