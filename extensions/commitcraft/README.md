# CommitCraft - Local Commit Review

A small offline staged-change review extension for VS Code-compatible desktop editors. Version 0.1.0 is a local VSIX development release, not a published Marketplace/Open VSX listing or a claim of GitLens feature parity.

## Use

1. Install the supplied VSIX through Extensions: Install from VSIX.
2. Open a trusted Git repository and stage the intended changes in native Source Control.
3. Run CommitCraft: Open Staged Review, then Load staged changes. Pick a repository if multiple are open.
4. Review file/line evidence and edit the Conventional Commit type, scope and summary.
5. Copy the draft or choose Apply to SCM input. Use native Source Control separately if you decide to commit.

No source uploads, network requests, telemetry, model calls, automatic stage/commit/push or credential persistence. Potential sensitive files/content are refused by heuristics; this is not a complete secret scanner. The index is re-read before applying and stale evidence is rejected. Large staged sets/diffs must be reviewed in smaller pieces. The initial suggestion is conservative and must be edited to reflect actual behavior.

## Host status

- VS Code: API/package target; consult release validation for actual host-test evidence.
- Cursor, Windsurf, Kiro: intended compatibility targets, not verified until installed/activated in each host/version.
- Leo: identity unresolved; not supported or advertised.
- Browser/virtual workspaces: unsupported. Remote desktop extension hosts require their own validation.

The manifest publisher forgeos-local is a local package identity, not a verified Marketplace publisher. Do not publish it as an official store release without configuring a real publisher and release process.

## Development

Run `npm test` for local-engine and host-boundary tests. `npm run package` invokes official @vscode/vsce and writes the artifact into ForgeOS/apps/web/public/downloads. No runtime dependencies are required. Specification: ../../ForgeOS/docs/COMMITCRAFT-EXTENSION.md.
