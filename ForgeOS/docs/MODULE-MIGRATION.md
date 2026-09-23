# Module migration checklist

Shared console update (2026-09-24): a task-first dashboard, common module navigation, workspace switcher, command search across enabled tools/projects/recent audit events, in-app creation forms, responsive shell, and authorization regression tests are in place. This changes no module's feature-parity status in the table below. Search is limited to the current overview data; server-wide search and notifications remain open platform work.

Single-port and CI check (2026-09-24): the Compose web entry point served the dashboard, all 14 module routes, workspace APIs, PulseWatch API, and MathShield widget through port 3000 in an authenticated smoke run. GitHub Actions now defines build, type-check, test, and the same smoke job; its first hosted run remains pending until these changes are pushed. These route checks do not establish full feature parity for the modules below.

PromptVault persistence slice (2026-09-24): workspace-scoped module records and disabled-module API checks are implemented and covered by API unit tests. The PromptVault UI now saves version history to those records and offers backup-first import of its prior browser-local prompts, without removing browser copies. API and web builds pass; the migration and authenticated record listing returned successfully on the Compose deployment through port 3000. Browser save/import and standalone PromptVault parity have not yet been verified; team collections, branches, experiments, and the rest of the 14-module parity work remain open.

The table distinguishes what works in the shared UI today from the source features that still need integration. Each row must be tested through port 3000 before it is marked complete.

| Module | Working through ForgeOS | Remaining for source parity |
| --- | --- | --- |
| CommitCraft | Conventional commit draft, OpenAI/Anthropic BYOK | PR drafts, scopes/history persistence, local Ollama |
| StackForge | Downloadable Next/API/library project ZIP | Full template catalog, CLI options and validation |
| SnapDiff | Local equal-size screenshot comparison | Playwright capture, baselines, PR approvals, viewports |
| Comparer | Text, SQL, JSON line view | Images, Excel, document and folder diff engines |
| RegexForge | JavaScript match testing | Saved collections, share links, Python/Go runners, explanation |
| Load Lab | Valid K6 script download | Private worker execution, results and trend reporting |
| PromptVault | Workspace-persisted versions, browser backup/import, and model runner (API listing verified; browser save/import pending) | Team collections, branches, A/B tests, standalone data import, and complete live workflow verification |
| ProbeAI | Exact-match cases and model calls | YAML suites, evaluator catalog, batch/regression history |
| PulseWatch | Monitor CRUD, checks, incidents, persistent service state | Status page, notification channels and workspace-level permissions |
| DBPulse | ForgeOS audit event filter and CSV export | External database connectors, row/schema diff, policies, retention |
| GLBViewer | Local GLB playback, rotation and PNG capture | Persistent uploads, share links, embeds, lighting and morph controls |
| CraftCV | Basic edit, preview and print/PDF | Multiple templates, autosave, schema import |
| VaultIQ | Browser encrypted entries and generator | Security scoring, secure sharing, account sync |
| MathShield | Challenge, verification and widget on ForgeOS origin | Shared workspace analytics and configuration UI |

Platform tasks still open: worker dispatch and status updates; persistent artifacts and short-lived URLs; RBAC, SSO, service accounts and tenant isolation; full audit coverage; connector secret management; cloud/Kubernetes deployment parity; cross-module search and notifications; end-to-end tests for all source workflows.
