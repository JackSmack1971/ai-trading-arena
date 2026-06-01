#!/usr/bin/env node

import fs from "node:fs";

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

function block(message) {
  console.log(JSON.stringify({
    decision: "block",
    reason: `[ai-trading-arena hook] BLOCKED: ${message}`
  }));
  process.exit(2);
}

const payload = readPayload();
const toolName = String(payload.tool_name || payload.toolName || payload.name || "");
const blob = flatten(payload).toLowerCase();

const secretReadPattern =
  /\b(get-content|cat|type)\b[\s\S]{0,200}(^|[\s"'`=\\/])\.env(\.[a-z0-9._-]+)?\b/mi;
const remoteExecutionPattern =
  /(curl|invoke-webrequest|invoke-restmethod|wget)[\s\S]{0,200}(binance|coinbase|kraken|alpaca|bybit|okx)[\s\S]{0,120}(\/order|\/orders|\/account|\/accounts|\/wallet|\/transfer|\/withdraw)/i;
const walletCommandPattern =
  /\b(solana|ethers|cast|forge|wallet-cli)\b[\s\S]{0,120}\b(sign|send|transfer|broadcast)\b/i;
const destructivePowerShellPattern =
  /\b(remove-item|clear-content|set-content)\b[\s\S]{0,160}(-recurse|-force|-path|-literalpath)|\[system\.io\.(file|directory)\]::delete/i;
const destructiveGitCleanPattern = /\bgit clean\b[\s\S]{0,40}-fdx?\b/i;
const realTradingFlagPattern = /allow_real_trading\s*[:=]\s*(true|"true")/i;
const localStorageSecretPattern =
  /localstorage\.(setitem|getitem)[\s\S]{0,160}(openrouter|api[_-]?key|secret|token)/i;

if (toolName.toLowerCase().includes("bash") || blob.includes("command")) {
  if (secretReadPattern.test(blob)) {
    block("secret-reading shell command targets a .env file.");
  }

  if (remoteExecutionPattern.test(blob)) {
    block("shell command appears to target a private trading, account, wallet, or transfer endpoint.");
  }

  if (walletCommandPattern.test(blob)) {
    block("shell command appears to sign, send, or transfer on a wallet/tooling surface.");
  }

  if (destructivePowerShellPattern.test(blob) || destructiveGitCleanPattern.test(blob)) {
    block("shell command appears to be a destructive filesystem or worktree-cleaning operation.");
  }
}

if (toolName.toLowerCase().includes("edit") || toolName.toLowerCase().includes("write")) {
  if (realTradingFlagPattern.test(blob)) {
    block("edit attempts to enable real trading.");
  }

  if (localStorageSecretPattern.test(blob)) {
    block("edit attempts to store an API key, token, or secret in browser localStorage.");
  }
}

process.exit(0);
