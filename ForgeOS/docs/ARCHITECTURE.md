# Architecture

## Running application

ForgeOS uses a Next.js console, a NestJS API and workspace-scoped PostgreSQL records. Compose publishes the web service on port 3000; API, MathShield, PulseWatch, PostgreSQL, Redis and storage are private Compose services. A private Compose service is not an internet-isolated sandbox: the default Docker network still permits outbound connections.

Next.js forwards `/api/v1/*` to the API, `/api/mathshield/*` and `/shield.js` to MathShield, and PulseWatch requests to its service. Both web middleware and API guards protect platform requests. Authentication defaults to physical-key WebAuthn. Installations explicitly configured with FORGEOS_AUTH_MODE=password accept account email/password sessions; enrollment-only sessions remain restricted. Both web and API enforce the configured mode. Workspace membership and role checks scope platform reads and writes. Agent registration and short-lived read-only grants use human approval, Ed25519 signatures and replay nonces.

The shared contracts package defines the module catalog. Workspace module settings control navigation and record access. PostgreSQL owns workspace/project metadata and module records. Existing role checks and hash-chained audit events apply to module record writes. Some tool state remains browser-local; full persistence and full source parity are not complete.

MathShield is human verification and bot protection. AgentShield is a distinct module for administrator agent-policy drafts and local decision previews. Managed CDN is a separate proposed product; no CDN is deployed by that module. Saving a draft does not activate agent permissions, deploy a CDN or isolate a worker. Its shared policy validator is used on the server and in the UI. See AGENTSHIELD.md for enforced draft validation and required runtime work.

## Target architecture and missing services

Redis job execution, end-to-end worker dispatch, persistent artifacts and short-lived storage URLs, scoped secret delivery, production telemetry and external connector execution are unfinished. The current run service explicitly rejects jobs without a configured runner. Do not describe these target capabilities as operational.

The target agent data path is authenticated client → policy gateway → isolated worker or approved CDN origin. Each adapter must bind a verified principal, workspace, requested action and resource, expiry and budget before execution. Sandbox workers require runtime-enforced deny-all internet access, with a broker for approved local operations. Community traffic requires verified peers, explicit delegation limits and per-tenant accounting. The gateway must validate DNS/IP destinations at connection time and on redirects; configuration validation alone cannot prevent SSRF or DNS rebinding.

A managed CDN needs origin ownership validation, edge/provider integration, certificates, tenant-aware public cache keys, invalidation and metrics. Only public immutable assets may use shared caching. Optimistic updates are appropriate for reversible configuration with rollback, never for authorization or unconfirmed external actions.

MODULE-MIGRATION.md records remaining feature parity. AGENTSHIELD.md records forms, protocol candidates and implementation status. Build/type checks establish code consistency, not completion of every workflow or production security certification.
