# Module migration checklist

The table distinguishes what works in the shared UI today from the source features that still need integration. Each row must be tested through port 3000 before it is marked complete.

| Module | Working through ForgeOS | Remaining for source parity |
| --- | --- | --- |
| CommitCraft | Conventional commit draft, OpenAI/Anthropic BYOK | PR drafts, scopes/history persistence, local Ollama |
| StackForge | Downloadable Next/API/library project ZIP | Full template catalog, CLI options and validation |
| SnapDiff | Local equal-size screenshot comparison | Playwright capture, baselines, PR approvals, viewports |
| Comparer | Text, SQL, JSON line view | Images, Excel, document and folder diff engines |
| RegexForge | JavaScript match testing | Saved collections, share links, Python/Go runners, explanation |
| Load Lab | Valid K6 script download | Private worker execution, results and trend reporting |
| PromptVault | Local versions and model runner | Team collections, branches, A/B tests and server persistence |
| ProbeAI | Exact-match cases and model calls | YAML suites, evaluator catalog, batch/regression history |
| PulseWatch | Monitor CRUD, checks, incidents, persistent service state | Status page, notification channels and workspace-level permissions |
| DBPulse | ForgeOS audit event filter and CSV export | External database connectors, row/schema diff, policies, retention |
| GLBViewer | Local GLB playback, rotation and PNG capture | Persistent uploads, share links, embeds, lighting and morph controls |
| CraftCV | Basic edit, preview and print/PDF | Multiple templates, autosave, schema import |
| VaultIQ | Browser encrypted entries and generator | Security scoring, secure sharing, account sync |
| MathShield | Challenge, verification and widget on ForgeOS origin | Shared workspace analytics and configuration UI |

Platform tasks still open: worker dispatch and status updates; persistent artifacts and short-lived URLs; RBAC, SSO, service accounts and tenant isolation; full audit coverage; connector secret management; cloud/Kubernetes deployment parity; cross-module search and notifications; end-to-end tests for all source workflows.
