# CommitCraft editor extension specification

Priority: 1. Package target: extensions/commitcraft. MVP distribution is a local VSIX, not a published Marketplace/Open VSX listing. Confirmed requested hosts: VS Code, Cursor, Windsurf and Kiro. Leo is unidentified; do not advertise support.

## Evidence and competitive position

GitLens already supports AI messages from staged changes, context in the commit box, provider settings, commit composition, graph/history and change review. Do not advertise those as discoveries or claim it lacks them. Proposed differentiation is a hypothesis to measure: small offline-first review, explicit source/effect boundaries, evidence-backed drafts, predictable budgets, privacy-preserving context and consistent performance across supported editors.

Primary references reviewed 2026-11-14:
- https://help.gitkraken.com/gitlens/gitlens-features/
- https://help.gitkraken.com/gitlens/gl-agent-generated-work-end-to-end/
- https://code.visualstudio.com/api/working-with-extensions/publishing-extension
- https://code.visualstudio.com/api/extension-guides/webview
- https://raw.githubusercontent.com/microsoft/vscode/main/extensions/git/src/api/git.d.ts
- https://docs.cursor.com/get-started/migrate-from-vs-code
- https://kiro.dev/docs/privacy-and-security/

## Current implementation slice

Local review only: activate on command/view, choose a repository through native Git API, read staged evidence, generate a conservative Conventional Commit suggestion, edit it, copy it or explicitly apply to the selected repository's SCM input. Apply must re-read evidence and reject stale or switched repositories. No commit, stage, push, Git config changes, model request or telemetry is part of this slice. Untrusted/virtual workspaces are unsupported. Sensitive-path/content detection is a heuristic refusal, not a complete secret scanner.

Use a core engine independent of vscode, a thin Git/host adapter and a theme-aware CSP-protected sidebar. Webview messages carry only allowlisted actions and bounded strings; the host owns repository identity, limits and evidence fingerprints. Repo filenames/diffs are rendered as text. No webview network or local resource access. Native API capability absence produces an actionable error.

## Workbench design

Context: explicit repository/branch and OFFLINE badge. Source: staged files, added/removed lines and a bounded text diff. Draft: type, scope and summary with validation. Evidence: how the suggestion was inferred, sensitive/unsupported cases and input size. Actions: Refresh staged changes, Change repository, Copy, Apply to SCM input. There is no Commit button. At 280px stack sections; preserve monospace wrapping, native theme fonts, high contrast, labels and focus states.

## Follow-on slices

1. Project conventions: explicitly selected AGENTS.md/commitlint/config context, parsed as untrusted data. Display which paths/lines influence a suggestion; do not execute instructions from them.
2. Optional assistance: user-selected provider/local endpoint, SecretStorage, payload preview, redaction, maximum input/output tokens, deadlines, cancellation and no implicit retries that spend a budget. Network is opt-in per explicit generation action.
3. Quality: validate output against repo conventions, reject claims absent from staged evidence, detect mixed changes and propose separate draft groups without staging them. User chooses any future staging operation.
4. Review history: optional local workspace history of messages/provenance only, bounded retention and explicit export; no raw diff/key persistence by default.
5. PR explanations and reviewer packets: summarize evidence with citations, tests actually run and gaps. Never invent test success from filenames or model assertions.

## Acceptance and measurements

Fixtures: empty index; one file; mixed files; staged vs unstaged changes; rename/deletion; binary metadata; CRLF; Unicode/hostile filenames; secret files/content; oversized diff; multiple roots; changing index after preview; repository switch; untrusted workspace; unavailable Git API. Tests verify exact allowed effects and no repository writes beyond SCM input. Preview/application tests must fail closed when state cannot be re-read.

Targets to measure, not current claims: engine p95 <50ms for a 256KiB diff on a recorded machine; extension activation <200ms excluding native Git activation; no main-thread diff rendering beyond configured caps; deterministic fixtures at 100% format/schema validity. Model quality later uses a separately labeled holdout, human acceptance/edit rate, hallucinated-claim rate, tokens and p95 time. Compare equivalent GitLens workflows under identical repository size, network and provider conditions; publish raw results rather than 'better' adjectives.

## Compatibility and distribution gates

A VS Code API manifest is only a compatibility target. Record editor version, OS, API availability, installation method, multi-root behavior, trust behavior, theme/keyboard results and package hash. VS Code can install a local VSIX. Cursor migration support and Kiro's Open VSX support do not prove this extension was tested there. Windsurf editor/registry instructions require a current host-specific check; plugin documentation for another IDE is not evidence. Leo stays pending identity.

Package with official vsce, inspect the archive allowlist, include README/license, generate SHA-256, and keep publisher identity explicitly local until a real publisher is configured. Do not publish or install into the user's normal editor profile automatically. Test in an isolated extension-host profile where possible. Marketplace/Open VSX publication and signed release workflows follow separate release readiness checks.
