---
name: zod-frontend-forms-query
description: Zod frontend form, query, and client-state validation standards.
paths:
  - "src/components/**/*.{ts,tsx}"
  - "src/features/**/*.{ts,tsx}"
  - "src/app/**/*.{ts,tsx}"
  - "app/**/*.{ts,tsx}"
  - "pages/**/*.{ts,tsx}"
  - "packages/ui/**/*.{ts,tsx}"
---
# Zod Frontend Forms and Queries
## Form Validation
- Connect every React Hook Form form that has validation requirements through `zodResolver(schema)`.
- Type transformed forms as `useForm<z.input<typeof Schema>, Context, z.output<typeof Schema>>()` when schema input and output differ.
- Keep form field names aligned with schema keys so React Hook Form errors map directly to Zod issue paths.
- Use schema-level messages for required fields, string formats, numeric ranges, and enum selections displayed to users.
- Submit `handleSubmit` values as parsed schema output rather than reading raw DOM or component state values.
- Normalize number, date, checkbox, and select inputs through React Hook Form registration options or Zod transforms in one place per field.

## Client Data Boundaries
- Parse `fetch().json()` responses with the matching Zod response schema before writing values into component state or query caches.
- Parse `URLSearchParams`, route params, and server-component props with route-specific schemas before using them in queries or render branches.
- Share form schemas from `packages/schemas` when the same contract is accepted by a tRPC procedure or API route.
- Derive client display types from `z.output<typeof Schema>` for transformed values used in UI rendering.
- Derive client draft types from `z.input<typeof Schema>` for unfinished form state and pre-submit values.
- Render validation messages from structured Zod issues or resolver errors with field-level path information.
