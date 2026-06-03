---
name: react-vite-tailwind
description: React, Vite, and Tailwind UI implementation standards.
paths:
  - "apps/web/**/*.{ts,tsx}"
  - "packages/ui/**/*.{ts,tsx}"
  - "packages/shared/**/*.{ts,tsx}"
  - "src/**/*.{ts,tsx}"
  - "vite.config.ts"
---
# React Vite Tailwind UI Rules
## React Data Flow
- Put Fastify HTTP reads, WebSocket subscriptions, and public-feed UI adapters behind custom React hooks named `use*` within the web app or shared UI package.
- Return a cleanup function from every `useEffect` that starts a fetch, timer, WebSocket listener, chart subscription, or external imperative object.
- Guard every async state update in an Effect with an `ignore`, `AbortController`, or equivalent cancellation path before calling `setState`.
- Keep React render functions pure by deriving display values from props, state, memoized selectors, or shared Zod-parsed DTOs.
- Use `useMemo` or `useCallback` for chart options, data transforms, and handler props passed into memoized Lightweight Charts or Recharts components.

## Vite Boundaries
- Declare every browser-exposed env key in `vite-env.d.ts` through `ImportMetaEnv` and read it through `import.meta.env.VITE_*`.
- Keep OpenRouter keys, SQLite paths, and ingestion credentials on the Fastify backend; expose browser-safe URLs and feature flags through `VITE_*` values.
- Import bundled images, fonts, and SVG assets from source modules or construct URLs with `new URL(path, import.meta.url)`.
- Place browser-public, filename-stable assets in Vite `public/` and reference them from root-relative URLs.
- Configure Vite dev proxy entries for Fastify HTTP and WebSocket endpoints in `vite.config.ts` when local frontend code calls backend routes.

## Tailwind Interface System
- Express reusable component variants as static class maps with complete Tailwind class strings for each variant key.
- Compose responsive dashboard layouts with Tailwind breakpoint prefixes such as `sm:`, `md:`, `lg:`, and `xl:` on container, grid, and chart wrapper elements.
- Include `dark:` variants on dashboard surfaces, cards, tables, charts shells, and form controls that display agent telemetry or market data.
- Use Tailwind state variants such as `hover:`, `focus:`, `disabled:`, and `invalid:` for interactive controls and Zod-backed validation states.
- Route repeated colors, spacing, typography, and chart shell tokens through Tailwind theme tokens or shared component classes.

## Stack Integration
- Parse every HTTP and WebSocket payload at the UI boundary with shared Zod schemas before rendering data from Fastify, `ws`, or public-feed ingestion.
- Represent money, price, quantity, and P&L display inputs as Decimal-derived strings or typed DTO fields before passing values to React components.
- Keep Lightweight Charts and Recharts data adapters separate from presentational card, table, and control components.
- Log frontend recoverable API, WebSocket, and chart-adapter errors through a typed browser logger facade that mirrors backend Pino field names.
- Cover shared hooks, variant maps, API clients, and chart adapters with Vitest tests, and cover the live dashboard happy path with Playwright.
