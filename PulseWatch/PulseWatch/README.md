# ◈ PulseWatch — Uptime Monitor

A retro-terminal styled uptime monitoring dashboard with real HTTP polling, incident tracking, and a public status page.

## Features

- **Dashboard** — live stats: endpoints up/down, 24h uptime %, checks count, open incidents
- **Endpoints** — add / edit / delete monitored URLs, set polling interval & timeout, manual check
- **Incidents** — auto-created on DOWN events, auto-resolved on recovery, with duration
- **Settings** — notification channels (email, webhook, Slack), keyboard shortcuts
- **Status Page** — public-facing `/status`, auto-refreshes every 30s
- **Alerts Panel** — toggle with `Alt+T`

## Stack

| Layer    | Tech |
|----------|------|
| Frontend | React 18 + TypeScript + Vite + Recharts |
| Backend  | Node.js + Express + axios + node-cron |
| Styling  | Custom CSS (retro terminal theme, Share Tech Mono) |
| Deploy   | Docker Compose / Vercel (frontend) + Render (backend) |

## Quick Start

### Local (without Docker)

```bash
# Backend
cd backend
npm install
npm run dev   # runs on http://localhost:4000

# Frontend (new terminal)
cd frontend
npm install
npm run dev   # runs on http://localhost:5173
```

### Docker Compose

```bash
docker-compose up --build
# Frontend → http://localhost:5173
# Backend  → http://localhost:4000
```

## API Reference

| Method | Route | Description |
|--------|-------|-------------|
| GET    | `/api/endpoints` | List all endpoints |
| POST   | `/api/endpoints` | Add endpoint `{name, url, method, interval, timeout}` |
| PUT    | `/api/endpoints/:id` | Update endpoint |
| DELETE | `/api/endpoints/:id` | Delete endpoint |
| POST   | `/api/endpoints/:id/check` | Trigger manual check |
| GET    | `/api/incidents` | List all incidents |
| GET    | `/api/notifications` | List notifications |
| POST   | `/api/notifications/read-all` | Mark all read |
| GET    | `/api/stats` | Dashboard stats summary |

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Alt + T` | Toggle alerts panel |
