---
name: ui-data-visualization
description: React dashboard, charting, and analytics UI standards.
paths:
  - "apps/web/**/*.{ts,tsx}"
  - "packages/ui/**/*.{ts,tsx}"
  - "src/components/**/*.{ts,tsx}"
  - "src/app/**/*.{ts,tsx}"
  - "src/pages/**/*.{ts,tsx}"
---
# React Dashboard and Charting
## Data Contracts
- [scope: frontend] Import chart, agent, trade, metric, and WebSocket event types from shared Zod-derived packages.
- [scope: frontend] Parse WebSocket messages with shared Zod schemas before updating React state, Lightweight Charts series, or Recharts datasets.
- [tool: Decimal.js] Convert money, P&L, price, and percentage values from serialized strings into Decimal for calculations, then format strings for display.
- [scope: frontend] Keep chart adapters separate from transport adapters so Lightweight Charts and Recharts receive normalized view models.

## Components
- [tool: React] Build dashboard panels as typed components with explicit props for loading, empty, error, live, and replay states.
- [tool: Vite] Keep environment reads in a typed config module and pass public values through `import.meta.env` wrappers.
- [tool: Tailwind] Use semantic component wrappers and shared class utilities for dashboard cards, status badges, metric rows, and responsive chart layouts.
- [tool: Lightweight Charts] Use it for time-series market, equity, price, and candle-like visualizations driven by timestamped data.
- [tool: Recharts] Use it for aggregate metrics, comparisons, distributions, and dashboard summary charts.

## Real-Time UX
- [scope: frontend] Represent WebSocket connection status with explicit states for connecting, open, degraded, reconnecting, closed, and failed.
- [scope: frontend] Buffer incoming live events into typed state transitions before rendering charts or tables.
- [tool: Playwright] Cover critical dashboard flows that connect to mocked WebSocket streams and verify visible chart or metric state.
