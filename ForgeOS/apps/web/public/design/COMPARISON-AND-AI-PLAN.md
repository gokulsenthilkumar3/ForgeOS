# Typed comparison, project context and monitoring plan

## Connector taxonomy and accessibility test

Database engines: PostgreSQL, MySQL/MariaDB, SQLite, SQL Server, MongoDB and Redis. Hosting: Amazon RDS/Aurora, Azure database services, GCP Cloud SQL/AlloyDB and other deployments. AWS/GCP are cloud platforms; Azure Functions is compute, not a database engine. Select engine and hosting/network separately. SQLite is a bounded database file or an explicitly deployed connector, not a remote username/password endpoint.

Connection form: engine, endpoint/port or uploaded file, database, TLS mode/CA, authentication method and secret reference, read-only scope, network/runner choice, timeout and sample/row/byte limits. Display masked credentials and non-secret connection metadata; never expose stored passwords to prove accessibility. Test stages are DNS/network -> TLS -> authentication -> permitted read -> schema discovery. Return separate status/timing without logging secrets. Deny writes/DDL and do not use a test transaction that modifies production data.

Default public connectors validate resolved IPs per connection/redirect. Private DB access requires an explicitly installed, workspace-bound private connector with brokered credentials, destination allowlists and no general-purpose tunnel. Mongo collection discovery, Redis SCAN/type inspection and SQL catalog access have engine-specific least-privilege profiles. No Redis KEYS sweep or unbounded production-table scan.

## Comparison protocol

Create a versioned comparison spec: source identities, schemas, selected fields, join/key mapping, filters, normalization (null/timezone/collation/numeric tolerance), exact/sample mode, consistency/snapshot strategy, limits and engine version. Preview counts and estimated work first. For SQL use quoted identifiers from discovered metadata, parameterized filters and allowlisted query shapes. Arbitrary SQL is a separately privileged future mode.

For keyed tables, stream sorted key ranges or bounded chunks; compare schema, row presence and typed cells, not just JSON serialization. Chunk hashes can prune identical ranges only when canonicalization and snapshot consistency are defined. Report duplicate keys, moving data, missing permissions, truncated partitions and estimates as incomplete/inconclusive rather than equal. Mongo projects documents with explicit field paths; Redis compares typed key/value/TTL projections under a bounded scan. Cross-engine types need user-visible mapping; binary/decimal/date values cannot be silently coerced.

UI: source A/B explorer; connection-test stages; table/collection/keyspace selection; mapping preview; progress based on real partitions; schema changes, added/removed/modified rows; virtualized cell grid; numeric distributions and mismatch breakdown; drilldown to evidence and export. A chart never substitutes for the underlying records. Include sample denominator, snapshot timestamps and unsupported types.

## Files, email and ZIP

Adapters: text/SQL text/JSON now; CSV/TSV next; then email EML and licensed MSG parsing, images, PDF/document text/layout and Office spreadsheets. Email comparison exposes headers, recipients, subject, canonical body and attachments; raw MIME and normalized views remain available. Do not render active HTML email or automatically fetch remote images.

ZIP comparison is a bounded archive manifest before extraction: relative normalized path, compressed/uncompressed bytes, type, hash and status. Controls include min/max input size and per-entry filters. Enforce archive bytes, total expanded bytes, entry count, per-entry size, compression ratio, nesting depth and parser deadlines. Reject traversal, absolute paths, symlinks/devices, encrypted archives without a user-supplied password and unsupported members. Never execute an archive. Nested comparisons reuse adapter limits. Show size filters as excluded/not compared, not equal. Suggested starting limits (to validate): 25MiB/archive, 1000 entries, 100MiB expanded, 20MiB/member, 100:1 ratio and depth 1.

## PromptVault and ProbeAI

Attachment flow: user selects files -> hash/type/size check -> isolated extraction for DOCX/Office/PDF -> text with source path/page/line references -> user reviews selected context -> prompt version. Support Markdown/AGENTS/JSON/text first; DOCX text later. Embedded macros, URLs and instructions are untrusted and never automatically executed or fetched. Prompt builder exposes which sources were included/excluded and why, token estimate, exact model request preview and retention.

Optimization uses candidate prompts plus a fixed held-out evaluation set. Track task accuracy, unsupported factual claims, edit acceptance, latency, token/cost budget, scorer version and variability. Do not treat a shorter prompt as automatically better. Search is bounded by explicit attempts/time/token/cost, with cancellation. ProbeAI owns evaluations; PromptVault owns immutable versions and explicit promotion/rollback. Cache deterministic parsing/retrieval; keep tenant data partitioned and do not reuse private model answers across users.

## PulseWatch, Load Lab and audit

Probe types are distinct: HTTP API (contract/status/latency), browser UI (load readiness, journey assertions, console/network errors and screenshot/trace), and DB (read-only connectivity/query health). A smoke test can link all three through one run ID but retains independent failure reasons. UI loading tracks navigation/resource timing and a user-defined readiness condition; console noise is classified and redacted. Capture uses isolated workers and an authorized target policy.

Load Lab is controlled generated/executed traffic testing; PulseWatch is scheduled monitoring; ProbeAI is model evaluation. Avoid duplicating engines by sharing worker/job/report contracts. Separate workspace audit actions, job execution logs, probe evidence and future session/device histories. Include actor, workspace, target, decision, timestamps, policy version, correlation ID and redacted outcomes. Do not record tokens/passwords, full cookies or unrestricted query results in logs.

## Delivery gates

1. Capability registry and spec schema, local adapters and bounded ZIP manifests.
2. Secret broker and tested Postgres/MySQL/SQLite read-only adapters.
3. SQL Server/Mongo/Redis projections and exact/sample visualization with cross-engine fixtures.
4. Attachment extraction/provenance and held-out prompt optimization.
5. Browser/API/DB monitoring workers with reproducible evidence and scoped artifacts.

Each gate needs tenant/permission denial, malicious-format/limit fixtures, cancellation/cleanup, reproducibility and actual measured memory/latency. None is delivered simply by adding provider names to a selector.
