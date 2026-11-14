# Graph Report - ForgeOS  (2026-11-13)

## Corpus Check
- Corpus is ~32,127 words - fits in a single context window. You may not need a graph.

## Summary
- 849 nodes · 1456 edges · 53 communities (43 shown, 10 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 51 edges (avg confidence: 0.86)
- Token cost: AST 0; semantic agent usage unavailable (not measured)

## Community Hubs (Navigation)
- contracts/src/index.ts connections
- web/package.json connections
- api/package.json connections
- AgentAccessService connections
- PlatformController connections
- workbench-tools.tsx connections
- AgentShield CDN connections
- platform.controller.ts connections
- compare-tool.tsx connections
- workbench.tsx connections
- [...path]/route.ts connections
- @nestjs/common connections
- platform.service.ts connections
- PlatformService connections
- containers connections
- package.json connections
- more-tools.tsx connections
- compilerOptions connections
- tasks connections
- webauthn-policy.spec.ts connections
- CommitTool() connections
- prompt-vault.tsx connections
- values.yaml connections
- validateShieldPolicy() connections
- worker/package.json connections
- compilerOptions connections
- delivery-engines.test.mjs connections
- services connections
- environment connections
- compilerOptions connections
- adapters/src/index.ts connections
- security/src/index.ts connections
- smoke.mjs connections
- compilerOptions connections
- environment connections
- environment connections
- minio connections
- postgres connections
- adapters/package.json connections
- contracts/package.json connections
- layout.tsx connections
- Chart.yaml connections
- context connections
- pulsewatch connections
- PulseWatchTool() connections
- security/package.json connections
- nest-cli.json connections
- pnpm-workspace.yaml connections

## God Nodes (most connected - your core abstractions)
1. `PlatformService` - 50 edges
2. `PlatformController` - 31 edges
3. `ModuleId` - 19 edges
4. `Workbench()` - 18 edges
5. `react` - 17 edges
6. `AgentAccessService` - 16 edges
7. `ConsoleShell()` - 16 edges
8. `@nestjs/common` - 15 edges
9. `CommitTool()` - 15 edges
10. `compilerOptions` - 15 edges

## Surprising Connections (you probably didn't know these)
- `Accessible interaction and truthful data states` --semantically_similar_to--> `Unfinished managed CDN requirements`  [INFERRED] [semantically similar]
  DESIGN.md → docs/ARCHITECTURE.md
- `ProjectInput` --references--> `ModuleId`  [EXTRACTED]
  apps/api/src/platform.controller.ts → packages/contracts/src/index.ts
- `ModulesInput` --references--> `ModuleId`  [EXTRACTED]
  apps/api/src/platform.controller.ts → packages/contracts/src/index.ts
- `RunInput` --references--> `ModuleId`  [EXTRACTED]
  apps/api/src/platform.controller.ts → packages/contracts/src/index.ts
- `load()` --calls--> `validateShieldPolicy()`  [EXTRACTED]
  apps/web/app/modules/[id]/agent-shield.tsx → packages/contracts/src/agent-shield.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Target authorization and runtime isolation requirements** — docs_architecture_target_agent_data_path, docs_agentshield_isolated_workers, docs_agentshield_authorization_gateway, docs_agentshield_network_validation [EXTRACTED 1.00]
- **Implemented entry points do not establish completed services or parity** — docs_module_migration_migration_checklist, docs_module_migration_platform_backlog, docs_architecture_unfinished_execution_and_storage, docs_architecture_unfinished_production_telemetry, docs_agentshield_policy_workbench [INFERRED 0.95]
- **Workspace-scoped configuration and persisted records** — readme_customize_modules, docs_agentshield_policy_workbench, docs_module_migration_promptvault, docs_architecture_workspace_records [INFERRED 0.95]

## Communities (53 total, 10 thin omitted)

### Community 0 - "contracts/src/index.ts connections"
Cohesion: 0.06
Nodes (33): Agent, AgentAccessPanel(), grant(), register(), revoke(), Grant, keyApproval(), responseError() (+25 more)

### Community 1 - "web/package.json connections"
Cohesion: 0.06
Nodes (44): Credential, EnrollKey(), addKey(), refresh(), errorMessage(), destination(), Login(), createOwner() (+36 more)

### Community 2 - "api/package.json connections"
Cohesion: 0.06
Nodes (45): dependencies, class-transformer@^0.5.1, class-validator@^0.14.1, @forgeos/contracts@workspace:*, @forgeos/security@workspace:*, @nestjs/common@^10.4.0, @nestjs/core@^10.4.0, @nestjs/platform-express@^10.4.0 (+37 more)

### Community 3 - "AgentAccessService connections"
Cohesion: 0.10
Nodes (8): AgentAccessController, AuthRequest, GrantInput, RegisterAgentInput, SignedRequest, AgentAccessService, AgentKind, AuthActor

### Community 5 - "workbench-tools.tsx connections"
Cohesion: 0.10
Nodes (20): base64ToBytes(), bytesToBase64(), derive(), openVault(), persistVault(), SavedVault, UnlockedVault, VaultEntry (+12 more)

### Community 6 - "AgentShield CDN connections"
Cohesion: 0.12
Nodes (20): ForgeOS design system, AgentShield CDN, Policy drafts and local decision preview, Planned protocol adapters, Module catalog contracts and record-write audit, Platform authorization and approved agent grants, Running Next.js and NestJS application, Shared UI and server policy validator (+12 more)

### Community 7 - "platform.controller.ts connections"
Cohesion: 0.15
Nodes (17): AcceptInvitationInput, AuthRequest, CompleteInput, InvitationInput, LoginInput, ModuleRecordInput, ModulesInput, OwnerInput (+9 more)

### Community 8 - "compare-tool.tsx connections"
Cohesion: 0.12
Nodes (21): compareLines(), exportComparison(), MAX_INPUT_CHARACTERS, MAX_LINE_CELLS, CompareTool(), compareFolders(), inspectFolderFile(), loadTextFile() (+13 more)

### Community 9 - "workbench.tsx connections"
Cohesion: 0.13
Nodes (13): ModelViewerTool(), ModuleGate(), AuditExplorerTool(), download(), LoadScriptTool(), RegexMatch, RegexTool(), Result (+5 more)

### Community 10 - "[...path]/route.ts connections"
Cohesion: 0.11
Nodes (17): allowed, Context, DELETE(), forward(), GET(), POST(), PUT(), apiLogin() (+9 more)

### Community 11 - "@nestjs/common connections"
Cohesion: 0.15
Nodes (8): emptyBodyHash, SignedRequest, AppModule, SessionGuard, SessionRequest, user, @nestjs/common, @nestjs/core

### Community 12 - "platform.service.ts connections"
Cohesion: 0.18
Nodes (13): derive(), hashPassword(), verifyPassword(), allowedApprovalActions, canonicalJson(), ChallengePurpose, ChallengeRow, CredentialRow (+5 more)

### Community 14 - "containers connections"
Cohesion: 0.10
Nodes (19): apiVersion, env, image, name, ports, kind, app, app (+11 more)

### Community 15 - "package.json connections"
Cohesion: 0.11
Nodes (19): devDependencies, turbo@^2.3.3, typescript@^5.7.2, engines, node, pnpm, typescript, name (+11 more)

### Community 16 - "more-tools.tsx connections"
Cohesion: 0.15
Nodes (12): AuditItem, Endpoint, EvaluationTool(), Incident, ModelControls(), MonitorNotification, MonitorStats, PromptRecord (+4 more)

### Community 17 - "compilerOptions connections"
Cohesion: 0.11
Nodes (17): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+9 more)

