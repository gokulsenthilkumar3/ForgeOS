# Module migration checklist

Shared console update (2026-09-24): a task-first dashboard, common module navigation, workspace switcher, command search across enabled tools/projects/recent audit events, in-app creation forms, responsive shell, and authorization regression tests are in place. This changes no module's feature-parity status in the table below. Search is limited to the current overview data; server-wide search and notifications remain open platform work.

Single-port and CI check (2026-09-24): the Compose web entry point served the dashboard, all 14 module routes, workspace APIs, PulseWatch API, and MathShield widget through port 3000 in an authenticated smoke run. GitHub Actions now defines build, type-check, test, and the same smoke job; its first hosted run remains pending until these changes are pushed. These route checks do not establish full feature parity for the modules below.

Current code inspection (2026-11-09): treat the 2026-09-24 smoke results above as historical, not as evidence of a current deployed check. The API's `startRun` path validates workspace/project/module access but currently throws `NotImplementedException` because no background runner is configured. The worker package contains a runner registry interface but no queue consumer or registered ForgeOS module runners. PostgreSQL schemas/contracts define artifacts and notifications, but their persistent, end-to-end lifecycles are not implemented. Core workspace membership and role checks exist; SSO, service accounts, and deployment-level tenant-isolation validation do not. The table below reflects current source-code inspection; browser and deployed workflows were not re-run as part of this review.

PromptVault persistence slice (2026-09-24): workspace-scoped module records and disabled-module API checks are implemented and covered by API unit tests. Current source includes workspace-backed PromptVault saves, imports/exports, variable substitution, and model calls. The browser workflow and standalone parity were not revalidated in this review; team workflows, branches, experiments, and the rest of the 14-module parity work remain open.

The table distinguishes what works in the shared UI today from the source features that still need integration. Each row must be tested through port 3000 before it is marked complete.

| Module | Working through ForgeOS | Remaining for source parity |
| --- | --- | --- |
| CommitCraft | Conventional Commit drafts, scopes and workspace history/export, backup-first browser-history import, optional OpenAI/Anthropic BYOK | PR drafts, local Ollama, history pagination/retention and project association |
| StackForge | Downloadable Next/API/library project ZIP | Full template catalog, CLI options and validation |
| SnapDiff | Local equal-size screenshot comparison | Playwright capture, baselines, PR approvals, viewports |
| Comparer | Local text/JSON, folder and image comparison with workload caps and downloadable results | Excel and richer document formats, persisted comparisons and project association |
| RegexForge | JavaScript testing in a worker, match/capture-group display, timeout and pattern-only share links | Saved collections, Python/Go runners and explanation |
| Load Lab | Valid K6 script download | Private worker execution, results and trend reporting |
| PromptVault | Workspace-persisted versions/metadata, JSON import/export, variable substitution and optional model runner (source implemented; live browser flow not revalidated) | Team collection management, branches, A/B tests and complete live workflow verification |
| ProbeAI | Exact-match cases and model calls | YAML suites, evaluator catalog, batch/regression history |
| PulseWatch | Workspace-scoped monitor CRUD/checks, incidents and in-app notifications through a role-checked proxy; backend persists file-backed state | Public status page, external notification channels, quotas/retention, egress controls and end-to-end validation |
| DBPulse | ForgeOS audit event filter and CSV export | External database connectors, row/schema diff, policies, retention |
| GLBViewer | Local GLB playback, rotation and PNG capture | Persistent uploads, share links, embeds, lighting and morph controls |
| CraftCV | Basic edit, preview and print/PDF | Multiple templates, autosave, schema import |
| VaultIQ | Browser encrypted entries and generator | Security scoring, secure sharing, account sync |
| MathShield | Challenge, verification and widget on ForgeOS origin | Shared workspace analytics and configuration UI |
| AgentShield | Separate policy module, saved administrator drafts, local decision preview, protocol inventory | Edge delivery, sandbox runtime enforcement, A2A/MCP adapters, live budgets and cache metrics; see AGENTSHIELD.md |

Platform tasks still open: worker dispatch and status updates; persistent artifacts and short-lived URLs; deeper enterprise RBAC, SSO, service accounts and deployment-level tenant-isolation validation; full audit coverage; connector secret management; cloud/Kubernetes deployment parity; cross-module search and notifications; end-to-end tests for all source workflows. Prioritize a non-networking worker vertical slice with strict job validation and persisted results before implementing private database capture or arbitrary K6 execution.
