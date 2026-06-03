---
description: Run the closed-loop verification pipeline (structural audit, typecheck, lint, and test).
argument-hint: ""
allowed-tools: [Read, Bash]
---

Run the closed-loop verification pipeline to guarantee workspace correctness before submitting edits.

1. Run the structural framework audit: `node .claude/workflows/arena-audit.js`.
2. Run TypeScript compiler checks: `pnpm typecheck`.
3. Run the ESLint suite: `pnpm lint`.
4. Run the Vitest test suites: `pnpm test`.
5. Every verification gate must pass cleanly with zero errors.
6. If any verification gate fails:
   - Analyze the diagnostic logs and error messages.
   - Fix the syntax, compiler, lint, or test failures.
   - Rerun the verification pipeline.
   - If a failure repeats twice and cannot be resolved, revert the offending changes using git and escalate to the user.
