# AgentShield

AgentShield is the agent authorization/containment policy module. Managed CDN is a separate proposed product; the historical cache TTL field is retained as non-operative draft metadata. AgentShield is a separate ForgeOS module (`agentshield`), alongside MathShield. MathShield remains human verification and bot protection. Its historic folder name `MathShield-CDN` does not establish a managed CDN implementation.

## Implemented

- Module registration, workspace enable/disable controls and project selection.
- Named policy forms with workspace-scoped PostgreSQL persistence and existing audit events.
- Server-side policy validation; only workspace owners/admins may save these drafts.
- Sandbox policies reject internet allowlists. Community policies declare exact HTTPS origins and require verified peers in previews.
- Explicit resource:action capabilities, per-request token budget and public asset cache TTL.
- A deterministic local decision preview. It does not execute tasks, contact origins, verify identities or configure a network.
- Existing physical-key administrator access and signed read-only agent project access remain available in Settings / Agents.

Existing workspaces can enable AgentShield under Customize modules. Saved drafts do not change active agent grants or network access.

## Runtime work still required

The policy workbench is not an edge network or agent execution gateway. The following are required before protection or performance claims:

1. Private isolated workers with no default internet route, deny-all egress/ingress, non-root runtime, read-only filesystem, quotas and an authenticated local broker. Enforce policy outside the agent process.
2. A gateway that authenticates the principal and workspace, binds each task to the user's intent, checks exact action/resource scopes and expiry, and rejects unrequested delegation. Tool output is untrusted input, never authority.
3. DNS/IP validation on every connection and redirect, private/link-local/metadata denial, TLS verification, response-size/time limits and no user-selected unrestricted proxy.
4. Community peer identity verification, bounded delegation depth, deadlines, cancellation, deduplication and per-agent/per-tenant concurrency and token accounting. Never trust a peer-provided verified flag.
5. Tenant-partitioned public asset cache, content hashes, ETag revalidation, compression, conditional requests and request coalescing. Never share authenticated responses, secrets, model responses or mutation results. Measure hit rate, p95 latency, bytes and tokens before claiming gains.
6. Optimistic UI only for reversible configuration with rollback on failure. Authorization, grants and external mutations must await server confirmation. Exact reuse of safe computations comes before additional model calls; context retrieval, output caps and model routing require evaluation.
7. Versioned policy rollout, revocation, rate limits, durable audit, redacted traces and restore tests. Draft policies must not implicitly activate.

## Forms and workflows

Available: policy name, environment, allowed origins, action capabilities, token budget, cache TTL, saved-policy loading, action/origin/token/peer simulation, workspace module selection and existing agent registration/grants/revocation.

Planned: application/origin onboarding and ownership proof; CDN provider and certificate setup; cache and purge rules; isolated worker deployment; peer federation and task consent; budget/rate/concurrency limits; policy activation/rollback; secret references; observability and incident response. Each must use existing workspace membership and audit boundaries.

## Protocol inventory

Existing: HTTPS, Ed25519 signed read-only requests with timestamp/nonce replay protection, WebAuthn administrator authentication. HTTP cache fields are draft configuration only.

Planned adapters: A2A/JSON-RPC for agent tasks, MCP for tools/resources, OAuth 2.0/OIDC for scoped identities, mTLS/SPIFFE for workload identity, SSE/WebSocket for bounded streaming, OpenTelemetry/W3C Trace Context for telemetry. These are integration candidates, not implemented adapters. Add protocols only when their use case requires them; all adapters must pass through the same authorization boundary.

## Completion

The platform's broader outstanding work remains in MODULE-MIGRATION.md. No blanket architecture, security, feature-parity or performance certification is implied by a passing build or route smoke check.
