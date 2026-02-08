# Infrastructure

This folder will host IaC, migration tooling, and DX scripts. Planned contents:

- `migrations/` – database schema managed via Prisma or TypeORM
- `seed/` – idempotent bootstrap data for departments, roles, workflows
- `ops/` – scripts for backup, audit export, Cloudflare tunnel helpers

Until the schema is finalized, migrations are pending. Use the in-memory store for local prototyping and add SQL later.
