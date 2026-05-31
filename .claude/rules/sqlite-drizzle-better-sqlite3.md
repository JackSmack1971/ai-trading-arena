---
name: sqlite-drizzle-better-sqlite3
description: SQLite, Drizzle, and better-sqlite3 persistence standards.
globs:
  - "src/db/**/*.{ts,tsx}"
  - "src/database/**/*.{ts,tsx}"
  - "src/**/*.repository.ts"
  - "src/**/*.schema.ts"
  - "drizzle/**/*"
  - "drizzle.config.*"
---
# SQLite Drizzle better-sqlite3 Rules
## Fit Map
- For small-to-medium Node backends, select SQLite with Drizzle and better-sqlite3 when one process owns a local database file and backup/restore can complete inside the product recovery objective.
- For high concurrent write workloads, enable WAL at connection startup and route writes through one process-local write path before planning Postgres, Turso, or libSQL migration.
- For distributed production, multi-region writes, or file-system durability gaps, select Postgres, Turso, or libSQL during architecture planning before database adapters are implemented.
- For browser, edge, and WASM-only runtime targets, select sql.js or libSQL adapters because better-sqlite3 is a Node SQLite driver.
- For write contention indicated by `SQLITE_BUSY` or `SQLITE_LOCKED`, record database path, statement category, and transaction duration in the structured application logger before database selection is revisited.

## Connection and PRAGMAs
- In `src/db/client.ts`, initialize Drizzle from `drizzle-orm/better-sqlite3` using `process.env.DB_FILE_NAME` or `{ connection: { source: process.env.DB_FILE_NAME } }`.
- In the same connection module, apply `db.pragma('journal_mode = WAL')` at startup for web backends.
- In the same startup path, set `PRAGMA wal_autocheckpoint = 1000` and expose a maintenance command that runs `PRAGMA wal_checkpoint(TRUNCATE)`.
- In dev/test connection options, pass `verbose` to better-sqlite3 so SQL statements can be correlated with request or test logs.
- Use `readonly` and `fileMustExist` better-sqlite3 options for read-only scripts, export jobs, and maintenance commands that inspect existing databases.

## Schema and Migrations
- Define SQLite schemas with `sqliteTable` from `drizzle-orm/sqlite-core` and Drizzle column builders such as `text`, `integer`, and `sql` defaults.
- Store schemas in `src/db/schema.ts` or `src/db/schema/*.ts` and make repository modules import tables from that source of truth.
- Generate migrations with `drizzle-kit generate` after schema changes and commit each generated `migration.sql` with its companion `snapshot.json` under `drizzle/`.
- For SQLite maintenance scripts that temporarily suspend foreign key checks, place `PRAGMA foreign_keys = OFF;` and `PRAGMA foreign_keys = ON;` in the same migration or seed file with a named comment explaining the table operation.

## Queries and Transactions
- Use Drizzle query builder, relational query API, or `db.execute` for SQL owned by application code; use better-sqlite3 `db.prepare()` only in low-level adapter modules.
- Bind external values through Drizzle parameters or better-sqlite3 `Statement.run(...bindParameters)` instead of string interpolation.
- Wrap multi-statement writes in Drizzle transactions or better-sqlite3 `db.transaction()` functions so thrown errors rollback the group atomically.
- Keep write transactions scoped to one repository method or one request command and return the affected row count or inserted ID from the transaction boundary.
- Use prepared statements for repeated inserts, updates, deletes, and hot read paths; keep statement construction outside per-row loops.

## Backups and Safety
- Implement a backup command that calls `db.backup('backup-${Date.now()}.db')` or equivalent SQLite backup flow while the database can stay online.
- Record backup completion, failure, total pages, and remaining pages when using the better-sqlite3 progress callback.
- Run the backup command before schema migrations in production-like environments and store the resulting file in the configured backup location.
- Model schema-changing migration steps as explicit SQL files generated and reviewed through Drizzle Kit; verify the generated SQL before applying to shared databases.
