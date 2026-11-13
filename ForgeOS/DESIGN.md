# ForgeOS design system

ForgeOS is a focused engineering console. Navigation stays predictable while each tool keeps room for its own editor, preview, and results. The interface uses a dark navigation rail and light working surface so data, statuses, and controls remain easy to scan.

## Foundations

- Color tokens live in `apps/web/app/styles.css`: canvas `#f5f6f8`, surface `#fff`, text `#172333`, muted `#607084`, action blue `#235bba`, success `#187b57`, warning `#a76712`, danger `#b34040`.
- Body text is 14px Arial/Helvetica with a 1.45 line height. Page titles are 32px on desktop and 27px on narrow screens. Small uppercase labels are reserved for navigation and section context.
- Major spacing steps are 8, 12, 20, 28, and 36px. Borders, not stacked shadows or nested cards, separate work areas. Radius is 5-10px according to element scale.
- Desktop has a 248px persistent rail; at 760px and below, navigation becomes a compact top section with horizontally scrollable tools. Content uses a 1440px maximum width.

## Interaction rules

- Primary actions use solid blue; secondary actions are quiet text or outlined controls. Status color always accompanies a text label.
- Every control needs a visible keyboard focus state, a programmatic label, and a disabled state during writes. Escape closes dialogs and the command palette; Ctrl/Cmd+K opens search.
- Data surfaces must show loading, empty, error, and long-content states. Do not substitute demo metrics for API data.
- Tool pages share workspace context and navigation but should use task-specific layouts for editing, previewing, results, history, and export. Avoid returning every tool to a single generic card.

## Current boundary

This file describes the shared console delivered so far. It does not assert legacy-module feature parity. Keep `docs/MODULE-MIGRATION.md` as the source of truth for unfinished module workflows.

## Extension-inspired workbench standard (2026-11-14)

New components share an engineering workbench grammar with the editor extension. The web console retains its existing navigation and theme; this is an evolution, not a mandatory rewrite of every delivered screen.

### Anatomy

1. Context strip: workspace/repository, branch or artifact, processing location and explicit mode.
2. Explorer: files, changes, templates, pages, tables or cases with search and selection.
3. Main surface: editable source, diff, document or image canvas; preserve monospace alignment for code.
4. Evidence/results: validation output, changed counts, provenance, errors and exportable reports.
5. Details inspector: selected item metadata, permissions, size limits and relevant options.
6. Action bar: one clearly named primary action, secondary preview/export, and cancellation when a job exists. Do not show Commit, Apply or Publish where only draft generation is implemented.

Desktop uses split panes with independently scrolling content and bounded preview heights. At narrow widths, explorer/editor/results become labeled tabs, preserving the current file and unsaved inputs. Do not shrink multiple unreadable columns into a phone viewport. IDE side panels must work at 280px; web layouts must work at 360px and 1440px. Keyboard order follows context, inputs, action, results.

### Tokens and code emphasis

- Web surfaces keep existing --bg, --surface, --text, --line, --accent and semantic status tokens. Add --code-bg #101b2a, --code-text #e4edf8 and --code-muted #9aabc1 for code-only canvases.
- Code uses ui-monospace, Cascadia Code, Consolas, monospace at 13px/1.6. Headings remain the system sans stack. Bold means strong hierarchy and generous source visibility, not oversized decorative text or excessive gradients.
- IDE UI uses --vscode-editor-background, --vscode-editor-foreground, --vscode-input-background, --vscode-focusBorder, --vscode-button-background and corresponding foregrounds. Use VS Code font variables and native contrast themes.
- Text and status must remain distinguishable without color. Respect reduced motion; no decorative animation in evidence or progress views.

### Interaction states

Every surface specifies initial/empty, selected, dirty, loading, canceling, partial, succeeded, denied, unsupported, failed and expired states as relevant. Only show progress measured by actual work. Errors retain user input and give a concrete recovery action. A mismatch or partial sample is not an equality verdict. Safe local configuration can update optimistically with rollback; authorization and external writes await confirmation.

### Product layouts

- CommitCraft: repository picker -> staged-change evidence -> editable conventional message -> Apply to SCM input. Offline mode is always visible.
- StackForge: recipe/config explorer -> full file tree and dark code preview -> manifest/validation evidence -> ZIP download. Mark generated versus validated separately.
- SnapDiff: baseline/current metadata -> side-by-side, overlay, wipe and diff modes -> thresholds/masks -> visual metrics and report export. Do not call a pixel score semantic correctness.
- Comparer: source A/B explorers -> typed mapping -> split table/document/archive result -> chart and mismatch drilldown. Show sampled versus exact comparisons.
- PromptVault/ProbeAI: attachment provenance and versions -> prompt editor -> budget/run controls -> evaluation evidence and compare/promotion.
- PulseWatch: monitored target catalog -> timeline, console/network evidence and incidents -> run details; capture browser secrets only by explicit configured scope.
- Converter: capability-aware input/output selection -> page preview -> fidelity/size/job details -> result review and download; preserve originals.
- Vault products: masked records and explicit reveal; crypto watch-only assets must not appear as spendable custody balances.
- AgentShield: identities/capabilities -> policy version -> decision explanation and revocation -> runtime evidence. Human verification and CDN controls live elsewhere.

### Required component review

For every new workflow record its inputs, allowed effects, empty/error/loading states, accessibility labels, keyboard path, limits, storage/retention, performance target and test evidence in the relevant specification. Shared controls must not hide product-specific evidence. Architecture diagrams belong in the product specifications and link back here.


## Workspace, login and recovery surfaces

