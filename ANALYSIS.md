# ForgeOS — Repository Analysis, Gap Assessment and Roadmap

| | |
|---|---|
| **Document** | `ANALYSIS.md` |
| **Date** | 2026-11-08 |
| **Commit analysed** | `c0307c7` — *feat: add agent access management service and web interface* |
| **Working tree** | Clean |
| **Scope** | Entire monorepo (`D:\Projects\ForgeOS`) — the consolidated `ForgeOS/` application and all 14 sibling product sources |
| **Method** | Source read-through, git history inspection, dependency and import-graph tracing, automated test and type-check execution |
| **Verification** | `pnpm test` → 39/39 pass · `pnpm typecheck` → 5/5 pass |

---

## Contents

1. [Executive summary](#1-executive-summary)
2. [What this project is](#2-what-this-project-is)
3. [What has been done](#3-what-has-been-done)
4. [Already done, but not up to date](#4-already-done-but-not-up-to-date)
5. [Done and current, but the flow is not proper](#5-done-and-current-but-the-flow-is-not-proper)
6. [Where the flow does hold](#6-where-the-flow-does-hold)
7. [What should be done](#7-what-should-be-done)
8. [What was missing](#8-what-was-missing)
9. [New features](#9-new-features)
10. [Sub-feature improvements](#10-sub-feature-improvements)
11. [Market positioning](#11-market-positioning)
12. [Potential](#12-potential)
13. [Security posture](#13-security-posture)
14. [Appendix A: Evidence index](#appendix-a-evidence-index)
15. [Appendix B: Verification log](#appendix-b-verification-log)

---

## 1. Executive summary

ForgeOS is one Git repository containing a consolidated 14-tool engineering console plus a security and access-governance layer that was added later. The repository is small in product code, large in vendored third-party code, clean, and green on its existing tests.

The central finding is that **two different products coexist under one name**:

- **The engineering console** — 14 previously separate developer tools unified behind one port-3000 browser app. Broad and useful, but shallow, and built almost entirely from commoditised utilities.
- **The agent access governance plane** — hardware-key (FIDO2) human approval, single-use step-up approvals, Ed25519 machine identity, hash-chained audit logging. This is the most technically ambitious and best-engineered part of the codebase.

The README markets product one. The three most recent commits, the deepest tests and the strongest code build product two. That identity split drives nearly every recommendation in this document.

The single most serious defect is not architectural. It is that **the shipped deployment cannot complete first-run**: `docker-compose.yml` and `.env.example` never supply the WebAuthn relying-party and attestation configuration that the API unconditionally requires, so key enrolment returns HTTP 503 and every user is permanently locked out at step three of onboarding. The code is correct; the deployment never tells it how to work.

| Dimension | Assessment |
|---|---|
| Architecture | Sound. Clean tier separation, single public port, workspace boundary enforced consistently. |
| Security engineering | **Above peer average.** Genuinely strong in authentication and audit construction. Weak in rate limiting, session revocation and secrets management. |
| Functional completeness | Low. 14 modules are entry points, not parity implementations. No execution tier. |
| Operational readiness | **Not deployable as shipped.** First-run deadlock. Helm chart has no Service or Ingress. |
| Code hygiene | Mixed. Tested engines wired correctly; superseded duplicate components left live; 90% of tracked files are vendored third-party source. |
| Documentation accuracy | Poor. Multiple documents assert capabilities that do not exist in code. |
| Strategic clarity | **Missing.** Two products, no stated decision between them. |

---

## 2. What this project is

### 2.1 Repository shape

One Git repository, no submodules, 12 commits on `main`, 6,281 tracked files.

| Top-level path | Tracked files | Share | Nature |
|---|---:|---:|---|
| `K6/` | 4,056 | 64.6% | **Vendored** Grafana k6 Go source |
| `PromptVault/` | 1,702 | 27.1% | Product source + **1,616 vendored Prometheus files** |
| `VaultIQ/` | 101 | 1.6% | Product source |
| `ForgeOS/` | 96 | 1.5% | **The consolidated application** |
| `DBPulse/` | 92 | 1.5% | Product source |
| `MathShield-CDN/` | 71 | 1.1% | Product source |
| `SnapDiff/` | 65 | 1.0% | Product source |
| `Comparer/` | 33 | 0.5% | Product source |
| `PulseWatch/` | 28 | 0.4% | Product source |
| `ProbeAI - LLM Tester/` | 10 | 0.2% | Python source |
| `StackForge/`, `GLBViewer/` | 6 each | 0.2% | Product source |
| `RegexForge/`, `CraftCV/`, `CommitCraft/` | 4 each | 0.2% | Single-file React apps |

**5,672 of 6,281 tracked files (90.3%) are vendored third-party source that no ForgeOS module imports.** No ForgeOS module consumes the k6 Go tree or the Prometheus tree. Load Lab generates a k6 *script as text*; it needs neither.

### 2.2 The consolidated application

`ForgeOS/` is the product. It is a pnpm + Turbo monorepo:

```
ForgeOS/
├── apps/
│   ├── api/          NestJS 10 · PostgreSQL 16 · FIDO2 · Ed25519 · hash-chained audit
│   └── web/          Next.js 15 App Router · React 19 · single public port 3000
├── packages/
│   ├── contracts/    Shared types + the 14-module registry (14 lines of real content)
│   ├── database/     schema.sql — 15 lines, NOT the real schema
│   ├── security/     AES-256-GCM secret helpers + RBAC matrix — UNUSED
│   └── adapters/     Provider adapter registry — UNUSED
├── services/
│   └── worker/       6-line stub, logs "ready" and exits — NOT IN COMPOSE
├── infra/helm/       Single Deployment, no Service, no Ingress — not deployable
└── docs/             ARCHITECTURE.md, MODULE-MIGRATION.md — partly stale
```

### 2.3 The two products

| | **Engineering console** | **Access governance plane** |
|---|---|---|
| Surface | `/modules/<id>` × 14 tools | `/settings/agents`, step-up approvals |
| Data model | Workspaces, projects, module records | Agents, grants, approvals, audit chain |
| Auth model | Any signed session | Hardware key + single-use approval |
| Code quality | Mixed, mostly client-side | Consistently strong |
| Market | Crowded, commoditised | Active, high-value, defensible |
| Documented in | `README.md`, `DESIGN.md`, `docs/MODULE-MIGRATION.md` | **Nowhere** |

The access plane is undocumented. That is why it reads as accidental rather than intentional.

---

## 3. What has been done

### 3.1 Platform shell — real and working

- **Single public port.** Only `web` publishes a port; API, PostgreSQL, Redis and storage are all internal ([`docker-compose.yml`](ForgeOS/docker-compose.yml)). Next.js rewrites `/api/v1/*`, `/api/mathshield/*` and `/shield.js` to private services ([`next.config.mjs`](ForgeOS/apps/web/next.config.mjs)).
- **Migrated schema with safety.** Six numbered migrations, each guarded by `forgeos_migrations` and serialised behind `pg_advisory_lock`, with per-migration transactions and rollback ([`platform.service.ts:61-181`](ForgeOS/apps/api/src/platform.service.ts#L61-L181)).
- **Workspace boundary.** Every query scopes by `workspace_id`. Disabled modules are rejected *before* any write occurs — proven by tests that assert `expect(query).not.toHaveBeenCalled()`.
- **Console UI.** Task-first dashboard, workspace switcher, module enable/disable persisted per workspace, command palette (Ctrl+K), responsive rail, explicit loading/empty/error states.

### 3.2 Identity and access — the strong part

- **FIDO2 with hardware attestation policy.** `attestationType: 'direct'`, cross-platform attachment only, `singleDevice`, `credentialBackedUp === false`, `userVerified`, AAGUID allowlist, and full x5c certificate-chain validation against explicitly configured trusted roots ([`webauthn-policy.ts:52-67`](ForgeOS/apps/api/src/webauthn-policy.ts#L52-L67)).
- **No production fallback.** `webAuthnConfig()` refuses to infer a relying party from proxy headers, with an explicit note that those headers are attacker-controlled ([`webauthn-policy.ts:14-32`](ForgeOS/apps/api/src/webauthn-policy.ts#L14-L32)).
- **Step-up approvals.** Single-use, 2-minute TTL, scoped to `(user, workspace, action)`, consumed atomically inside the acting transaction, with `used_at IS NULL AND expires_at > now()` in the same statement ([`platform.service.ts:464-485`](ForgeOS/apps/api/src/platform.service.ts#L464-L485)).
- **Password login deliberately crippled.** It issues an "enrolment-only" session that can reach the key-enrolment pages and nothing else ([`session.guard.ts:51-57`](ForgeOS/apps/api/src/session.guard.ts#L51-L57)), asserted in both the guard spec and the smoke test.
- **Session integrity.** HMAC-SHA256 over a canonical payload, hex signature compared with `timingSafeEqual`, httpOnly + SameSite=strict cookie ([`session.guard.ts:45-50`](ForgeOS/apps/api/src/session.guard.ts#L45-L50)).
- **Password storage.** scrypt N=16384, r=8, p=1, 64-byte key, 16-byte random salt, self-describing encoded format, `timingSafeEqual` verification ([`password.ts`](ForgeOS/apps/api/src/password.ts)).
- **User enumeration blocked.** Unknown email still performs a dummy scrypt derivation before failing ([`platform.service.ts:223-226`](ForgeOS/apps/api/src/platform.service.ts#L223-L226)).
- **Multi-user RBAC — API complete.** Five roles, workspace invitations with hashed single-use tokens and 7-day expiry, membership listing, role changes with last-owner protection under an advisory lock ([`platform.service.ts:491-559`](ForgeOS/apps/api/src/platform.service.ts#L491-L559)).

### 3.3 Agent access plane — the newest work

- **Ed25519 machine identity.** Agents register a public key; the SPKI DER is stored with a SHA-256 fingerprint. Private keys never reach the server ([`agent-access.service.ts:80-101`](ForgeOS/apps/api/src/agent-access.service.ts#L80-L101)).
- **Signed requests.** Canonical `METHOD\nURL\nTIMESTAMP\nNONCE\nBODYHASH`, ±60s timestamp window, strict format validation, signature verified **before** nonce insertion ([`agent-access.service.ts:147-189`](ForgeOS/apps/api/src/agent-access.service.ts#L147-L189)).
- **Replay defence.** `access_agent_nonces` primary-keyed on `(agent_id, nonce)`; a duplicate insert returns no row and the request is rejected.
- **Bounded grants.** 1–60 minute lifetime enforced server-side, revocable, both creation and revocation audited ([`agent-access.service.ts:103-133`](ForgeOS/apps/api/src/agent-access.service.ts#L103-L133)).
- **Hash-chained audit.** Versioned hash over canonical JSON (sorted keys), previous-hash read inside a per-workspace `pg_advisory_xact_lock`, so the chain is safe across multiple API replicas ([`platform.service.ts:656-682`](ForgeOS/apps/api/src/platform.service.ts#L656-L682)).
- **Admin UI.** Register, grant, revoke, and inspect grant history; every mutation requires a fresh hardware-key approval ([`agent-access.tsx`](ForgeOS/apps/web/app/agent-access.tsx)).

### 3.4 The 14 modules

All 14 are routed ([`workbench.tsx:12-29`](ForgeOS/apps/web/app/modules/[id]/workbench.tsx#L12-L29)). Four have been properly refactored into dedicated components backed by separately tested engines:

| Module | Engine | Notes |
|---|---|---|
| CommitCraft | `commit-engine.mjs` | `formatCommit`, `validateGeneratedCommit` |
| Comparer | `compare-engine.mjs` | LCS alignment, `MAX_LINE_CELLS` guard, text/JSON/folder/image modes |
| RegexForge | `public/regex-engine.mjs` via `regex-worker.mjs` | Web Worker isolation, 600 ms kill switch, pattern-only share links |
| StackForge | `scaffold-engine.mjs` | `validateProjectName`, three template families |

The remaining ten are live but thin, and four of them still ship from the original monolith files.

### 3.5 Supporting services

- **PulseWatch** — real Express backend with endpoint CRUD, polling, incidents, notifications and stats, mounted as its own Compose service and fronted by a carefully restricted proxy.
- **MathShield** — a complete NestJS bot-protection service with challenge generation, behavioural analysis, risk scoring, JWT issuance, API-key guard and rate-limit middleware. Built with its own Dockerfile and wired into Compose.

---

## 4. Already done, but not up to date

Work that exists and functions, but has been superseded, duplicated or invalidated by later changes. This is the largest category of waste in the repository.

### 4.1 A stale duplicate of MathShield, nested inside itself

Two copies exist:

| Path | Behaviour module | API-key guard | Rate-limit middleware | Used by Compose |
|---|---|---|---|---|
| `MathShield-CDN/src/` | ✅ | ✅ | ✅ | **✅ yes** |
| `MathShield-CDN/MathShield-CDN/src/` | ❌ | ❌ | ❌ | ❌ no |

The nested copy is an **older snapshot**. Commit `9e86e68` — titled *"feat: Implement risk assessment module with scoring and tracking"* — added the risk module *into the nested stale copy*. Anyone opening the nested directory gets out-of-date code with no indication that it is dead.

> **Correction to a natural first reading:** the risk-assessment and API-key/rate-limiting commits were real work, but they landed in **MathShield**, not in the ForgeOS console. That is why those capabilities appear absent when you search the app. The commit titles simply never say which product they touch.

### 4.2 Documentation that describes a different system

| Document | Claim | Reality |
|---|---|---|
| [`README.md:7`](README.md#L7) | "a single administrator login, not multi-user RBAC" | API implements 5 roles, invitations, and membership management |
| [`docs/ARCHITECTURE.md:5`](ForgeOS/docs/ARCHITECTURE.md#L5) | "OpenTelemetry traces are emitted by API, web, and worker" | **Zero** OpenTelemetry code, zero dependencies; Helm sets `OTEL_SERVICE_NAME` for a non-existent tracer |
| [`docs/ARCHITECTURE.md:3`](ForgeOS/docs/ARCHITECTURE.md#L3) | "Redis carries jobs, S3-compatible storage owns artifacts" | API never connects to Redis or S3; no client library in `apps/api/package.json` |
| [`docs/MODULE-MIGRATION.md`](ForgeOS/docs/MODULE-MIGRATION.md) | Last updated 2026-09-24, tracks 14 modules | Silent about the access plane, which is the newest and most complete subsystem |
| [`README.md:5`](README.md#L5) | 14 folders "remain as source code for ongoing feature migration" | Migration is largely stalled; most modules are independent thin reimplementations |

### 4.3 Commit messages that do not match their contents

| Commit | Title | What it actually did |
|---|---|---|
| `9e86e68` | "Implement risk assessment module with scoring and tracking" | Added the nested duplicate MathShield tree; rewrote ForgeOS Dockerfiles; **deleted `platform.service.spec.ts`** (restored later); touched TLS/proxy config |
| `0f3c39c` | "Implement API key guard and rate limiting middleware" | Mostly added the `MathShield-CDN` tree and a `WRITE_PERMISSION_PROBE.txt` |
| `b8b337e` | "update styles and layout for improved UI/UX" | Added the CI workflow, `DESIGN.md`, the smoke script and the console shell |

`git log --grep` will actively mislead anyone looking for a capability.

### 4.4 Vendored third-party source committed as product code

- `K6/k6/**` — 4,056 files of Grafana k6 Go source
- `PromptVault/prometheus/**` — 1,616 files of Prometheus Go source

No ForgeOS module imports either. They inflate every repository metric, slow every clone, and obscure the ~600 files that are actually the product.

### 4.5 A decayed schema file

[`packages/database/schema.sql`](ForgeOS/packages/database/schema.sql) is 15 lines and predates migrations 2–6. The real schema is assembled from inline migrations in `platform.service.ts`, including `module_records`, `users`, `principals.user_id`, `workspace_invitations`, `webauthn_credentials`, `webauthn_challenges`, `webauthn_approvals` and `audit_events.hash_version`. Anyone reading `schema.sql` gets a wrong model of the system.

### 4.6 Unused packages and infrastructure

| Artefact | Status |
|---|---|
| `packages/security` (`encryptSecret`, `decryptSecret`, `can()`) | Declared a dependency of the API; **never imported anywhere** |
| `packages/adapters` (provider registry) | **Never imported anywhere** |
| `services/worker` | 6-line stub; **no service in Compose** |
| Redis container | Provisioned; no client, no code path |
| MinIO container | Provisioned; no client, no code path |
| `SECRETS_MASTER_KEY` | Present in `.env`; never read |
| `secrets`, `artifacts`, `integrations`, `alerts`, `notifications` tables | Created by migration; never written to by application code |

---

## 5. Done and current, but the flow is not proper

The components are correct. The connections between them are not. These are the defects that make a working system feel broken.

### 5.1 P0 — First-run dead-ends at key enrolment

**This is the most serious defect in the repository.**

The API requires WebAuthn relying-party configuration and a hardware attestation policy, unconditionally:

```ts
// webauthn-policy.ts
export function requireHardwarePolicy(config: WebAuthnConfig): void {
  if (!config.trustedRoots.length || !config.allowedAaguids.size) {
    throw new ServiceUnavailableException('Trusted physical-key attestation is not configured');
  }
}
```

But the deployment never supplies it:

- [`docker-compose.yml:14-21`](ForgeOS/docker-compose.yml#L14-L21) passes the API only `FORGEOS_MODE`, `FORGEOS_SESSION_SECRET`, `PORT`, `DATABASE_URL`, `REDIS_URL`.
- [`.env.example`](ForgeOS/.env.example) contains **no** `FORGEOS_WEBAUTHN_*` variables at all.
- The API image sets `NODE_ENV=production`, so `webAuthnConfig()` has no development fallback and throws *"WebAuthn relying party is not configured."*

The resulting flow:

```
create owner ──► password sign-in (enrolment-only) ──► /enroll-key ──► HTTP 503 ──► dead end
```

Every user is locked out at the third step. Nothing else in the product can be reached.

### 5.2 P0 — CI is green because it bypasses the login it should be testing

[`scripts/smoke.mjs:65-71`](ForgeOS/scripts/smoke.mjs#L65-L71) **forges** a valid hardware-key session cookie using the test-only session secret, with an honest comment explaining why:

> *"This CI fixture has the test-only signing secret, so it can exercise routing behind a key-authenticated session. It does not substitute for a real FIDO2 ceremony."*

The shortcut is well documented and defensible in isolation. The consequence is significant: **the real sign-in path has never been executed end-to-end, in CI or anywhere else.** "All tests pass" and "a human can log in" are unrelated statements in this repository.

### 5.3 The bootstrap session is dead on both ends

| End | Behaviour |
|---|---|
| `/api/session` | Mints a `b.` cookie for `action: 'bootstrap'` ([`route.ts:59-69`](ForgeOS/apps/web/app/api/session/route.ts#L59-L69)) |
| `middleware.ts` | Parses `b.` and classifies it `'bootstrap'` ([`middleware.ts:23-27`](ForgeOS/apps/web/middleware.ts#L23-L27)) |
| `middleware.ts` | **Never accepts `'bootstrap'`** — only `'human'` and `'enrolment'` pass, so it falls through to a redirect ([`middleware.ts:51-58`](ForgeOS/apps/web/middleware.ts#L51-L58)) |
| Client | **No caller ever sends it** |

Two half-built paths that cancel each other out. Bootstrap actually works through the public `POST /api/v1/auth/setup` endpoint, which needs no session — making the cookie entirely vestigial.

### 5.4 Multi-user RBAC: fully built in the API, unreachable in the UI

These endpoints exist, are validated, and are covered by tests:

- `POST /workspaces/:id/invitations`
- `GET /workspaces/:id/members`
- `PATCH /workspaces/:id/members/:userId`
- `POST /auth/accept-invite`

A grep of the entire web application returns **zero references** to any of them. There is no members page, no invite form, and no `/accept-invite` route. Team management was built and then never surfaced.

### 5.5 The module layer is mid-refactor with the old copies still live

The newer per-tool components are correct and consume the tested engines. But the original monolith files were never cleaned up, and four of their exports are still the live imports:

| File | Live exports (used by `workbench.tsx`) | **Dead duplicate exports** |
|---|---|---|
| [`workbench-tools.tsx`](ForgeOS/apps/web/app/modules/[id]/workbench-tools.tsx) | `ResumeTool`, `VaultTool`, `MathShieldTool`, `ImageDiffTool` | **`CommitTool` (:6), `CompareTool` (:16), `RegexTool` (:24)** |
| [`more-tools.tsx`](ForgeOS/apps/web/app/modules/[id]/more-tools.tsx) | `EvaluationTool`, `LoadScriptTool`, `PulseWatchTool`, `AuditExplorerTool`, `ModelControls` | **`ScaffoldTool` (:15), `PromptTool` (:28)** |

The contrast is stark:

| | Dead copy | Live copy |
|---|---|---|
| `CompareTool` | Positional `line === newLines[index]` comparison | 161 lines, LCS engine, four modes |
| `PromptTool` | `localStorage` only | API-persisted versions, import, export, variables |
| `RegexTool` | Synchronous `new RegExp` on the main thread | Web Worker with a 600 ms kill switch |

**A maintainer who edits the wrong file will see no change in the product.** This is the highest-probability future defect in the codebase.

### 5.6 The execution tier exists in three pieces and is connected in none

```ts
// platform.service.ts:628-635
async startRun(...) {
  // ...validation...
  throw new NotImplementedException(`No background runner is configured for ${moduleId}`);
}
```

- `services/worker/` is a 6-line stub that logs and exits.
- **No `worker` service exists in `docker-compose.yml`.**
- Redis and MinIO are provisioned and unused.

Therefore the `runs` table can never gain a row, and the dashboard's "Runs" and "Needs attention" panels are permanently empty. Load Lab, SnapDiff baselines and ProbeAI batches are all non-executable by construction.

### 5.7 The audit chain is write-only

The chain construction is genuinely good — canonical JSON, previous-hash read inside an advisory lock, versioned hash ([`platform.service.ts:656-682`](ForgeOS/apps/api/src/platform.service.ts#L656-L682)). But:

- There is **no** `/v1/audit` endpoint.
- The only read path is `overview`, capped at 20 events ([`platform.service.ts:612`](ForgeOS/apps/api/src/platform.service.ts#L612)).
- There is **no verifier** that recomputes the chain.
- `DBPulse`, whose entire purpose is audit exploration, reads that same 20-event window.

Tamper-evidence that nothing ever verifies is a claim, not a control.

### 5.8 Security policy duplicated across two runtimes

The public-route list and cookie parsing exist **twice**, in two languages, in two packages:

- [`session.guard.ts:14-22`](ForgeOS/apps/api/src/session.guard.ts#L14-L22) (NestJS guard)
- [`middleware.ts:37-59`](ForgeOS/apps/web/middleware.ts#L37-L59) (Next edge middleware)

They currently agree. Nothing enforces that they must. Every future auth change must be made twice, and a miss is a silent authorisation bypass.

### 5.9 Session lifetime conflicts with the product's own use

- 15-minute absolute expiry, no sliding refresh, no rotation ([`route.ts:4`](ForgeOS/apps/web/app/api/session/route.ts#L4)).
- Sign-out clears the cookie, but the HMAC token stays valid until expiry — there is no server-side revocation.
- Hardware-key sessions additionally require the assertion to be under 15 minutes old.

Correct for approving an agent. Hostile for someone drafting commits for 40 minutes. The auth model was designed for an approval console, not a daily workbench — which is itself evidence of the identity split described in §2.3.

### 5.10 Smaller flow defects

| Defect | Location |
|---|---|
| Module page fetches `/overview` twice (shell + gate) | [`shell.tsx`](ForgeOS/apps/web/app/shell.tsx), [`module-gate.tsx`](ForgeOS/apps/web/app/modules/[id]/module-gate.tsx) |
| Mojibake where latency should render (`����`) | [`more-tools.tsx:68`](ForgeOS/apps/web/app/modules/[id]/more-tools.tsx#L68) |
| WebGL context torn down and rebuilt on every play/pause toggle | [`model-viewer.tsx`](ForgeOS/apps/web/app/modules/[id]/model-viewer.tsx) (`useEffect` deps include `playing`, `rotation`) |
| Prompts cannot be renamed (name field `readOnly` once selected) | [`prompt-vault.tsx:161`](ForgeOS/apps/web/app/modules/[id]/prompt-vault.tsx#L161) |

---

## 6. Where the flow does hold

Worth stating clearly, because this is more coherent than most projects at a comparable stage.

| Flow | Status |
|---|---|
| **Workspace isolation** | Holds. Every query scopes by `workspace_id`; disabled modules rejected before any write. |
| **Step-up approval lifecycle** | Holds end-to-end: options → key ceremony → verify → `approvalId` → consumed exactly once inside the acting transaction. Prevents the classic "approve once, replay forever" bug. |
| **Agent authentication ordering** | Holds. Signature verified **before** nonce insertion, so unauthenticated traffic cannot fill the replay table ([`agent-access.service.ts:163-169`](ForgeOS/apps/api/src/agent-access.service.ts#L163-L169)). |
| **PulseWatch proxy** | Holds, and is a model of restraint: explicit method+path allowlist, re-checks workspace and module, enforces role on writes, rejects bodies over 20 KB ([proxy route](ForgeOS/apps/web/app/api/pulsewatch/[...path]/route.ts)). |
| **RegexForge isolation** | Holds. Web Worker, hard 600 ms termination, copy-link deliberately strips sample text because URLs get logged and shared. |
| **Vault save integrity** | Holds. `persistVault` re-checks that the vault is still active and that the workspace has not changed, both before and after encryption. |

These flows have errors at the margins — the ones listed in §5.10 — but the core sequence is correct and would survive review.

---

## 7. What should be done

Ordered by dependency. **P0 is not optional: as shipped, no user can reach the product.**

| Prio | Action | Rationale | Effort |
|---|---|---|---|
| **P0** | Add `FORGEOS_WEBAUTHN_RP_ID`, `_ORIGIN`, `_ATTESTATION_ROOTS_PEM`, `_ALLOWED_AAGUIDS` to `.env.example` and Compose; **fail fast at boot** if absent | Removes the first-run deadlock. Nothing else matters until a human can sign in. | S |
| **P0** | Add a documented development attestation mode, hard-gated behind `NODE_ENV !== 'production'` | The strictest-possible policy currently makes the flow untestable locally. | S |
| **P0** | Delete `MathShield-CDN/MathShield-CDN/` | Stale duplicate that will eventually be edited by mistake. | S |
| **P0** | Add one real browser login to CI (Playwright + CDP virtual authenticator) | Permanently closes the "green but unverified" gap; retires the forged-cookie shortcut. | M |
| **P1** | Delete the dead duplicate components in `workbench-tools.tsx` and `more-tools.tsx`; finish the split | Removes the edit-the-wrong-file trap (§5.5). | S |
| **P1** | Build the members/invitations UI **or** delete the endpoints | Partially shipped RBAC reviews as finished and is worse than nothing. | M |
| **P1** | Add `/v1/audit` (paginated) and `/v1/audit/verify-chain` | Turns decoration into a compliance feature — and a sellable one. | M |
| **P1** | Extract one shared session/route-policy module consumed by both tiers | Kills the drift-to-bypass risk (§5.8). | M |
| **P1** | Either finish or remove the `bootstrap` session path | Dead branching logic is where future bugs hide. | S |
| **P2** | Either wire Redis + worker + S3, **or** delete them from Compose and the architecture doc | Paid infrastructure that does nothing is a false claim. | L |
| **P2** | `git rm -r K6/k6 PromptVault/prometheus`; reference upstream | 90% of the repository is someone else's code. | S |
| **P2** | Regenerate `schema.sql` from the live database; delete stale OTEL/Redis claims | Documents that lie cost more than absent documents. | S |
| **P2** | Make the Helm chart actually deployable (Service, Ingress, Secret, web + api, no `:latest`) | Current chart is a single Deployment with no Service — unreachable. | M |
| **P2** | Add a break-glass / key-recovery path | Two keys or permanent lockout is the only recovery story (§8.1). | M |

---

## 8. What was missing

Ranked by how hard each one blocks a real deployment.

### 8.1 A break-glass / recovery path — *critical*

Two hardware keys or permanent lockout is the entire recovery story. There is no admin reset, no recovery code, no second-approver flow. In production this becomes an incident, and for a buyer it is a procurement blocker. Resolve it deliberately rather than accidentally — the trade-off is real, since any recovery path weakens the model that makes the product strong.

### 8.2 Rate limiting and lockout on ForgeOS's own auth — *critical*

`POST /api/session` accepts unlimited password attempts. scrypt at N=16384 costs roughly 100 ms and nothing else throttles. There is no lockout, no exponential backoff, and **login failures are not audited**. MathShield has rate limiting; the primary application does not.

### 8.3 Secret storage — *high*

The `secrets` table, `SECRETS_MASTER_KEY` and `encryptSecret()` all exist and are entirely unused. Provider API keys are sent from the browser through `/api/llm` on **every request** ([`route.ts`](ForgeOS/apps/web/app/api/llm/route.ts)). That directly contradicts the architecture document's claim that "workers receive opaque secret references."

### 8.4 An execution tier — *high*

Without a worker, `runs`, artifacts, SnapDiff baselines, Load Lab and ProbeAI batches are decorative.

### 8.5 Artifact storage and signed URLs — *high*

Nothing persists any output. There is no way to share a result.

### 8.6 Notification delivery — *medium*

`notifications` exists; nothing writes to it. No email, Slack or webhook channel is configured.

### 8.7 Connector secret management — *high for DBPulse specifically*

DBPulse's entire premise is connecting to MySQL, PostgreSQL, MSSQL, MongoDB, SQLite and Redis. None of that exists. The module currently re-reads 20 of ForgeOS's own audit events.

### 8.8 Observability — *medium*

No OpenTelemetry, no structured logging, no metrics, no health beyond `{ status: 'ok' }`.

### 8.9 CSRF token — *medium*

`SameSite=strict` is the only control. Good, but not a complete defence across all browser and proxy edge cases.

### 8.10 End-to-end test coverage — *high*

Zero browser tests. All 39 existing tests are unit-level. No test exercises a database, and none completes a WebAuthn ceremony.

---

## 9. New features

### Category A — deepen the real differentiator (highest return)

1. **Scoped agent grants beyond `projects:read`.** The schema hard-codes a single scope ([`agent-access.service.ts:41`](ForgeOS/apps/api/src/agent-access.service.ts#L41)). Add `runs:write`, `artifacts:write`, `audit:read`, and per-project scoping.
2. **Approval policy engine.** "Grants over 30 minutes need two keys." "Production workspaces need owner + auditor." Rule-based step-up instead of one global rule.
3. **MCP server governance.** Register MCP servers as agents, sign tool-call requests, approve invocations with a key tap. The primitives already fit; this is where buyer attention currently is.
4. **Audit chain verification and external anchoring.** Publish periodic chain roots to an external store. Converts "we have hashes" into "we can prove it."
5. **Agent behaviour baselines.** "This agent normally reads 3 projects; it just read 400." The signed request log already contains the data.
6. **Self-service access requests.** Agent asks → human notification → key tap → short-lived grant. The approval machinery already exists; this adds the request half.

### Category B — make the console feel like a product

7. Cross-module **artifacts gallery** with sharing.
8. **Saved collections and share links** for RegexForge, Comparer and CommitCraft — extend the pattern RegexForge already proves.
9. **Run history with trend reporting** (requires §8.4).
10. **Template/plugin registry** for StackForge (`stackforge add <feature>` is already in its PRD).
11. **Multi-template PDF export** and autosave for CraftCV.
12. **Vault security score, breach check and sharing** for VaultIQ — specified in its own README and the one module where "not a SaaS" is a genuine advantage.

### Category C — platform

13. SSO (OIDC/SAML) as a complement to the hardware key, never a replacement.
14. Service accounts with scoped tokens, distinct from agents.
15. Tenant isolation for cloud mode (`deployment_mode` already supports `'cloud'`).
16. Public status pages for PulseWatch (already specified in its PRD).

---

## 10. Sub-feature improvements

Per-module assessment of what exists and the highest-value next improvement.

| Module | Working today | Highest-value improvement |
|---|---|---|
| **CommitCraft** | Diff → conventional commit; BYOK AI (OpenAI/Anthropic) | PR title/body drafting; commit history persistence; local Ollama (already promised in its README); use `validateGeneratedCommit` before copy |
| **StackForge** | 3 template families → downloadable ZIP | Real template catalog; CLI-parity options; validate the generated ZIP actually installs, in CI |
| **SnapDiff** | Client-side equal-dimension PNG diff | **Playwright capture is the actual product.** Add viewport matrix, baselines, approve/reject, PR comments. Largest functional gap in the console. |
| **Comparer** | Text, JSON, folder and image comparison | Word/Excel/document diff; semantic SQL diff; three-way merge |
| **RegexForge** | JS regex in a Worker, pattern links, 600 ms kill switch | **Pattern explanation**; saved collections; Python/Go runner parity. Otherwise the strongest module. |
| **Load Lab** | Generates a k6 script as text | **Execution.** Without a worker it is a string builder. Then percentiles and trend comparison. |
| **PromptVault** | Workspace-persisted versions, import, export, variables, model run | **Version diffing** — the core promise of the module's own PRD ("Git-like") is missing; then branches, A/B tests, team collections |
| **ProbeAI** | Exact-match cases; up to 10 model calls | **YAML suites**; evaluator catalog (regex, embedding cosine, LLM-as-judge — all in its README); batch history; regression diffing |
| **PulseWatch** | Endpoint CRUD, checks, incidents, 15 s polling, stats | **Public status page**; notification channels (table exists, unused); SSL and domain expiry; per-workspace permissions |
| **DBPulse** | Re-reads 20 ForgeOS audit events | **The module is effectively unbuilt.** Needs real DB connectors, row-level diff, schema history. |
| **GLBViewer** | Local playback, rotation, animation, PNG capture | Persistent upload; share links; embeds; HDRI presets; morph sliders. Fix the WebGL re-init on toggle. |
| **CraftCV** | Basic form, preview, print/PDF | Multiple templates; **autosave** — losing a CV to a refresh is unacceptable; schema import; paginated PDF |
| **VaultIQ** | PBKDF2 200k + AES-GCM, localStorage, generator | Security scoring; breach check; secure sharing; 2FA flags. Also bind the vault to a user identity — today it is per-browser-per-workspace and survives sign-out. |
| **MathShield** | Challenge/verify through the ForgeOS origin; full analytics backend | Analytics dashboard (built, API-key-gated, unreachable from the UI); per-workspace configuration; verify the rate-limit bucket is per-client rather than shared behind the proxy |

**Two cross-cutting fixes:** `AuditExplorerTool` should read `/v1/audit`, not the 20-event `overview` window; and `/api/llm` should stop accepting a provider key per request once §8.3 is addressed.

---

## 11. Market positioning

### 11.1 The uncomfortable truth about the console

**"Fourteen tools in one browser" is not a market.** Every constituent has a free, better-funded competitor:

| ForgeOS module | Established alternative |
|---|---|
| RegexForge | Regex101, RegExr |
| Comparer / SnapDiff | Diffchecker, Percy, Chromatic |
| PromptVault / ProbeAI | PromptLayer, LangSmith, Braintrust |
| PulseWatch | Checkly, Better Stack, UptimeRobot |
| VaultIQ | 1Password, Bitwarden, Doppler |
| CommitCraft | Free GPT prompts, a dozen VS Code extensions |

Bundling commoditised utilities creates no moat. It dilutes the one asset that is differentiated.

### 11.2 The access plane is a real market

"Humans approve with a hardware key; software identifies itself with a key" is the non-human identity and agent-authorisation problem. Enterprises are actively asking: *what is this agent allowed to touch, and who approved it?*

ForgeOS is unusually credible here because it is built on primitives most competitors fake:

| Asset | Why it sells |
|---|---|
| **Hardware-attested keys only** | Auditors and regulated buyers cannot accept magic links. Attestation plus an AAGUID allowlist is a different class of claim. |
| **Ed25519 per-agent identity** | Not a shared API key. Real cryptographic workload identity. |
| **Hash-chained audit** | Tamper-evidence is a compliance requirement, not a feature. |
| **Single-port, self-hosted, zero SaaS in the trust path** | Sells into air-gapped, on-prem and data-residency-constrained buyers — segments SaaS vendors structurally cannot serve. |
| **Sub-60-minute, human-approved grants** | Matches least-privilege and just-in-time access doctrine exactly. |

### 11.3 Honest competitive exposure

Expect to compete with: Okta/Auth0 (CIBA), WorkOS, Oso, AuthZed/Cedar, Descope, Astrix, Entro, Permiso, Teleport, HashiCorp Vault, and a growing field of AI-agent guardrail startups. ForgeOS does not win on breadth, integrations or sales capacity.

It wins on one narrow, defensible claim: **self-hosted, hardware-key-attested, replay-proof, cryptographically auditable agent access with no SaaS in the trust path.**

### 11.4 Recommended wedge, in order

1. **MCP server access broker, self-hosted.** Register MCP servers as agents, approve tool calls with a hardware key, produce a verifiable audit chain. Narrowest, most urgent, least-served — and the existing code nearly ships it.
2. **Regulated and air-gapped mid-market** — defence, health, fintech, EU public sector — where SaaS identity is disqualified at procurement rather than at evaluation.
3. **Platform teams replacing spreadsheet-managed service accounts.**
4. **Only then** position the 14 tools as free adoption surface and demo content — never as the headline.

### 11.5 The precondition

Fix §5.1 first. A prospect cannot complete first-run today, and a demo that returns 503 at step three loses the deal every time regardless of the strength of the underlying primitives.

---

## 12. Potential

### As a 14-tool console — low

Utility aggregation has no pricing power and no retention moat. Fourteen mediocre modules cost more to maintain than they return. The one genuinely differentiated module — SnapDiff with real Playwright capture — could stand alone as a product.

### As an access plane — genuinely venture-shaped

The quality of [`platform.service.ts`](ForgeOS/apps/api/src/platform.service.ts), [`agent-access.service.ts`](ForgeOS/apps/api/src/agent-access.service.ts), [`webauthn-policy.ts`](ForgeOS/apps/api/src/webauthn-policy.ts) and [`session.guard.ts`](ForgeOS/apps/api/src/session.guard.ts) is above the level of most seed-stage security companies. The instincts are correct: verify before consuming, single-use approvals, serialised hash chains, signature before nonce. That is not beginner work.

### The blocker is coherence, not capability

Nothing needs inventing. Almost everything needs **finishing**. The current state is two half-products, a dead enrolment path, three unconnected infrastructure services, a write-only audit log, and documentation describing a system that does not exist.

### Realistic twelve-month path

1. Ship the MCP / agent access broker, self-hosted.
2. Keep three to four console tools that demonstrate it well; freeze or cut the rest.
3. Make three things provable: real browser login test, audit chain verifier, key recovery.
4. Retire the "14 tools" headline.

That is fundable and sellable. The alternative — marketing utility bundling — competes with free websites and loses.

---

## 13. Security posture

### 13.1 Strong — correctly implemented, and unusual

| Control | Evidence |
|---|---|
| **Hardware attestation is real, not decorative** — direct attestation, cross-platform only, `singleDevice`, `credentialBackedUp === false`, `userVerified`, AAGUID allowlist, x5c chain to explicit trusted roots. Synced passkeys are **explicitly rejected**, so a compromised cloud account cannot clone a credential. Very few products do this. | [`webauthn-policy.ts:52-67`](ForgeOS/apps/api/src/webauthn-policy.ts#L52-L67) |
| **No production fallback to localhost relying party.** Refuses to infer RP from proxy headers, with a comment noting those headers are attacker-controlled. Covered by tests. | [`webauthn-policy.ts:14-32`](ForgeOS/apps/api/src/webauthn-policy.ts#L14-L32) |
| **Password auth deliberately crippled.** Cannot reach projects, modules or agents — only key enrolment. Asserted in both the guard spec and the smoke test. | [`session.guard.ts:51-57`](ForgeOS/apps/api/src/session.guard.ts#L51-L57) |
| **Step-up approvals single-use and atomic.** Spent inside the acting transaction, so approval and action cannot desynchronise. | [`platform.service.ts:467-474`](ForgeOS/apps/api/src/platform.service.ts#L467-L474) |
| **Replay prevention correctly ordered.** Signature first, nonce second — forged traffic cannot poison the nonce table. | [`agent-access.service.ts:163-169`](ForgeOS/apps/api/src/agent-access.service.ts#L163-L169) |
| **Timing-safe comparison** everywhere it matters: session signature, bootstrap password, password hash. | [`session.guard.ts`](ForgeOS/apps/api/src/session.guard.ts), [`platform.service.ts:203`](ForgeOS/apps/api/src/platform.service.ts#L203) |
| **User enumeration blocked.** Unknown email still performs a dummy scrypt derivation. | [`platform.service.ts:223-226`](ForgeOS/apps/api/src/platform.service.ts#L223-L226) |
| **Audit chain construction sound.** Canonical sorted-key JSON, per-workspace advisory lock, previous-hash read inside the lock. Multi-replica safe. | [`platform.service.ts:656-682`](ForgeOS/apps/api/src/platform.service.ts#L656-L682) |
| **SQL fully parameterised.** No string interpolation into queries found anywhere. | Throughout `apps/api/src` |
| **VaultIQ crypto textbook.** PBKDF2-SHA256 200k, AES-256-GCM, fresh IV per write, key only in memory, workspace re-checked before and after save. | [`vault-storage.ts`](ForgeOS/apps/web/app/modules/[id]/vault-storage.ts) |
| **No `dangerouslySetInnerHTML`**; path traversal blocked by an explicit method+path allowlist in the PulseWatch proxy. | [`proxy route`](ForgeOS/apps/web/app/api/pulsewatch/[...path]/route.ts) |
| **WebAuthn challenges deleted on claim** (`DELETE … RETURNING`), making challenge replay structurally impossible. | [`platform.service.ts:246-256`](ForgeOS/apps/api/src/platform.service.ts#L246-L256) |

### 13.2 Absent or weak — fix before an audit

| # | Gap | Detail |
|---|---|---|
| 1 | **No rate limiting on ForgeOS auth** | Unlimited password and step-up attempts; only scrypt cost. MathShield has throttling; the primary app does not. |
| 2 | **No CSRF token** | `SameSite=strict` is the sole control. |
| 3 | **`secure` cookie flag conditional** | Set only when `FORGEOS_SECURE_COOKIES === 'true'` or https is detected ([`route.ts:11`](ForgeOS/apps/web/app/api/session/route.ts#L11)); Compose never sets it. Behind a TLS-terminating proxy the flag can silently disappear. |
| 4 | **Sessions cannot be revoked** | Stateless HMAC, 15-minute absolute, no rotation or denylist. Stolen cookie remains valid until expiry, including after sign-out. |
| 5 | **Audit chain never verified** | No verifier exists. Tamper-evidence that nobody checks is a claim. |
| 6 | **Secrets unencrypted in practice** | `SECRETS_MASTER_KEY` and `encryptSecret()` unused; provider keys transit the web tier per request. |
| 7 | **Auth policy duplicated across runtimes** | [`session.guard.ts`](ForgeOS/apps/api/src/session.guard.ts) vs [`middleware.ts`](ForgeOS/apps/web/middleware.ts). Drift means silent bypass. |
| 8 | **No security headers** | `next.config.mjs` defines only rewrites — no CSP, HSTS, `X-Frame-Options` or `Referrer-Policy`. |
| 9 | **MathShield configuration risks** | `synchronize: true` in production; `API_KEY_SECRET` defaults to the literal `'demo-key'` when unset; `enableCors({ origin: true, credentials: true })`. Verify whether the 100-req/15-min bucket is per client or shared behind the Next proxy. |
| 10 | **`/api/llm` is an unthrottled egress relay** | Accepts arbitrary model names and 20 KB prompts from any enrolled user. |
| 11 | **`access_agent_nonces` has no cleanup** | Table grows without bound. |
| 12 | **`completeRun` lacks ownership checks** | Any workspace member can mark any run in the workspace passed or failed. |
| 13 | **Recovery is two keys or permanent lockout** | No break-glass path. Largest *operational* security risk in the product. |

---

## Appendix A: Evidence index

Every material claim in this document, with its source. All paths are relative to the repository root.

| § | Claim | Source |
|---|---|---|
| 2.1 | 6,281 tracked files; K6 4,056; Prometheus 1,616; ForgeOS 96 | `git ls-files` counts |
| 2.2 | `packages/security` and `packages/adapters` never imported | import-graph grep across `apps/`, `services/`, `packages/` |
| 2.2 | Worker absent from Compose | `ForgeOS/docker-compose.yml` service list |
| 3.1 | Six migrations under advisory lock | `ForgeOS/apps/api/src/platform.service.ts:61-181` |
| 3.2 | Hardware attestation policy | `ForgeOS/apps/api/src/webauthn-policy.ts:52-67` |
| 3.2 | Enrolment-only password session | `ForgeOS/apps/api/src/session.guard.ts:51-57` |
| 3.3 | Signature verified before nonce insert | `ForgeOS/apps/api/src/agent-access.service.ts:163-169` |
| 3.3 | Hash-chained audit with canonical JSON | `ForgeOS/apps/api/src/platform.service.ts:656-682` |
| 3.4 | Engine wiring per module | import graph of `ForgeOS/apps/web/app/modules/[id]/` |
| 4.1 | Nested stale MathShield copy | file listing of `MathShield-CDN/` vs `MathShield-CDN/MathShield-CDN/` |
| 4.2 | OTEL claimed, absent | `ForgeOS/docs/ARCHITECTURE.md:5`; no dependency in any `package.json` |
| 4.2 | RBAC understated in README | `README.md:7` |
| 4.3 | Commit/content mismatch | `git show --stat 9e86e68`, `git show --stat 0f3c39c` |
| 4.5 | `schema.sql` stale at 15 lines | `ForgeOS/packages/database/schema.sql` |
| 4.6 | Redis/S3 unused | no client dependency in `ForgeOS/apps/api/package.json`; no code path |
| 5.1 | First-run 503 deadlock | `ForgeOS/docker-compose.yml:14-21`, `ForgeOS/.env.example`, `webauthn-policy.ts:18-50` |
| 5.2 | Forged CI session cookie | `ForgeOS/scripts/smoke.mjs:65-71` |
| 5.3 | Bootstrap session never accepted | `ForgeOS/apps/web/middleware.ts:23-58`, `apps/web/app/api/session/route.ts:59-69` |
| 5.4 | RBAC endpoints unreferenced by UI | endpoint-usage grep over `ForgeOS/apps/web` |
| 5.5 | Duplicate dead components | `workbench-tools.tsx:6,16,24`; `more-tools.tsx:15,28`; `workbench.tsx:3-10` |
| 5.6 | `startRun` throws unconditionally | `ForgeOS/apps/api/src/platform.service.ts:628-635` |
| 5.7 | Audit readable only via 20-event overview | `ForgeOS/apps/api/src/platform.service.ts:612` |
| 5.8 | Duplicated auth policy | `session.guard.ts:14-22` vs `middleware.ts:37-59` |
| 5.9 | 15-minute session, no revocation | `ForgeOS/apps/web/app/api/session/route.ts:4` |
| 13.1 | Challenge deleted on claim | `ForgeOS/apps/api/src/platform.service.ts:246-256` |
| 13.2 | Conditional `secure` cookie flag | `ForgeOS/apps/web/app/api/session/route.ts:11` |
| 13.2 | MathShield `synchronize: true`, `demo-key` default, open CORS | `MathShield-CDN/src/app.module.ts`, `src/common/guards/api-key.guard.ts`, `src/main.ts` |

---

## Appendix B: Verification log

Commands executed against `c0307c7` on 2026-11-08.

| Check | Command | Result |
|---|---|---|
| Working tree state | `git status --porcelain` | Clean |
| Commit count | `git rev-list --count HEAD` | 12 |
| Tracked files | `git ls-files` | 6,281 |
| Script tests | `pnpm test` → `node --test scripts/*.test.mjs` | **18/18 pass** |
| API tests | `pnpm test` → `turbo test` → `jest` | **21/21 pass** (6 suites) |
| Total tests | — | **39/39 pass** |
| Type check | `pnpm typecheck` → `turbo typecheck` | **5/5 tasks successful** |

Suite contents:

- `dev-web.test.mjs` — credential generation and rejection of example values
- `quality-engines.test.mjs` — Comparer alignment, oversized-workload refusal, RegexForge bounds and zero-width matches
- `delivery-engines.test.mjs` — commit formatting and validation, scaffold generation
- `vault-storage.test.mjs` — ciphertext bound to password and workspace; lock invalidates prior key
- `prompt-import.test.mjs` — standalone and legacy prompt import, oversized-input refusal
- `password.spec.ts`, `session.guard.spec.ts`, `webauthn-policy.spec.ts`, `webauthn.service.spec.ts`, `platform.service.spec.ts`, `agent-access.service.spec.ts`

**Not verified by this analysis:** the application was not started; no Docker deployment or HTTP request was performed. All functional claims are derived from source inspection. The first-run deadlock in §5.1 is established from configuration and code paths, not from an observed HTTP 503.

---

*End of document.*
