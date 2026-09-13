# PRD — PulseWatch

## Overview
PulseWatch is a self-hosted uptime and deployment health monitor for Vercel, Render, and custom HTTP endpoints. It provides cron-based polling, Telegram and email alerts, incident history, and a public status page.

---

## Problem Statement
Developers with multiple deployed apps (Vercel, Render, Railway) have no unified way to monitor uptime. Paid tools like Better Uptime cost $20+/mo. Free tools lack customization. There's no simple self-hostable solution that takes 10 minutes to set up.

---

## Goals
- Poll endpoints every 1 minute and record response time + status code
- Send Telegram and/or email alerts when a service goes down or recovers
- Show a public-facing status page (like statuspage.io, but free)
- Store 90-day incident history
- Docker Compose self-host in < 10 minutes

---

## Non-Goals
- No SSL certificate monitoring (v1)
- No domain expiry monitoring (v1)
- No paid managed cloud (v1 — self-host only)

---

## Target Users
- Solo developers and indie hackers with 3-20 deployed apps
- Small dev teams needing a free internal status page
- SDET engineers monitoring staging and production environments

---

## Tech Stack
| Layer | Technology |
|-------|------------|
| Poller | Node.js + node-cron |
| Backend API | Express + TypeScript |
| Database | Supabase PostgreSQL |
| Frontend | Next.js 14, Tailwind CSS |
| Alerts | Telegram Bot API + Nodemailer |
| Self-host | Docker Compose |
| Managed Deploy | Render free tier |

---

## Database Schema
```
monitors (id, name, url, method, interval_sec, owner_id, is_active)
incidents (id, monitor_id, started_at, resolved_at, cause)
pings (id, monitor_id, status_code, response_ms, is_up, checked_at)
alert_channels (id, owner_id, type [telegram|email], config_json)
```

---

## Core Features

### v1.0 (MVP)
- [ ] Add/edit/delete monitors (URL, method, interval)
- [ ] Cron poller every 1 min with response time logging
- [ ] Telegram and email alert on down/up transition
- [ ] Incident timeline view
- [ ] Public status page (shareable URL)

### v1.1
- [ ] Response time graphs (7d, 30d, 90d)
- [ ] Multi-region checks (using 2 Render regions)
- [ ] Slack notification channel
- [ ] Status page custom domain

### v2.0
- [ ] Managed cloud hosting option
- [ ] SSL expiry and domain monitoring
- [ ] Team access with invite links
- [ ] Monthly uptime SLA report PDF

---

## Business Model (v2)
| Plan | Price | Features |
|------|-------|----------|
| Self-host | Free | Unlimited monitors, all features |
| Cloud Starter | $5/mo | 10 monitors, managed hosting |
| Cloud Pro | $12/mo | 50 monitors, custom domain status page |

---

## Success Metrics
- 50 GitHub stars in first month
- < 5 min setup time from clone to running
- 99.9% poller reliability (< 1 missed ping per 1000)
- 100 Docker pulls in first 2 weeks

---

## Risks
| Risk | Mitigation |
|------|------------|
| Render free tier sleep (15 min) | Keep-alive self-ping or upgrade to $7/mo |
| Supabase free tier row limits | Auto-delete pings older than 90 days via cron |
| Alert spam on flaky endpoints | 3-strike rule before triggering alert |
