# ForgeOS

ForgeOS is one Git repository and one product. All 14 product folders are children of this repository, not Git submodules or separate deployment targets. The unified browser app is the inner `ForgeOS/` workspace and serves every module from `http://localhost:3000`.

Run `pnpm build` from this repository root to build the unified app. Run `pnpm start` after configuring `ForgeOS/.env` to start its services. The sibling product folders remain in the same repository as source code for ongoing feature migration; users do not need to start them separately. See [setup and current features](ForgeOS/README.md) and the [feature-parity checklist](ForgeOS/docs/MODULE-MIGRATION.md).

In the UI, select a workspace and choose **Customize modules** to enable or disable tools. The choice is saved in PostgreSQL for that workspace; disabled tools disappear from navigation and cannot be selected for new projects. Current self-hosted access is a single administrator login, not multi-user RBAC.
