---
description: Start a GSD debugging workflow for investigation, reproduction, fix, and regression verification.
argument-hint: "[bug-or-symptom]"
allowed-tools: [Read, Bash, Edit, Write]
---

Use this workflow when the task begins with an observed failure, suspected regression, or ambiguous defect.

1. State the symptom and collect evidence before editing.
2. Run `/rule-coverage` for the implicated paths and read the relevant rules.
3. Reproduce the failure with the narrowest available command or deterministic fixture.
4. Identify the root cause and make the smallest fix that preserves schema validation, risk gating, telemetry, and replayability.
5. Re-run the reproduction command plus any adjacent regression checks.
6. Report VERIFIED, INFERRED, and UNKNOWN claims separately with evidence paths.
