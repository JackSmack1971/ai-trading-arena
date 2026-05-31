---
name: strategy-pack-permissions
description: Strategy manifest, permission, and signal-only runtime standards for simulator strategy packs.
globs:
  - "strategies/**/*.{ts,tsx,js,jsx,yaml,yml,json}"
  - "packages/strategies/**/*.{ts,tsx,js,jsx}"
  - "apps/worker/**/*.{ts,tsx,js,jsx}"
  - "tests/**/*.{ts,tsx,js,jsx}"
---
# Strategy Pack Permissions
## Scope
- Apply these rules to declarative strategy manifests, TypeScript strategy packs, loaders, registries, hot-load paths, and tests that admit user-authored strategy behavior into the simulator.
- Treat strategy packs as signal-generation plugins inside a paper-trading simulator, not as order-routing code.

## Manifest Contract
- Require every strategy pack to declare a stable `id`, `name`, `version`, `entry`, and `permissions` object before the pack can be registered.
- Validate manifest files through one shared Zod schema owned by the strategies package or another shared domain package before any loader reads strategy code.
- Reject manifests with missing permission fields, unknown permission keys, duplicate IDs, or non-deterministic entry resolution.
- Keep manifest IDs, exported strategy IDs, and test fixture IDs aligned so telemetry, replay, and dashboard reasoning can join on one strategy identity.

## Permission Boundary
- Keep `permissions.network` set to `false` for strategy packs in this repository.
- Keep `permissions.filesystem` set to `false` for strategy packs in this repository.
- Keep `permissions.can_emit_orders` set to `false` for strategy packs in this repository.
- Keep `permissions.can_emit_signals` set to `true` only for packs that are allowed to influence the simulator through typed strategy signals.
- Reject or quarantine any strategy pack that requests real network access, filesystem access, direct order emission, broker control, or secret access.

## Signal-Only Runtime
- Require strategies to emit typed strategy signals, diagnostics, or no-op results rather than paper orders, fills, cancels, risk overrides, or direct persistence writes.
- Convert strategy signals into trade intents only through deterministic policy, agent-decision, and risk-gate layers outside the strategy pack.
- Keep strategy runtime context limited to allowed market state, portfolio summaries, indicators, and shared helper modules; do not expose secrets, decrypted provider keys, or privileged infrastructure clients.
- Record strategy registration, validation failure, hot-reload, disablement, and emitted-signal events with stable strategy IDs so replay and forensics preserve the strategy boundary.

## Verification
- Add tests for valid manifests, invalid permission combinations, duplicate strategy IDs, and packs that try to emit orders instead of signals.
- Cover loader behavior for rejected manifests and disabled packs with deterministic fixtures rather than ad hoc filesystem state.
- Verify strategy telemetry and replay evidence preserve strategy IDs, version, manifest identity, and the signal-to-intent handoff boundary.
