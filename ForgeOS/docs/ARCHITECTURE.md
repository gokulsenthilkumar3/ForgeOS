# Architecture

ForgeOS is organized around a workspace boundary. The web console and versioned `/v1` API are stateless. PostgreSQL owns durable workspace, project, membership, module-record, and audit data. Redis and S3-compatible storage are configured in Compose, but job dispatch and the persistent artifact lifecycle are not yet wired into the ForgeOS API.

The shared contracts describe runs, artifacts, notifications, and integrations, but they are not all implemented end to end. In particular, `startRun` rejects requests when no background runner is configured, and the worker package currently exposes a runner registry without a queue consumer or registered product runners. Treat the migration checklist as the source of truth for per-module parity. Workspace membership and basic owner/admin/member/auditor checks exist for core APIs; SSO, service accounts, and deployment-level tenant-isolation validation remain open.

Provider adapters are intended to isolate external credentials and APIs. Do not expose private database access or execute user-provided load-test scripts until the worker boundary, authorization, resource limits, and artifact handling are implemented and tested. OpenTelemetry traces are emitted by API, web, and worker services using `OTEL_*` configuration.

## Authentication hardening

Password login failures and owner-bootstrap failures are limited to 10 attempts per identity in a 15-minute in-memory window; WebAuthn authentication-option requests use the same per-identity window. Identities are hashed before being retained, successful password login clears that identity's failure count, and the in-memory key set is bounded. This is per API process and can be bypassed across restarts or replicas, so internet-facing or multi-replica deployments still need a distributed rate limit at a trusted edge. Configure TLS at the public reverse proxy and enable secure cookies when TLS is terminated upstream.
