---
name: pnpm-typescript
description: pnpm workspace and TypeScript monorepo standards.
paths:
  - "package.json"
  - "pnpm-workspace.yaml"
  - "pnpm-lock.yaml"
  - "tsconfig*.json"
  - "apps/**/*.{ts,tsx,json}"
  - "packages/**/*.{ts,tsx,json}"
  - "src/**/*.{ts,tsx,json}"
  - "tests/**/*.{ts,tsx,json}"
  - ".github/workflows/**/*.{yml,yaml}"
---
# pnpm and TypeScript Monorepo Rules
## Workspace Shape
- Maintain `pnpm-workspace.yaml` as the source of truth for workspace membership with explicit `apps/*` and `packages/*` globs for this repository.
- Represent internal package dependencies with the `workspace:*`, `workspace:^`, or `workspace:~` protocol in every workspace `package.json`.
- Keep `pnpm-lock.yaml` updated in the same change set as every dependency edit in root or workspace `package.json` files.
- Use `pnpm --filter <package_selector> <command>` for package-scoped tasks and `pnpm -r <command>` for all-workspace tasks.
- Run CI installs with `pnpm ci` or `pnpm install --frozen-lockfile` from the repository root.
- Declare dependency lifecycle script policy in `pnpm-workspace.yaml` with `strictDepBuilds: true` plus explicit `onlyBuiltDependencies` and `ignoredBuiltDependencies` entries.
- Configure deployable apps with `pnpm deploy --filter=<app>` so Docker and release jobs include only the selected app and its production dependency graph.

## TypeScript Project Boundaries
- Keep a root `tsconfig.json` with `references` entries for each app and package that participates in the TypeScript build graph.
- Configure buildable shared packages with `composite: true` so TypeScript emits declarations and incremental `.tsbuildinfo` state for project references.
- Use `module: "ESNext"` and `moduleResolution: "Bundler"` for React, Vite, Tailwind, Lightweight Charts, and Recharts frontend packages.
- Use `module: "NodeNext"` and `moduleResolution: "NodeNext"` for Fastify, ws, undici, Drizzle, better-sqlite3, Pino, OpenAI SDK, Bottleneck, p-retry, and OpenTelemetry backend packages.
- Enable `verbatimModuleSyntax: true` in frontend and shared packages that are bundled by Vite.
- Keep app tsconfigs as consumers of shared packages through project references rather than cross-package relative imports.
- Export Zod schemas, inferred TypeScript types, and Decimal.js value helpers from shared workspace packages consumed by both API and UI workspaces.

## Scripts and Verification
- Provide `typecheck`, `build`, and `test` scripts in every workspace package that contains TypeScript source files.
- Make root `typecheck` execute the workspace graph with `pnpm -r typecheck` or a root `tsc --build` command.
- Make root `test` delegate to Vitest and Playwright workspace scripts through pnpm filters that match the package under test.
- Run API package checks with filters covering Fastify routes, WebSocket handlers, feed ingestion, database access, logging, telemetry, and OpenRouter clients.
- Run frontend package checks with filters covering React components, Vite entrypoints, Tailwind integration, and chart rendering packages.
- Treat generated artifacts such as `dist/`, `.tsbuildinfo`, coverage output, and Playwright reports as build products owned by scripts rather than source packages.
