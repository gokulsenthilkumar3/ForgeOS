# DB Pulse: connected database comparison

DB Pulse compares selected base tables from two external databases. It does not query ForgeOS audit events or select the ForgeOS application database. Application membership is checked only to authorize the connector request. Workspace history remains at `/activity`.

## Delivered workflow

1. Enter independent source and target connections. PostgreSQL and MySQL/MariaDB are implemented adapters; the engines can differ.
2. Test authentication and metadata reads in a read-only transaction. Choose base tables from the live catalog, then discover columns.
3. Map up to 12 supported scalar columns, explicitly choose normalization, and select a unique non-null key or composite key. Matching names and primary keys are suggestions from discovered metadata, never fixture data.
4. Read up to the user-selected limit, at most 200 rows on each side. Compare keyed row presence and selected cell values. Inspect schema types, timestamps, distributions and individual before/after cells.
5. Download a JSON result only by explicit action. The export contains selected data and must be handled according to the database's access policy. Only allowlisted numeric result summary metadata is retained in this browser tab for /dashboards/dbpulse; source rows, endpoints and credentials are excluded.

There are no prefilled hosts, usernames, passwords, databases, tables or business metrics. Engine choices and resource ceilings are capability/configuration definitions, not simulated connection results.

## Connection boundary

- New endpoints are under `/api/v1/dbpulse`: POST `connections`, POST `columns`, POST `compare`, DELETE `connections/:id`. Every call requires an authenticated owner, administrator or member of a workspace with DB Pulse enabled.
- Connection handles are random references bound to the user and workspace. Credentials live only in connector memory for ten minutes, are never returned, logged, stored in localStorage or written into module records, and are removed on explicit disconnect, expiry or API restart.
- Public IPv4 endpoints require TLS with certificate verification. Custom PEM CA certificates are supported. IPv6 is currently unsupported.
- Private IPv4 hosts require exact operator-controlled entries in `FORGEOS_DBPULSE_PRIVATE_HOSTS`, passed to the API service. This is deployment configuration, not an application input that members can expand. Restart the API after changing the setting. Unencrypted transport is permitted only for those explicitly allowed private endpoints.
- Loopback, link-local/metadata, shared/reserved address ranges and known ForgeOS infrastructure are rejected. Aliases resolving to the application database are rejected even when allowlisted. DNS is resolved and validated per operation; the actual TCP connection uses the validated IPv4 address while TLS verifies the entered hostname.
- Fixed query shapes, parameterized catalog filters and quoted discovered identifiers are used. There is no arbitrary SQL field, DML, DDL, stored procedure execution or database modification workflow.
- Use independently provisioned read-only database accounts. Connector transactions are read-only too. The implementation follows the [PostgreSQL transaction modes](https://www.postgresql.org/docs/current/sql-set-transaction.html), [MySQL read-only transaction controls](https://dev.mysql.com/doc/refman/8.4/en/commit.html), [node-postgres TLS configuration](https://node-postgres.com/features/ssl), and [MySQL2 verified TLS configuration](https://sidorares.github.io/node-mysql2/docs/documentation/ssl).

## Comparison semantics and limits

- Strict scalar mode preserves returned scalar text and type families. Exact text, lossless finite decimal normalization and explicit boolean normalization are separate modes. NULL differs from an empty string. Binary, spatial and user-defined types are rejected; temporal values are not silently timezone-normalized.
- Duplicate or null row keys stop the comparison. They are not guessed, discarded or overwritten.
- Rows are fetched in selected-key order, with one extra row to detect truncation. If either side is truncated, the verdict is inconclusive even if the fetched rows match. Native ordering/collation may differ across engines, so row presence in partial windows is not whole-table presence.
- Each side has its own repeatable-read, read-only transaction. These snapshots are not atomic across servers. Equality applies only to selected data and mapped columns, not entire databases or unseen schema objects.
- Limits: 200 discovered tables per connection, 256 columns per table, 12 mappings, 200 rows per side, 2,048 characters per selected cell, 1 MiB source window, 3 MiB result, two concurrent connector operations per API process, four temporary connections per user/workspace, eight-second connection timeout, five/six-second server/client query budgets and a fifteen-second overall operation deadline.
- Metadata/large-table query work can still depend on source indexes and permissions. Use an indexed unique key. A bounded result limit does not guarantee a cheap server-side scan.

## Validation and remaining work

`apps/api/src/dbpulse.spec.ts` exercises precision, key ambiguity, NULL handling, truncation, network policy and authorization. `tests/dbpulse` contains separate disposable PostgreSQL/MySQL fixtures, never application data. `scripts/dbpulse-integration.cjs` checks the real adapters and read-only roles. Fixture credentials are generated at runtime and are not UI defaults. Fixtures have no published host ports.

Future work: independently isolated connector workers, operator-managed private connector deployments, full-database table selection/traversal, resumable exact comparison of large tables, cross-server consistency coordination, SQLite/SQL Server/MongoDB/Redis adapters and additional normalization policies. Do not advertise these as current capabilities.
