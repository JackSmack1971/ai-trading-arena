# Test Strategy

A test strategy for verification

## Signal logic

Describe your signal logic here.

## Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| —         | —       | Add your parameters |

## Permissions

This strategy runs in signal-only mode:
- `network: false` — no outbound HTTP
- `filesystem: false` — no file access
- `can_emit_orders: false` — signals only; agents convert signals to trade intents
- `can_emit_signals: true`