### Community 18 - "tasks connections"
Cohesion: 0.11
Nodes (17): dependsOn, env, outputs, cache, persistent, outputs, $schema, tasks (+9 more)

### Community 19 - "webauthn-policy.spec.ts connections"
Cohesion: 0.22
Nodes (7): requireHardwarePolicy(), goodInfo, roots, verifyHardwareAttestation(), WebAuthnConfig, webAuthnConfig(), @simplewebauthn/server

### Community 20 - "CommitTool() connections"
Cohesion: 0.21
Nodes (12): commitTypes, formatCommit(), validateGeneratedCommit(), CommitContent, CommitTool(), generateAi(), importLegacy(), refresh() (+4 more)

### Community 21 - "prompt-vault.tsx connections"
Cohesion: 0.19
Nodes (13): demoTitles, parsePromptImport(), download(), Prompt, PromptMetadata, PromptTool(), importLegacy(), previewFiles() (+5 more)

### Community 22 - "values.yaml connections"
Cohesion: 0.12
Nodes (16): config, apiUrl, mode, image, repository, tag, ingress, enabled (+8 more)

### Community 23 - "validateShieldPolicy() connections"
Cohesion: 0.23
Nodes (12): policy(), sandbox, AgentShieldTool(), load(), policy(), save(), Saved, normalizeShieldOrigin() (+4 more)

