---
name: data-visualization-charts
description: Lightweight Charts and Recharts visualization standards for trading and analytics views.
globs:
  - "apps/web/src/**/*.{ts,tsx}"
  - "packages/ui/src/**/*.{ts,tsx}"
  - "packages/shared/src/**/*.{ts,tsx}"
  - "packages/schemas/src/**/*.{ts,tsx}"
---
# Lightweight Charts and Recharts Visualization Rules
## Library Selection
- Scope Lightweight Charts to market time-series views that render OHLC, volume, equity-curve, tick, or candle data from Fastify/WebSocket feeds.
- Scope Recharts to dashboard aggregates, P&L summaries, agent comparisons, risk breakdowns, and telemetry panels sourced from Fastify HTTP responses.
- Place all chart data adapters in files named `*.chart-adapter.ts` and keep React chart components focused on rendering plus event wiring.
- Reuse Zod schemas from shared packages for every chart DTO and parse API or WebSocket messages before chart props receive data.

## Lightweight Charts
- Create each chart with `createChart(container, { autoSize: true, timeScale: { ... } })` inside one React effect per chart container.
- Add series with Lightweight Charts v5 ES module APIs: `chart.addSeries(CandlestickSeries|LineSeries|HistogramSeries, options)`.
- Load historical SQLite/Drizzle query results with exactly one `series.setData(sortedBars)` call after Zod parsing and ascending time sort.
- Apply live WebSocket ticks with `series.update(bar)` for the latest bar or the first bar after a new interval begins.
- Convert time-series bars to the Lightweight Charts `time` shape at the adapter boundary; use Unix seconds for intraday feed data and business-day strings for daily rollups.
- Render volume as a `HistogramSeries` with `priceFormat: { type: "volume" }` and its own `priceScaleId`/scale margins.
- Use `chart.applyOptions({ localization: { priceFormatter } })` or per-series `priceFormat` for currency, percent, P&L, and integer volume display.
- Store chart, series, and subscription handles in refs; call `unsubscribeCrosshairMove`, `unsubscribeClick`, and `chart.remove()` in effect cleanup.
- Keep crosshair and click handlers side-effect scoped to React state setters, Pino-safe telemetry emitters, or OpenTelemetry UI spans.
- Gate high-frequency feed rendering through a selector that batches updates to at most 1 animation-frame commit per chart.

## Recharts
- Wrap every Recharts chart in `<ResponsiveContainer width="100%" height={...}>` with a numeric height of at least `240`.
- Enable accessible chart semantics with Recharts v3 defaults and pass a `title` prop that names the metric and time window.
- Bind each visual primitive to explicit `dataKey` values from a typed chart row interface exported beside the adapter.
- Use `syncId` and `syncMethod="value"` for charts that compare the same timestamp or category across agent, risk, and portfolio panels.
- Use `ComposedChart` with `YAxis yAxisId` assignments when combining P&L, volume, exposure, and drawdown on separate scales.
- Implement custom `<Tooltip content={...} />` components for money/P&L values, using Decimal-derived formatted strings from the adapter.
- Keep SVG data arrays below 2,000 points per Recharts component; downsample or aggregate larger datasets before render.
- Use Recharts for historical aggregates and Lightweight Charts for streaming price series when both would satisfy the visual requirement.

## Data, Testing, and Observability
- Normalize Fastify HTTP chart responses and WebSocket chart events through shared Zod schemas before rendering.
- Convert Decimal.js values to display numbers or strings at the final chart adapter boundary and keep raw money math in shared domain modules.
- Cover chart adapters with Vitest table tests for empty data, unsorted input, duplicate timestamps, Decimal rounding, and invalid Zod payloads.
- Cover one representative Lightweight Charts component and one Recharts dashboard component with Playwright visual smoke tests at desktop and mobile widths.
- Record chart load, feed reconnect, render error, and adapter-parse-failure events with scoped Pino fields and OpenTelemetry span names prefixed `ui.chart.`.
