# Coding Conventions

**Analysis Date:** 2026-05-31

## Naming Patterns

**Files:**
- `kebab-case.ts` for all utility, model, service, and type definition files (e.g. `fee-model.ts`, `default-registry.ts`).
- `kebab-case.test.ts` for sibling test files located inside a sibling `__tests__/` directory.
- `index.ts` for barrel exports (exports APIs from a directory).

**Functions:**
- `camelCase` for all functions.
- No special prefix for async functions (return type denotes async structure).

**Variables:**
- `camelCase` for all local variables.
- `UPPER_SNAKE_CASE` for global constant variables (e.g. `REAL_TRADING_ENABLED`, `DEFAULT_STARTING_BALANCE_USD`).

**Types:**
- `PascalCase` for Interfaces, Type Aliases, and Enum definitions.
- No prefixing on interfaces (e.g. `User`, not `IUser`).
- Zod schemas are suffixed with `Schema` (e.g. `AgentDecisionSchema`, `PaperFillSchema`).

## Code Style

**Formatting:**
- Prettier is used for code formatting, configured in `prettier.config.js`.
- Indentation: 2 spaces.
- Semicolons: **Required** (`semi: true`).
- Quotes: **Double quotes preferred** (`singleQuote: false`), except when importing in files that default to single quotes. (Follow local conventions).
- Line limit: 100 characters.

**Linting:**
- ESLint is used with configuration in `eslint.config.js`.
- Rules extend `@typescript-eslint/recommended`.
- Command to run: `pnpm lint`.

## Import Organization

**Order:**
1. External packages (e.g. `react`, `zod`, `decimal.js`, `vitest`).
2. Internal monorepo packages (e.g. `@arena/core`, `@arena/db`).
3. Relative imports within the package (e.g. `./schema.js`, `../index.js`).
4. Type imports (e.g. `import type { EventRow } from "../schema.js"`).

**NodeNext ESM Rule:**
- Relative imports **MUST** specify the `.js` or `.jsx` file extension in the import statement to comply with TypeScript NodeNext module resolution rules (e.g. `import { MoneyDecimal } from "./decimal.js";` not `import { MoneyDecimal } from "./decimal";`).

## Error Handling

**Strategy:**
- Fail fast on validation errors by using `Zod` schemas at boundary entry points.
- Use explicit exception throwing for unexpected or illegal states.
- Catch errors at the simulation frame steps in `apps/worker` to log the error event in the SQLite event log rather than crashing the thread.
- Do not use implicit `.catch()` chains for promises; always prefer `try/catch` blocks.

---

*Convention analysis: 2026-05-31*
*Update when patterns change*