### Community 24 - "worker/package.json connections"
Cohesion: 0.16
Nodes (14): tsx, dependencies, @forgeos/contracts@workspace:*, devDependencies, tsx@^4.19.2, typescript@^5.7.2, @forgeos/contracts, typescript (+6 more)

### Community 25 - "compilerOptions connections"
Cohesion: 0.15
Nodes (12): compilerOptions, declaration, emitDecoratorMetadata, experimentalDecorators, module, outDir, removeComments, skipLibCheck (+4 more)

### Community 27 - "delivery-engines.test.mjs connections"
Cohesion: 0.30
Nodes (8): generateScaffold(), scaffoldTemplates, validateProjectName(), ScaffoldTool(), Template, JSZip, requireFromWeb, typescript

### Community 28 - "services connections"
Cohesion: 0.20
Nodes (9): expose, image, services, redis, volumes, mathshield-data, minio-data, postgres-data (+1 more)

### Community 29 - "environment connections"
Cohesion: 0.20
Nodes (10): API_KEY_SECRET, DB_NAME, JWT_SECRET, NODE_ENV, TRUST_PROXY_HOPS, depends_on, environment, expose (+2 more)

### Community 30 - "compilerOptions connections"
Cohesion: 0.20
Nodes (9): compilerOptions, declaration, module, moduleResolution, outDir, skipLibCheck, strict, target (+1 more)

### Community 31 - "adapters/src/index.ts connections"
Cohesion: 0.22
Nodes (5): AdapterContext, AdapterRegistry, Provider, ProviderAdapter, webhookEventTypes

### Community 32 - "security/src/index.ts connections"
Cohesion: 0.31
Nodes (7): Role, can(), decryptSecret(), encryptSecret(), permissions, encrypted, key

### Community 33 - "smoke.mjs connections"
Cohesion: 0.25
Nodes (7): auth, authAt, expires, request(), setupStatus, signature, waitFor()

### Community 34 - "compilerOptions connections"
Cohesion: 0.22
Nodes (8): compilerOptions, module, moduleResolution, outDir, skipLibCheck, strict, target, include

### Community 35 - "environment connections"
Cohesion: 0.25
Nodes (8): depends_on, environment, expose, DATABASE_URL, FORGEOS_MODE, FORGEOS_SESSION_SECRET, REDIS_URL, api

### Community 36 - "environment connections"
Cohesion: 0.25
Nodes (8): FORGEOS_ADMIN_PASSWORD, FORGEOS_API_INTERNAL_URL, FORGEOS_MATHSHIELD_INTERNAL_URL, FORGEOS_PULSEWATCH_INTERNAL_URL, web, depends_on, environment, ports

### Community 37 - "minio connections"
Cohesion: 0.25
Nodes (8): MINIO_ROOT_PASSWORD, MINIO_ROOT_USER, command, environment, expose, image, volumes, minio

### Community 38 - "postgres connections"
Cohesion: 0.25
Nodes (8): POSTGRES_DB, POSTGRES_PASSWORD, POSTGRES_USER, environment, expose, image, volumes, postgres

### Community 39 - "adapters/package.json connections"
Cohesion: 0.29
Nodes (7): dependencies, @forgeos/contracts@workspace:*, @forgeos/contracts, main, name, types, version

### Community 40 - "contracts/package.json connections"
Cohesion: 0.25
Nodes (7): main, name, scripts, build, typecheck, types, version

### Community 42 - "Chart.yaml connections"
Cohesion: 0.29
Nodes (6): apiVersion, appVersion, description, name, type, version

### Community 44 - "context connections"
Cohesion: 0.53
Nodes (6): build, context, dockerfile, build, build, build

### Community 45 - "pulsewatch connections"
Cohesion: 0.33
Nodes (6): PORT, PULSEWATCH_DATA_FILE, environment, expose, volumes, pulsewatch

### Community 46 - "PulseWatchTool() connections"
Cohesion: 0.70
Nodes (5): PulseWatchTool(), action(), create(), markRead(), refresh()

### Community 47 - "security/package.json connections"
Cohesion: 0.40
Nodes (4): main, name, types, version

