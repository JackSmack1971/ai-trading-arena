# Testing Patterns

**Analysis Date:** 2026-05-31

## Test Framework

**Runner:**
- Vitest 1.6.0
- Config: `vitest.config.ts` in the workspace root

**Assertion Library:**
- Vitest built-in `expect`
- Matchers: `toBe`, `toEqual`, `toThrow`, `toContain`, `toHaveLength`

**Run Commands:**
```bash
pnpm test                         # Run all tests in the monorepo workspace
pnpm --filter @arena/core test    # Run tests for a specific package (e.g., core)
```

## Test File Organization

**Location:**
- Located in nested `__tests__/` directories directly adjacent to the target source code.
- No root-level global test folder; test logic is compartmentalized per package.

**Naming:**
- Sibling name matching: `module-name.test.ts` (e.g., `ledger.test.ts` testing `ledger.ts`).

**Structure:**
```
packages/core/src/
├── money/
│   ├── decimal.ts
│   └── (no test collocated here)
├── schemas/
│   └── common.ts
└── __tests__/
    └── domain.test.ts           # Combines Zod schemas & decimal tests
```

## Test Structure

**Suite Organization:**
```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("ModuleName", () => {
  describe("functionName", () => {
    beforeEach(() => {
      // Clean up side-effects or instantiate subjects
    });

    it("should process valid inputs correctly", () => {
      // Arrange
      const subject = createSubject();

      // Act
      const result = subject.execute();

      // Assert
      expect(result).toBe("expected-value");
    });
  });
});
```

**Conventions:**
- Explicit imports of testing functions (`describe`, `it`, `expect`, etc.) at the top of test files.
- `beforeEach` used for test isolation.
- Simple, descriptive test names stating expected input and outputs clearly.

## Mocking

**Framework:**
- Vitest `vi` helper functions.
- Module mocking via `vi.mock()` at the top level of the file.

**What to Mock:**
- Network APIs and LLM requests (OpenRouter).
- Market feed inputs (web sockets).
- Time (using `vi.useFakeTimers()` to ensure timestamps remain stable and reproducible in simulation tests).

**What NOT to Mock:**
- Pure financial math functions (`MoneyDecimal`, `Decimal`).
- Basic event definitions and schemas.
- In-memory ledgers.

## Fixtures and Factories

**Database / Event Fixtures:**
- Memory database creation helper (`createMemoryDb`) exported by `@arena/db` for test environment setup.
- Event sequence fixtures representing normal simulation states.

---

*Testing analysis: 2026-05-31*
*Update when test patterns change*
