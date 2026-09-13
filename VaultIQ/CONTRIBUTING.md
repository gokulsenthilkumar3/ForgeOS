# Contributing to VaultIQ

Thank you for considering contributing to VaultIQ! This document outlines our development standards.

## Branch Naming

| Type | Pattern | Example |
|---|---|---|
| Feature | `feat/<short-desc>` | `feat/ai-rag-search` |
| Bug Fix | `fix/<short-desc>` | `fix/checkout-race-condition` |
| Improvement | `improvement/<short-desc>` | `improvement/swagger-docs` |
| Chore | `chore/<short-desc>` | `chore/update-deps` |

## Commit Messages

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add QR scanner fallback for manual input
fix: prevent double checkout race condition
test: add unit tests for BlockchainService
docs: update API setup instructions
```

## Pull Request Checklist

- [ ] Unit tests added/updated for changed logic
- [ ] No hardcoded secrets or credentials
- [ ] Swagger `@ApiOperation` decorators added to new endpoints
- [ ] `prisma migrate dev` run if schema changed
- [ ] All CI checks pass

## Local Development Setup

```bash
# Start full local stack
docker compose up -d

# Backend (in /backend)
npm ci
npx prisma migrate dev
npm run start:dev

# Frontend (in /frontend)
npm ci
npm run dev

# Run tests
npm run test
npm run test:cov
```

## Code Style

- Backend: NestJS conventions, strict TypeScript, no `any` types
- Frontend: Next.js App Router, Tailwind CSS, co-located component tests
- All new services must have a corresponding `.spec.ts` file
