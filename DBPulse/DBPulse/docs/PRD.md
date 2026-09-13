# DBPulse — Product Requirements Document (PRD)

**Version:** 1.0
**Date:** 2026-05-29
**Author:** Gokul Senthilkumar
**Status:** Active

---

## 1. Executive Summary

DBPulse is a **universal database audit and activity intelligence platform** for developers, DBAs, and engineering teams. It captures every database operation across MySQL, PostgreSQL, MSSQL, MongoDB, SQLite, and Redis, and surfaces them in a unified real-time UI with row-level diff inspection, actor tracking, and compliance reporting.

---

## 2. Problem Statement

### 2.1 Core Problem
When data changes unexpectedly in production, developers have no fast way to answer:
- Who changed this row?
- What was the value before?
- Which service account dropped that table?
- Did schema changes happen during this incident window?

### 2.2 Current Solutions Are Inadequate

| Tool | Gap |
|---|---|
| Raw DB logs | Unstructured, per-engine, hard to parse |
| pg_audit / SQL Server Audit | PostgreSQL/MSSQL only, no UI, complex setup |
| Datadog / New Relic | Query-level only, no row diff, expensive |
| Custom audit triggers | Fragile, non-portable, manual maintenance |

---

## 3. Goals & Success Metrics

| Goal | Metric | Target |
|---|---|---|
| Fast onboarding | Time to first connection | < 5 minutes |
| Real-time capture | Event capture latency | < 2 seconds |
| Snappy UI | Tree View load time | < 1.5 seconds |
| Compliance | Report generation time | < 30 seconds |
| Easy deployment | Docker setup to running | < 10 minutes |

---

## 4. Target Users

| User | Core Need |
|---|---|
| Full-stack Developer | Debug unexpected data changes |
| DBA / Data Engineer | Schema change tracking, audit trails |
| DevOps / SRE | Production anomaly detection |
| Compliance Officer | GDPR/SOC 2/HIPAA audit reports |
| MSME Startup Teams | Self-hosted, zero-cost observability |

---

## 5. Feature Requirements

### 5.1 Database Connectivity

**MVP (Phase 1)**
- [ ] PostgreSQL via pg + pg_audit
- [ ] MySQL via mysql2 + binlog parsing
- [ ] Guided connection setup wizard
- [ ] Connection health check & status indicator
- [ ] Multiple simultaneous database connections

**Phase 2**
- [ ] Microsoft SQL Server via mssql + CDC
- [ ] MongoDB via mongoose + Change Streams

**Phase 3**
- [ ] SQLite via better-sqlite3 + WAL parsing
- [ ] Redis via ioredis + MONITOR + keyspace notifications

### 5.2 Event Capture

**MVP**
- [ ] DML: INSERT, UPDATE (before/after diff), DELETE
- [ ] Actor identification (DB user / service account)
- [ ] Timestamp with timezone
- [ ] Target: database > schema > table > row

**Phase 2**
- [ ] DDL: CREATE TABLE, ALTER TABLE, DROP, TRUNCATE
- [ ] DCL: GRANT, REVOKE, CREATE USER, DROP USER
- [ ] Connection events: login, logout, failed login, IP

### 5.3 Activity Explorer UI

**MVP**
- [ ] Tree navigation: Cluster > DB > Table > Event
- [ ] Color-coded operation types
- [ ] Event detail panel (actor, time, operation, target)
- [ ] Before/after Git-style column diff view

**Phase 2**
- [ ] Global timeline feed across all DBs
- [ ] Filters: DB, table, actor, operation, time range
- [ ] Actor profile page
- [ ] Table history view
- [ ] Anomaly highlights (bulk DELETE at 3am, etc.)

### 5.4 Alerting

**Phase 2**
- [ ] Alert rule builder
- [ ] TRUNCATE/DROP on production table
- [ ] Bulk DELETE > N rows
- [ ] Schema change outside migration window
- [ ] Unrecognized IP login
- [ ] Channels: Email, Telegram, Slack, In-app

### 5.5 Compliance & Export

**Phase 3**
- [ ] PDF audit reports (GDPR, SOC 2, HIPAA)
- [ ] CSV export of raw events
- [ ] Tamper-evident SHA-256 log hashing
- [ ] Configurable retention (7d / 30d / 90d / indefinite)

---

## 6. Non-Functional Requirements

| Category | Requirement |
|---|---|
| Performance | Handle 10,000 events/min without UI lag |
| Security | DB credentials encrypted at rest (AES-256) |
| Privacy | No raw query data sent to external services |
| Deployment | Single `docker compose up` for self-hosted setup |
| Browser Support | Chromium (Chrome, Edge) + Firefox |

---

## 7. Out of Scope (v1)

- Query performance profiling / EXPLAIN analysis
- Database backup and restore
- Query builder or SQL editor
- Multi-tenant SaaS billing (Phase 4)
- Mobile application

---

## 8. Risks & Mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| pg_audit not installed on target DB | High | Fallback to trigger-based logging |
| binlog access needs REPLICATION privilege | Medium | Setup wizard includes privilege checklist |
| High event volume overwhelming storage | Medium | Configurable sampling + retention policies |
| DB engine version incompatibilities | Medium | Version matrix testing per connector |

---

*Last updated: 2026-05-29 — Gokul Senthilkumar*
