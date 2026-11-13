# CommitCraft 0.1.0 validation

- 13 local engine/host-boundary tests passed.
- Real VS Code 1.146.0 isolated development-host test passed: activation, native staged evidence, SCM-only draft application, no commit and stale rejection.
- VSIX archive inspected: 9 files, no tests, credentials, dependency tree or repository source payload.
- SHA-256: 7c27307c6b3d95342ba9cce927a5caaaccda21a5bb77da1173f5f9edca4dbec8
- Cursor, Windsurf and Kiro are compatibility targets and remain untested. Leo remains unidentified. No Marketplace/Open VSX publication occurred.
- Package installation is recorded separately after the isolated CLI check; development-host activation does not by itself prove packaged installation.

Packaged VSIX installation passed through the VS Code CLI in a separate test-only user-data/extensions profile; --list-extensions --show-versions returned forgeos-local.commitcraft@0.1.0. Normal editor profiles were not modified.
