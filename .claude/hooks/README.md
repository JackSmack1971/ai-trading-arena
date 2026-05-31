# Hooks

This directory contains project-local Claude Code hook scripts for hard runtime guardrails.

- `pre-tool-use.js` blocks high-risk shell commands and insecure edits before they execute.
- `post-tool-use.js` emits a verification reminder after Claude-surface edits.

Design constraints:

- Keep synchronous checks fast and deterministic.
- Use Node-based scripts so the hooks stay cross-platform on Windows, macOS, and Linux.
- Treat hook failures as framework defects because rules alone are advisory.
