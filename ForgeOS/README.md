# ForgeOS

ForgeOS is the unified engineering operations platform. It consolidates delivery, quality, AI, observability, database governance, asset tools, and secure utilities behind one workspace-aware console.

## Quick start

```bash
pnpm install
pnpm dev
```

The web console runs on port `3000`, the API on `4000`, and the worker starts independently. Copy `.env.example` to `.env` to connect PostgreSQL, Redis, and S3-compatible storage; the console remains usable in demo mode without them.

## Product modules

- Delivery: CommitCraft, StackForge, SnapDiff
- Quality: Comparer, RegexForge, Load Lab (K6)
- AI: PromptVault, ProbeAI
- Operations: PulseWatch, DBPulse
- Assets: GLBViewer, CraftCV, VaultIQ

## Deployment

`docker compose up --build` starts the cloud-compatible local stack. Helm values under `infra/helm/forgeos` are for customer-managed Kubernetes deployments.
