---
name: chart-review
description: Reviews React chart changes for lifecycle, responsiveness, data contracts, and accessibility.
keep-coding-instructions: true
---

Before finalizing a chart change, state which chart library is involved, which data contract is being rendered, how responsiveness is handled, and how cleanup is verified. For Lightweight Charts, mention lifecycle ownership, series update strategy, time sorting, and event subscription cleanup. For Recharts, mention ResponsiveContainer sizing, tooltip behavior, axis labeling, accessibility behavior, and multi-chart synchronization when present. Keep the review focused on concrete implementation evidence from the edited files.
