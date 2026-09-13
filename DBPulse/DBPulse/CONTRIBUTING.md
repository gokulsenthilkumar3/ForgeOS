# Contributing to DBPulse

## Development Setup

```bash
git clone https://github.com/gokulsenthilkumar3/DBPulse.git
cd DBPulse
npm install -g pnpm@9
pnpm install
cp .env.example .env   # fill in your values
pnpm dev               # starts web + api via Turborepo
```

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `SUPABASE_URL` | ✅ | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Service role key (never expose to frontend) |
| `SUPABASE_ANON_KEY` | ✅ | Anon key for frontend |
| `REDIS_URL` | ✅ | Redis connection URL |
| `JWT_SECRET` | ✅ | Min 32 chars — sign/verify API tokens |
| `CREDENTIAL_ENCRYPTION_KEY` | ✅ | Min 32 chars — AES-256-GCM DB credential encryption |
| `API_PORT` | ❌ | Defaults to `3001` |
| `NEXT_PUBLIC_API_URL` | ✅ | Frontend → API base URL |

## Running Tests

```bash
cd apps/api
pnpm test              # run all tests
pnpm test --coverage   # with coverage report
```

## Docker (local full-stack)

```bash
docker compose up --build
```

## Docker (production — uses pre-built GHCR images)

```bash
docker compose -f docker-compose.prod.yml up -d
```

## Branch Strategy

| Branch | Purpose |
|---|---|
| `main` | Production-ready; triggers Docker image push to GHCR |
| `develop` | Integration branch for feature PRs |
| `feat/*` | Feature branches — PR into `develop` |
| `fix/*` | Bug fixes |

## CI Pipeline

Every push/PR runs:
1. **Lint + Type check** — `tsc --noEmit` on api + web
2. **Unit tests** — Jest with Redis service container
3. **Docker build** — validates both images build cleanly
4. On `main` merge — images pushed to `ghcr.io/gokulsenthilkumar3/dbpulse-*`

## Supabase Schema

Run SQL migrations in order:
1. `docs/supabase-schema-phase1.sql` — core tables
2. `docs/supabase-schema-phase3.sql` — alert_rules, alert_firings, stats RPCs
