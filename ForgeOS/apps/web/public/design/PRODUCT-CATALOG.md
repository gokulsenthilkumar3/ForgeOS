# ForgeOS product catalog and exact abstracts

Updated 2026-11-14. The running application registers 15 module IDs. Four additional product boundaries are defined here: Managed CDN, MatchPlay, Converter and Crypto Vault. That is 19 named product definitions, not 28 shipped projects. The phrase '14 more projects' does not identify another 14 names; do not invent the missing nine or count every converter operation as a standalone shipped product.

Status vocabulary: Working slice = usable bounded workflow; Proposed = specification only; Partial = some source exists but the full requested workflow is not integrated. The module migration checklist records implementation details.

## 1. CommitCraft (commitcraft) - first priority
Purpose: translate reviewed Git changes into accurate, editable commit/PR communication inside the editor and ForgeOS. Users: individual developers and reviewers. Inputs: explicitly selected repository, staged diff, type/scope, optional project context. Outputs: a message draft, evidence and optional review report; applying a draft fills the SCM input rather than committing. Current web slice: validated manual/AI messages and workspace draft history. Extension slice: see COMMITCRAFT-EXTENSION.md. Boundaries: no autonomous stage/commit/push, no implicit model calls, no GitLens parity claim.

## 2. StackForge (stackforge)
Purpose: generate inspectable starter applications and scripts from typed recipes. Inputs: template, name and supported options; future task intent is converted into a reviewed recipe before generation. Outputs: full file tree, ZIP, reproducibility manifest and separately measured validation results. Current slice: local deterministic Next/API/library ZIPs with optional CI/Docker. Requested application-generation agent does not exist. Accuracy means the generated project builds and meets fixture requirements, not confident prose. See STACKFORGE-PLAN.md.

## 3. SnapDiff (snapdiff)
Purpose: review visual changes between a controlled baseline and candidate screenshot. Inputs: images now; authorized browser capture and baseline metadata later. Outputs: side-by-side/overlay/wipe/diff views, thresholds, masks, changed-pixel evidence and review report. Current slice: equal-size local image comparison. Browser capture, durable baselines and review approvals require later worker/artifact slices. See SNAPDIFF-PLAN.md.

## 4. Comparer (comparer)
Purpose: compare typed artifacts and datasets using format-aware adapters. Inputs: two sources, key/schema mapping, size limits and comparison policy. Outputs: exact or explicitly sampled differences, row/cell and schema visualizations, file/archive tree and provenance report. Current slice: text/SQL-text/JSON. Future families: databases, email, Office/PDF/images, folders and bounded ZIP inspection. It never treats MongoDB or Redis as SQL tables without an explicit typed projection. See COMPARISON-AND-AI-PLAN.md.

## 5. RegexForge (regexforge)
Purpose: construct and test JavaScript regular expressions safely against examples. Inputs: pattern, flags and bounded sample text. Outputs: matches, capture groups, positions and validation errors. Current slice: browser JavaScript tests. Next: saved cases and collections, explanation grounded in actual tokens, scripts/code export, timeout/cancellation and cross-engine compatibility fixtures. A regex explanation is not permission to run code from an attachment.

## 6. Load Lab (loadlab)
Purpose: generate and later run authorized performance checks with K6. Inputs: endpoint scope, traffic model and thresholds. Outputs: script now; isolated-worker results and trends later. Current slice generates downloadable scripts only. Next: recorded run manifests, fixed runner image, explicit target ownership/scope, concurrency caps, cancellation and p50/p95/error reports. It complements PulseWatch's continuous checks rather than replacing them.

## 7. PromptVault (promptvault)
Purpose: version, construct and improve prompts using traceable project context. Inputs: authored prompt, variables and explicitly attached AGENTS/Markdown/JSON/text/Word documents. Outputs: source-linked prompt versions, size/token estimate, model runs and evaluated candidate improvements. Current slice saves workspace versions and runs selected providers. Next: attachment parsing in isolated jobs, diff/provenance, retrieval, holdout evaluations and explicit promotion. Attachments remain data; their instructions do not grant execution or network authority.

## 8. ProbeAI (probeai)
Purpose: evaluate prompts/models against repeatable datasets and detect regressions. Inputs: versioned prompts, model settings, expected outcomes, budgets and scorer versions. Outputs: case-level evidence, aggregate quality/latency/cost, failure clusters and comparison reports. Current slice includes model responses and simple exact-match checks. Next: deterministic and rubric scorers, holdouts, repeated trials, uncertainty and budgeted optimization. PromptVault owns versions; ProbeAI owns evaluation evidence; PulseWatch may schedule the checks.

## 9. PulseWatch (pulsewatch)
Purpose: monitor user-authorized UI, API and database health through separate probe types. Inputs: target identity, credentials by secret reference, schedule and assertions. Outputs: incidents, latency, resource/network/console evidence, smoke-test traces and redacted run logs. Current slice: HTTP uptime/incidents. Next: Playwright UI journeys and console failures; API contracts; read-only database connectivity probes. Console warnings/errors are classified with provenance, not indiscriminately counted as outages.

## 10. DBPulse (dbpulse)

