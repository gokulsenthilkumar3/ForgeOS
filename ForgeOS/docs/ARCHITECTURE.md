# Architecture

ForgeOS is organized around a workspace boundary. The web console and versioned `/v1` API are stateless. PostgreSQL owns durable workspace/project/module records, Redis carries jobs, and S3-compatible storage owns artifacts. Workers receive opaque secret references and fetch decrypted secrets only for the duration of an authorized job.

Every module writes runs, artifacts, notifications, and hash-chained audit events through the same contracts. Provider adapters isolate external credentials and APIs. The agent/worker tier is the only tier allowed to contact private databases or execute K6 jobs. OpenTelemetry traces are emitted by API, web, and worker services using `OTEL_*` configuration.