The overview uses a navy workspace-context hero, real record counts with explicit recent-run scope, three workflow entry points, a searchable/category-filtered tool grid, projects and a right-hand evidence/activity inspector. Missing API data renders unavailable/loading states, not fabricated zero metrics. Navigation and tool actions retain their existing routes and permissions.

Login uses a calm charcoal split layout, one concise product message, a compact icon workflow and an elevated form as the primary action. One blue accent marks links, focus and the primary button. Inputs use 16px text and visible labels. Preserve password/physical-key handlers, first-owner setup and enrollment-only behavior. Provide inline field validation and explicit password reveal. Forgot password opens truthful administrator-recovery guidance beside the password field; do not pretend reset email exists. The quiet shield footer describes the actual fixed 15-minute session lifetime, not an unimplemented inactivity timeout. Product proof uses actual module names, never invented customers or usage counts.

404 has its own route-inspector illustration and links to workspace, guides, tutorial and login. It must retain HTTP 404 status. The error boundary offers deliberate retry/recovery without displaying raw server error messages; loading describes pending work without numerical progress. All surfaces adapt to narrow screens and reduced-motion preferences.

## Engineering Console reference adaptation

The supplied Qwen HTML is a visual reference, not application code. Adopt its compact dark rail, blueprint workspace context, list-style workflow entry points, restrained tool tiles, and route-map 404 illustration. Retain real API counts and their recorded scope; do not import simulated fetches, generated activity, timers, or demo authentication. Login remains charcoal as requested, with tighter typography and soft borders. CommitCraft separates saved workspace drafts, composition, and optional AI assistance into three desktop panes; narrow screens switch between labeled work-area buttons without unmounting inputs. AI remains an explicit external request. The web message workbench does not claim native repository access or SCM application; those belong to the extension.

## Application navigation

The desktop rail separates workspace pages, collapsible tool categories and support links, with a workspace picker and account shortcut. A single scroll region keeps the tools reachable without displacing account controls. The sticky top bar contains breadcrumbs, explicit search and refresh actions, and a native account disclosure. At 760px and below a labeled menu button reveals navigation in document flow; Escape closes it. Native links, selects and disclosures remain keyboard accessible; active pages use aria-current, icon buttons have names and a skip link targets the main content. Workspace counts and role come from the existing API.

## Security and delivery product navigation

MathShield, AgentShield and Managed CDN have separate product links with explicit capability status. MathShield has challenge configuration, solve canvas, service-returned evidence and integration endpoints; do not imply the heuristic risk level proves identity. AgentShield retains policy drafts and preview limitations. Managed CDN has a protected /cdn planning page, discoverable through navigation and search, but no provisioning or delivery actions until a provider is integrated. It is not counted as a registered operational tool.

## VaultIQ, CraftCV and DB Pulse workspaces

VaultIQ separates a locked entry screen, searchable credential explorer and explicit editor. Existing workspace-bound AES-GCM storage stays compatible. Names/usernames remain inside ciphertext; downloads contain ciphertext and encryption metadata only. Show masked secrets by default, handle clipboard errors and state clipboard retention honestly. Auto-lock on hidden tab or five minutes without keyboard/pointer interaction; cloud sync and restore are not implied. CraftCV separates editable facts from the printable document, uses explicit local save/import/export and an unscored writing checklist. Browser drafts are unencrypted personal data. The print stylesheet removes navigation/editor controls and preserves document flow. DB Pulse compares selected tables from two real external database connections. It has independent source/target forms, discovered metadata, explicit column/key mapping, bounded read controls, result distributions and row/cell inspection. It does not use the ForgeOS audit feed. Connections start blank, result metrics appear only after a completed read and truncated windows cannot be called equal. Credentials are masked, memory-only, scoped and expiring.

## PromptVault, ProbeAI and PulseWatch UI

PromptVault uses a searchable library, a source/metadata editor with version history, and an explicit model runner with variable values, rendered-request preview and response provenance. Narrow screens switch between library/editor/runner views without unmounting inputs. Existing import and version storage remain unchanged; saving is separate from model execution. ProbeAI starts with no sample dataset, labels its trimmed exact-match scorer, distinguishes evaluated cases from pending cases, exposes per-case expected/actual text and exports page-local results without API keys. Model batches can stop after the current request; navigating away prevents remaining queued calls. PulseWatch uses real endpoint status counts, a filterable inventory, endpoint configuration/check-history inspection and incident/notification views. Unknown status is distinct from DOWN; unavailable latency/uptime is not rendered as zero. Polling snapshots are timestamped and stale data is labeled. Only actual recorded check history is visualized. Browser probes, database probes and external alert integrations must not be implied by HTTP monitor UI.

## Separate tool dashboards

The authenticated /dashboards hub links all 15 registered tools to /dashboards/[id]. Every workbench has a Dashboard shortcut; dashboard actions link back to the tool without running it. The hub supports category/search filtering and shows actual workspace enablement and project context. Tool pages state each data source and its limitations. PromptVault, CommitCraft and AgentShield use saved workspace records; PulseWatch uses the private monitoring service. CraftCV reads local draft field-presence metadata; VaultIQ reads only encrypted-envelope presence/size and never unlocks or counts entries. ProbeAI and DBPulse retain only allowlisted numeric last-result summaries in sessionStorage, scoped to the tab and workspace, without prompts, responses, row data, endpoints or credentials. Truncated DB comparisons remain inconclusive. Other page-local tools explicitly show unavailable result inventories and execution metrics, with actual project/run metadata clearly labeled as workspace context, not tool execution proof. Workspace audit events are not database-comparison evidence. All dashboard pages are protected, read-only, responsive, and use explicit loading/error/empty states.