## Knowledge Gaps
- **246 isolated node(s):** `collection`, `sourceRoot`, `name`, `private`, `dev` (+241 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 325 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `PlatformService` connect `PlatformService connections` to `AgentAccessService connections`, `PlatformController connections`, `.verifyWebAuthnAssertion() connections`, `platform.service.ts connections`, `webauthn-policy.spec.ts connections`?**
  _High betweenness centrality (0.001) - this node is a cross-community bridge._
- **What connects `collection`, `sourceRoot`, `name` to the rest of the system?**
  _246 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `contracts/src/index.ts connections` be split into smaller, more focused modules?**
  _Cohesion score 0.06377551020408163 - nodes in this community are weakly interconnected._
- **Why does `Workbench()` connect `workbench.tsx connections` to `workbench-tools.tsx connections`, `compare-tool.tsx connections`, `PulseWatchTool() connections`, `more-tools.tsx connections`, `CommitTool() connections`, `prompt-vault.tsx connections`, `validateShieldPolicy() connections`, `delivery-engines.test.mjs connections`?**
  _High betweenness centrality (0.001) - this node is a cross-community bridge._
- **Should `web/package.json connections` be split into smaller, more focused modules?**
  _Cohesion score 0.05612244897959184 - nodes in this community are weakly interconnected._
- **Should `api/package.json connections` be split into smaller, more focused modules?**
  _Cohesion score 0.05893719806763285 - nodes in this community are weakly interconnected._
- **Should `AgentAccessService connections` be split into smaller, more focused modules?**
  _Cohesion score 0.0975609756097561 - nodes in this community are weakly interconnected._

## Coverage and cost limitations

AST extraction uses no model tokens. Semantic agent token counts were not exposed by the host, so total model token cost is unknown; any generated zero counter is not a measured semantic cost. SQL schema extraction was skipped because tree_sitter_sql is not installed. Decorative icon excluded. Eight code files produced no symbols; the graph is not proof of full workflow coverage.

Graph outputs are written into the working tree. Local caches/intermediates are ignored; graph.json, graph.html and this report remain reviewable artifacts.

## Graph integrity limitations

[graphify] MultiDiGraph edge-collapse diagnostic
input: <in-memory>
input_stage: provided JSON (normal graph.json is post-build)
effective_directed: <direct-call>
nodes: 824
unverified_code_nodes: 0
raw_edges: 1521
valid_candidate_edges: 1471
missing_endpoint_edges: 0
dangling_endpoint_edges: 17
external_reference_edges: 33
self_loop_edges: 2
exact_duplicate_edges: 2
directed_unique_endpoint_pairs: 1407
directed_same_endpoint_collapsed_edges: 64
undirected_unique_endpoint_pairs: 1407
undirected_same_endpoint_collapsed_edges: 64
same_endpoint_group_count: 63
relation_variant_groups: 55
source_file_variant_groups: 0
source_location_variant_groups: 7
context_variant_groups: 0
post_build_graph_type: DiGraph
post_build_edges: 1456
producer_suppression_sites: 12
producer_suppression_examples:
  - L1857 seen_ids arity=unknown
  - L2532 seen_ids arity=unknown
  - L2534 seen_doc_refs arity=unknown
  - L3201 seen_ids arity=unknown
  - L3348 seen_ids arity=unknown
  - L4489 seen_keys arity=unknown
  - L4675 seen_keys arity=unknown
  - L8495 seen_ids arity=unknown
examples:
  - apps_web_app_modules_id_model_viewer -> three edges=3 relations=['dynamic_import'] locations=[''] contexts=['']
  - apps_api_src_agent_access_controller_registeragentinput -> apps_api_src_agent_access_controller_ts_isuuid edges=2 relations=['references'] locations=['L10', 'L14'] contexts=['decorator']
  - apps_api_src_agent_access_controller_registeragentinput -> apps_api_src_agent_access_controller_ts_isstring edges=2 relations=['references'] locations=['L11', 'L13'] contexts=['decorator']
  - apps_api_src_agent_access_controller_grantinput -> apps_api_src_agent_access_controller_ts_isuuid edges=2 relations=['references'] locations=['L17', 'L19'] contexts=['decorator']
  - apps_api_src_agent_access_service_spec -> apps_api_src_agent_access_service_spec_signedrequest edges=2 relations=['calls', 'contains'] locations=['L27', 'L53'] contexts=['', 'call']
note: normal graph.json is post-build; raw producer loss must be measured earlier.
The graph is navigational evidence, not a complete dependency or security certification.
