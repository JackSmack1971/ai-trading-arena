#!/usr/bin/env node

const fs = require("node:fs");

function readPayload() {
  try {
    const input = fs.readFileSync(0, "utf8").trim();
    return input ? JSON.parse(input) : {};
  } catch {
    return {};
  }
}

function flatten(value) {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(flatten).join("\n");
  }

  if (value && typeof value === "object") {
    return Object.values(value).map(flatten).join("\n");
  }

  return "";
}

const payload = readPayload();
const blob = flatten(payload);

if (/(^|[\\/])(\.claude|docs)[\\/]/i.test(blob) || /(claude\.md|agents\.md|settings\.json)/i.test(blob)) {
  console.error(
    "[ai-trading-arena hook] Claude surface changed. Re-run `node .claude/workflows/arena-audit.js` before closing the task."
  );
}
