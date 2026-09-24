# ForgeOS

ForgeOS brings 14 engineering tools into one browser UI. The public application address is `http://localhost:3000`; API and tool services run privately behind it.

This app is part of the single parent repository at `D:\Projects\ForgeOS`. The sibling product folders are tracked in that repository and are not separate ForgeOS deployments. The overview's **Customize modules** control saves workspace-level enable/disable choices; disabled modules are hidden from navigation and blocked in the module workbench.

## Start locally

1. Copy `.env.example` to `.env`, replace every placeholder password and secret, and set `FORGEOS_MINIO_IMAGE` as described below.
2. Start Docker Desktop, then run `docker compose up --build` from this directory.
3. Open `http://localhost:3000` and sign in with `FORGEOS_ADMIN_PASSWORD`.

The web routes are `/modules/<module-id>`, ForgeOS API routes are `/api/v1/*`, MathShield uses `/api/mathshield/*` and `/shield.js`, and PulseWatch uses `/api/pulsewatch/*`. Compose publishes only one application port. Set `FORGEOS_PUBLIC_PORT` if port 3000 is already in use, then open `http://localhost:<that-port>`.

### Storage image and existing data

`FORGEOS_MINIO_IMAGE` is required. Compose deliberately has no default: the former floating `minio/minio` image can no longer be pulled reliably, and automatically selecting another image for an existing `minio-data` volume could downgrade its storage format. **Do not remove the volume or change its image until you have identified the running version and backed up its data.** Identify the ForgeOS MinIO container in Docker Desktop or with `docker ps -a --filter label=com.docker.compose.service=minio`, then inspect that verified container ID:

```powershell
$minioContainer = '<verified ForgeOS MinIO container ID>'
docker inspect $minioContainer --format '{{.Config.Image}}'
docker exec $minioContainer minio --version # when the container is running
```

Set `FORGEOS_MINIO_IMAGE` in `.env` to that same inspected image reference before restarting. If the old container/image cannot be inspected, recover its version from your deployment records or backup before changing the image. New installations should use a reviewed, version-pinned MinIO image compatible with this Compose command. The CI workflow uses `quay.io/minio/minio:RELEASE.2025-09-07T16-13-09Z` **only with disposable test data**. That official Quay release predates MinIO's [2025-10-15 security fix](https://github.com/minio/minio/releases/tag/RELEASE.2025-10-15T17-29-55Z); do not treat the CI pin as a patched production choice. MinIO's release instructions require building the patched container from that source tag, then setting `FORGEOS_MINIO_IMAGE` to the resulting local or private-registry image. Validate storage compatibility and backup recovery before upgrading a persistent deployment.

## Available workbenches

CommitCraft drafts conventional commits and can call OpenAI or Anthropic with a key you provide. StackForge downloads project ZIPs. SnapDiff compares two screenshots. Comparer compares text, SQL, and JSON. RegexForge tests JavaScript regular expressions. Load Lab creates K6 scripts. PromptVault saves local prompt versions and runs models. ProbeAI compares responses and runs small model evaluations. PulseWatch monitors endpoints and tracks incidents. DBPulse explores ForgeOS audit events. GLBViewer opens local GLB models. CraftCV edits and prints a CV. VaultIQ encrypts a local vault in your browser. MathShield generates and verifies challenges.

These are working entry points, not full parity with every standalone product. The [migration checklist](docs/MODULE-MIGRATION.md) tracks remaining features, including worker execution, database connectors, team access, artifact sharing, and enterprise deployment.

## Development

Install dependencies with `pnpm install`. The ForgeOS API requires PostgreSQL via `DATABASE_URL`; MathShield and PulseWatch run from their source folders. `pnpm build` checks the ForgeOS packages. For local web development, `pnpm --filter @forgeos/web dev -- --port 3002` loads valid credentials from `.env`; when those are still example values, it creates an ignored `apps/web/.env.local` with random credentials. Open that file to find the administrator password, then restart any web server that was already running. Production and Docker deployments must supply their own strong credentials.

Do not run the standalone web dev server on port 3000 while Compose owns that port. The dev launcher checks that its configured API URL responds as ForgeOS; it exits with an explanation if another application is listening there. Use Compose for the complete one-port product. Run `node scripts/smoke.mjs` with `FORGEOS_ADMIN_PASSWORD` set to check the signed-in routes on the configured public address.
