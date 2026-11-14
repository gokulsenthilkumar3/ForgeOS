# StackForge: bold code, reproducible generation and accuracy

Current: deterministic Next.js/API/library scaffolds, optional CI/Docker and ZIP export. There is no app-building agent or isolated project-validation service. Preserve those working recipes while extending the product.

## Product contract and UI

Input: typed recipe (name, runtime/framework version, features, data/auth choices, package manager and deployment target). Output: source tree plus a manifest containing recipe version, template hashes, dependency policy, file hashes and generation timestamp. A saved prompt is not the recipe; convert intent into a visible recipe, show conflicts and require an explicit Generate action.

Workbench: left recipe and file explorer; main full-height code preview with path/breadcrumb, line numbers, copy and search; right validation summary and file count/bytes. Strong headings and dark source canvas follow DESIGN.md. Narrow layouts use Configuration / Files / Validation tabs. Downloads stay disabled only while actual ZIP work runs. Distinguish Generated locally, Validation pending, Build passed, Tests failed and Unsupported combination.

## Generation pipeline

1. Validate schema, names and supported combinations; never interpolate arbitrary uploaded strings into shell commands or file paths.
2. Resolve a versioned recipe graph. Prefer reviewed deterministic templates for known requirements. Produce a dry-run file manifest and reject collisions/traversal.
3. Generate pure files in memory or a bounded worker. Cache by normalized recipe + template + dependency policy; cap per-tenant cache and do not mix private context.
4. Package in a worker when archive size crosses a measured browser budget. Stream progress by files/bytes processed; support cancellation before publishing artifacts.
5. Optional isolated validation: install from a pinned lockfile using a reviewed registry/network policy, type-check, build, run meaningful tests and start a smoke server. Keep generated code away from platform secrets and production services.
6. Collect exit codes, logs, tests and preview evidence in an immutable report. Only that report may turn the badge into Validated. Preserve the unvalidated ZIP with its accurate status if the user chooses to download it.

## Agent-assisted generation later

Use a planner to map intent into the constrained recipe first. Retrieval uses approved templates and explicitly attached context with provenance and token budgets. A model can propose a patch, not silently replace working templates. Apply a patch only to the job workspace, revalidate the full project and bound attempts by wall time/tokens/cost. On failure show diagnostics and partial state; do not loop until a model says it succeeded.

## Accuracy definition

Separate syntax, buildability, functional requirement satisfaction, security policy and visual fidelity. Maintain fixture apps for every supported recipe and major option pair; exercise generated CLI commands from the exported README. Test auth flows, persistence, routing and accessibility as applicable. UI screenshot fixtures are not a substitute for functional tests. No universal accuracy percentage without a named dataset, denominator and environment.

## Performance plan

Record baseline browser generation/ZIP time, UI responsiveness, output bytes and peak memory for small/medium/large fixture projects. Proposed budgets: configuration-to-preview p95 <150ms for <=100 text files; no visible UI task >50ms; worker offload for >5MiB output; bounded 25MiB initial archive ceiling. These are engineering targets, not measured results. Cache reusable templates, debounce validation, lazy-load ZIP dependencies, avoid repeated generation per keystroke, and stream workers rather than building several full archive copies.

## Delivery gates

S1: code-first UI and existing templates with coverage and manifest tests. S2: recipe schema/compatibility matrix and reproducible ZIPs. S3: durable isolated validation jobs and live evidence. S4: bounded agent proposals with held-out requirement suites. S5: deployment adapters only after secret/network/rollback boundaries exist. Per slice record measured performance, fixture pass rate and unsupported combinations.