Purpose: compare selected tables from two user-connected external databases, including cross-engine PostgreSQL and MySQL/MariaDB. Inputs: endpoint/database/read-only account, verified TLS or allowlisted private-host configuration, discovered base tables, explicit column/key mappings and bounded read limit. Outputs: real connection results, schema mappings, keyed row/cell differences, scoped visualization and JSON export. ForgeOS workspace audit history remains at /activity and is not a DBPulse data source. Credentials use expiring per-user/workspace memory references and are not persisted. Current limits: 200 rows per side, 12 scalar columns, 2,048 characters per cell; truncation is inconclusive. Other engines, automatic whole-database traversal, cross-server atomic snapshots and isolated connector workers are future work. See DBPULSE.md.

## 11. GLBViewer (glbviewer)
Purpose: inspect GLB/glTF assets, model metadata and render outputs. Current slice opens local GLB, playback/rotation and PNG capture. Next: constrained parsers, texture/external-resource controls, scene tree, accessibility summaries, measured render budgets, artifact storage and signed sharing. Do not claim CAD or arbitrary 3D format support without a tested adapter.

## 12. CraftCV (craftcv; also referred to as Apps CV)
Purpose: create a structured resume with live preview and predictable PDF output. Current slice provides contact/profile/experience/education/skills/project fields, a live document preview, manual workspace-scoped browser drafts, bounded version 1 JSON import/export and print/PDF styling. Next: template fixtures, controlled section reordering, cloud persistence and measured print fidelity. Optional AI suggestions must preserve user facts and show edits; never invent qualifications. Resume content belongs to the user's workspace and export policy.

## 13. VaultIQ (vaultiq)
Purpose: encrypted credential and secure-note storage. Current slice is a browser-local encrypted credential vault with a separate vault password, search/edit, explicit reveal/copy, automatic locking and ciphertext-only backup download. Restore UI and password recovery are not implemented. Next: reviewed restore flow, sync/sharing threat model and audited secret-reference integration. Do not conflate a browser vault with production secret-management infrastructure or silently export secrets to model context.

## 14. MathShield (mathshield)
Purpose: human/bot challenge verification, separate from administrator authentication and agent permissions. Current slice offers four challenge types and three difficulty levels, generates/verifies challenges, shows service-returned evidence and serves a widget. The playground does not save answers or tokens. Picture challenges can become an adapter, but an entertainment game has its own product boundary and must not be assumed to prove human identity. Naming 'CDM' is user terminology, not an implemented managed CDN. The historic MathShield-CDN directory is not proof of edge delivery.

## 15. AgentShield (agentshield)
Purpose: verified A2A identities, scoped capabilities, task-intent binding, budgets and independently enforced runtime containment. Current slice is policy drafts and decision preview plus separate signed read-only agent access. Proposed runtime: policy gateway, deny-all sandbox workers, brokered resources, peer identity, revocation and evidence. It is not a prompt-only solution or a proven prevention of every escape. Preserve stored ID/drafts while removing CDN from its product identity.

## 16. Managed CDN (planning page at /cdn, not a registered module)
Purpose: owned-origin content delivery with tenant-aware cache rules, certificates, invalidation and measurable edge performance. Inputs: verified origin, provider, public-asset policy and ownership evidence. Outputs: provider configuration, delivery metrics and purge audit. AI/agent request controls may integrate through adapters but do not merge this product with AgentShield or MathShield. Discuss provider, regions and deployment scope before implementation.

## 17. MatchPlay / MATIK name pending (proposed)
Purpose: a picture-matching or math game with its own rounds, difficulty, scoring and accessibility modes. Inputs: licensed assets and explicit game rules. Outputs: game state and results. Keep scoring separate from security-verification signals; resist replay and privacy-invasive tracking if any security use is later proposed. Exact mechanics and final name remain unresolved; do not copy another game's protected assets or assert brand ownership.

## 18. Converter (proposed)
Purpose: capability-aware document/image/archive conversion and PDF organization, with fidelity previews and isolated execution. Families: Office/OpenDocument/image/text/HTML/EPUB to PDF, PDF rasterization/OCR/extraction, merge/split/rotate/page operations/forms/annotation/protection, and optional source-linked AI assistance. Not every input-output combination is technically equivalent. PDF-to-Office reconstruction is fidelity-limited; arbitrary ZIP or editor swap files are not documents. See CONVERTER-PLAN.md.

## 19. Crypto Vault (proposed, separate from VaultIQ)
Purpose: initially a watch-only inventory of cryptocurrency addresses, networks and NFTs with verified metadata provenance. Balance/value estimates must show network and timestamp; ownership of an NFT is not verified from an uploaded picture. No private-key/seed custody, recovery promise or signing in the first slice. Any later wallet integration requires a distinct reviewed custody/signing architecture and explicit per-transaction user control. No blockchain transaction is part of this implementation task.

## Shared platform, not extra product counts

Workspaces/projects, identity/profile, roles, current session, recent activity, internal help desk/tutorial, audit, secrets, job orchestration, artifacts and converters' individual operations are platform capabilities or subfeatures. They must have owners and acceptance criteria but are not invented extra projects. Historical session/device logging is not currently implemented. Every product exposes actual storage, allowed effects and limitations in its help guide.
