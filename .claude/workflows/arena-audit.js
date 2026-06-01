import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REQUIRED_FILES = [
  "CLAUDE.md",
  "AGENTS.md",
  ".gitignore",
  "README.md",
  "docs/AI_TRADING_ARENA_BLUEPRINT.md",
  "docs/PRACTICAL_LIBRARY_MAP.md",
  "docs/FRAMEWORK_TRACEABILITY.md",
  ".claude/README.md",
  ".claude/claude-security-guidance.md",
  ".claude/commands/README.md",
  ".claude/skills/README.md",
  ".claude/agents/README.md",
  ".claude/hooks/README.md",
  ".claude/hooks/pre-tool-use.js",
  ".claude/hooks/post-tool-use.js",
  ".claude/security-patterns.json",
  ".claude/worktrees/.gitignore",
  ".claude/output-styles/README.md",
  ".claude/workflows/README.md",
  ".claude/rules/rule-catalog.md",
  ".claude/settings.json",
  ".claude/security-rules.md"
];

const REQUIRED_DIRS = [
  ".claude/rules",
  ".claude/commands",
  ".claude/skills",
  ".claude/agents",
  ".claude/hooks",
  ".claude/worktrees",
  ".claude/workflows",
  ".claude/output-styles"
];

const MIN_COUNTS = {
  rules: 10,
  commands: 3,
  skills: 3,
  agents: 2,
  hooks: 2,
  workflows: 1,
  outputStyles: 2
};

const REQUIRED_HOOK_COMMANDS = {
  PreToolUse: ["node .claude/hooks/pre-tool-use.js"],
  PostToolUse: ["node .claude/hooks/post-tool-use.js"]
};

const REQUIRED_DENY_PATTERNS = [
  "Bash(git push --force:*)",
  "Bash(git reset --hard:*)",
  "Bash(git clean -fd:*)",
  "Bash(git clean -fdx:*)",
  "Bash(rm -rf:*)",
  "Bash(del /f /s /q:*)",
  "Bash(Remove-Item:*)",
  "Bash(Clear-Content:*)",
  "Bash(Set-Content:*)",
  "Bash([System.IO.File]::Delete:*)",
  "Bash([System.IO.Directory]::Delete:*)",
  "Bash(dropdb:*)"
];

async function exists(target) {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

function isSupportDoc(name) {
  return name.toLowerCase() === "readme.md";
}

async function countEntries(target, extension) {
  try {
    const entries = await readdir(target, { withFileTypes: true });
    return entries.filter(
      (entry) => entry.isFile() && entry.name.endsWith(extension) && !isSupportDoc(entry.name)
    ).length;
  } catch {
    return 0;
  }
}

async function countSkillEntries(target) {
  try {
    const entries = await readdir(target, { withFileTypes: true });
    let count = 0;
    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }

      const skillPath = path.join(target, entry.name, "SKILL.md");
      if (await exists(skillPath)) {
        count += 1;
      }
    }
    return count;
  } catch {
    return 0;
  }
}

async function readJson(target) {
  try {
    const raw = await readFile(target, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

async function hasOutputStyleFrontmatter(target) {
  try {
    const raw = await readFile(target, "utf8");
    return /^---\r?\n(?:.*\r?\n)*?name:\s*.+\r?\ndescription:\s*.+\r?\n(?:.*\r?\n)*?---/m.test(raw);
  } catch {
    return false;
  }
}

async function hasCommandFrontmatter(target) {
  try {
    const raw = await readFile(target, "utf8");
    return /^---\r?\n(?:.*\r?\n)*?description:\s*.+\r?\n(?:.*\r?\n)*?---/m.test(raw);
  } catch {
    return false;
  }
}

async function hasAgentFrontmatter(target) {
  try {
    const raw = await readFile(target, "utf8");
    return /^---\r?\n(?:.*\r?\n)*?name:\s*.+\r?\ndescription:\s*.+\r?\n(?:.*\r?\n)*?tools:\s*\[.+\]\r?\n(?:.*\r?\n)*?model:\s*.+\r?\n(?:.*\r?\n)*?---/m.test(
      raw
    );
  } catch {
    return false;
  }
}

async function hasSkillFrontmatter(target) {
  try {
    const raw = await readFile(target, "utf8");
    return /^---\r?\n(?:.*\r?\n)*?name:\s*.+\r?\ndescription:\s*.+\r?\n(?:.*\r?\n)*?---/m.test(raw);
  } catch {
    return false;
  }
}

async function hasRuleFrontmatter(target) {
  try {
    const raw = await readFile(target, "utf8");
    const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!match) {
      return false;
    }

    const frontmatter = match[1];
    const hasName = /^name:\s*.+$/m.test(frontmatter);
    const hasDescription = /^description:\s*.+$/m.test(frontmatter);
    const hasScopes = /^globs:\s*(?:\[[\s\S]*?\]|\r?\n(?:\s*-\s*.+\r?\n?)*)/m.test(frontmatter);

    return hasName && hasDescription && hasScopes;
  } catch {
    return false;
  }
}

async function readFrontmatterName(target) {
  try {
    const raw = await readFile(target, "utf8");
    const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!match) {
      return null;
    }

    const nameMatch = match[1].match(/^name:\s*(.+)$/m);
    return nameMatch ? nameMatch[1].trim() : null;
  } catch {
    return null;
  }
}

async function fileContains(target, expected) {
  try {
    const raw = await readFile(target, "utf8");
    return raw.includes(expected);
  } catch {
    return false;
  }
}

function isTraceabilityPathReference(value) {
  return /^(?:\.claude\/|docs\/|AGENTS\.md$|CLAUDE(?:\.local)?\.md$|README\.md$)/.test(value);
}

async function readTraceabilityReferences(target) {
  try {
    const raw = await readFile(target, "utf8");
    return [...raw.matchAll(/`([^`\r\n]+)`/g)]
      .map((match) => match[1].trim())
      .filter((value) => isTraceabilityPathReference(value));
  } catch {
    return [];
  }
}

function hasKebabCaseViolation(name) {
  return /\s/.test(name) || /[A-Z]/.test(name);
}

async function findNameViolations(target) {
  try {
    const entries = await readdir(target, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .filter(hasKebabCaseViolation);
  } catch {
    return [];
  }
}

async function run(context = {}) {
  const repoRoot = context.repoRoot || process.cwd();
  const findings = [];

  for (const relativePath of REQUIRED_FILES) {
    const fullPath = path.join(repoRoot, relativePath);
    if (!(await exists(fullPath))) {
      findings.push({
        severity: "high",
        kind: "missing-file",
        path: relativePath,
        message: `Required framework file is missing: ${relativePath}`
      });
    }
  }

  for (const relativePath of REQUIRED_DIRS) {
    const fullPath = path.join(repoRoot, relativePath);
    if (!(await exists(fullPath))) {
      findings.push({
        severity: "high",
        kind: "missing-directory",
        path: relativePath,
        message: `Required framework directory is missing: ${relativePath}`
      });
    }
  }

  const counts = {
    rules: await countEntries(path.join(repoRoot, ".claude/rules"), ".md"),
    commands: await countEntries(path.join(repoRoot, ".claude/commands"), ".md"),
    skills: await countSkillEntries(path.join(repoRoot, ".claude/skills")),
    agents: await countEntries(path.join(repoRoot, ".claude/agents"), ".md"),
    hooks: await countEntries(path.join(repoRoot, ".claude/hooks"), ".js"),
    workflows: await countEntries(path.join(repoRoot, ".claude/workflows"), ".js"),
    outputStyles: await countEntries(path.join(repoRoot, ".claude/output-styles"), ".md")
  };

  const legacyRulesCount = await countEntries(path.join(repoRoot, "rules"), ".md");
  if (legacyRulesCount > 0) {
    findings.push({
      severity: "medium",
      kind: "legacy-surface",
      path: "rules/",
      message: `Expected Claude-native rules under .claude/rules only, found ${legacyRulesCount} markdown files under legacy rules/.`
    });
  }

  for (const [kind, minimum] of Object.entries(MIN_COUNTS)) {
    if (counts[kind] < minimum) {
      findings.push({
        severity: "medium",
        kind: "thin-surface",
        path: `.claude/${kind}`,
        message: `Expected at least ${minimum} ${kind} artifacts, found ${counts[kind]}`
      });
    }
  }

  const ruleViolations = await findNameViolations(path.join(repoRoot, ".claude/rules"));
  for (const name of ruleViolations) {
    findings.push({
      severity: "medium",
      kind: "naming",
      path: `.claude/rules/${name}`,
      message: "Rule filenames must stay kebab-case ASCII with no spaces."
    });
  }

  try {
    const rulesDir = path.join(repoRoot, ".claude/rules");
    const ruleEntries = await readdir(rulesDir, { withFileTypes: true });
    for (const entry of ruleEntries) {
      if (!entry.isFile() || !entry.name.endsWith(".md") || isSupportDoc(entry.name)) {
        continue;
      }

      const rulePath = path.join(rulesDir, entry.name);
      if (!(await hasRuleFrontmatter(rulePath))) {
        findings.push({
          severity: "high",
          kind: "rule-frontmatter",
          path: `.claude/rules/${entry.name}`,
          message: "Rule files must use frontmatter with at least name, description, and scoped globs."
        });
        continue;
      }

      const ruleName = await readFrontmatterName(rulePath);
      const expectedName = path.parse(entry.name).name;
      if (ruleName !== expectedName) {
        findings.push({
          severity: "high",
          kind: "rule-identity",
          path: `.claude/rules/${entry.name}`,
          message: `Rule frontmatter name must match the filename stem \`${expectedName}\`.`
        });
      }
    }
  } catch {
    // Required directory checks already report missing rule surfaces.
  }

  try {
    const commandDir = path.join(repoRoot, ".claude/commands");
    const commandEntries = await readdir(commandDir, { withFileTypes: true });
    for (const entry of commandEntries) {
      if (!entry.isFile() || !entry.name.endsWith(".md") || isSupportDoc(entry.name)) {
        continue;
      }

      const commandPath = path.join(commandDir, entry.name);
      if (!(await hasCommandFrontmatter(commandPath))) {
        findings.push({
          severity: "high",
          kind: "command-frontmatter",
          path: `.claude/commands/${entry.name}`,
          message: "Command files must use frontmatter with at least a description field."
        });
      }
    }
  } catch {
    // Required directory checks already report missing command surfaces.
  }

  try {
    const agentDir = path.join(repoRoot, ".claude/agents");
    const agentEntries = await readdir(agentDir, { withFileTypes: true });
    for (const entry of agentEntries) {
      if (!entry.isFile() || !entry.name.endsWith(".md") || isSupportDoc(entry.name)) {
        continue;
      }

      const agentPath = path.join(agentDir, entry.name);
      if (!(await hasAgentFrontmatter(agentPath))) {
        findings.push({
          severity: "high",
          kind: "agent-frontmatter",
          path: `.claude/agents/${entry.name}`,
          message: "Agent files must use frontmatter with at least name, description, tools, and model."
        });
        continue;
      }

      const agentName = await readFrontmatterName(agentPath);
      const expectedName = path.parse(entry.name).name;
      if (agentName !== expectedName) {
        findings.push({
          severity: "high",
          kind: "agent-identity",
          path: `.claude/agents/${entry.name}`,
          message: `Agent frontmatter name must match the filename stem \`${expectedName}\`.`
        });
      }
    }
  } catch {
    // Required directory checks already report missing agent surfaces.
  }

  try {
    const outputStyleDir = path.join(repoRoot, ".claude/output-styles");
    const entries = await readdir(outputStyleDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(".md") || isSupportDoc(entry.name)) {
        continue;
      }

      const stylePath = path.join(outputStyleDir, entry.name);
      if (!(await hasOutputStyleFrontmatter(stylePath))) {
        findings.push({
          severity: "high",
          kind: "output-style-frontmatter",
          path: `.claude/output-styles/${entry.name}`,
          message: "Output styles must use YAML frontmatter with at least name and description."
        });
        continue;
      }

      const styleName = await readFrontmatterName(stylePath);
      const expectedName = path.parse(entry.name).name;
      if (styleName !== expectedName) {
        findings.push({
          severity: "high",
          kind: "output-style-identity",
          path: `.claude/output-styles/${entry.name}`,
          message: `Output style frontmatter name must match the filename stem \`${expectedName}\`.`
        });
      }
    }
  } catch {
    // Required directory checks already report missing output-style surfaces.
  }

  try {
    const skillsDir = path.join(repoRoot, ".claude/skills");
    const skillEntries = await readdir(skillsDir, { withFileTypes: true });
    for (const entry of skillEntries) {
      if (!entry.isDirectory()) {
        continue;
      }

      const skillPath = path.join(skillsDir, entry.name, "SKILL.md");
      if (!(await exists(skillPath))) {
        continue;
      }

      if (!(await hasSkillFrontmatter(skillPath))) {
        findings.push({
          severity: "high",
          kind: "skill-frontmatter",
          path: `.claude/skills/${entry.name}/SKILL.md`,
          message: "Skill files must use frontmatter with at least name and description."
        });
        continue;
      }

      const skillName = await readFrontmatterName(skillPath);
      if (skillName !== entry.name) {
        findings.push({
          severity: "high",
          kind: "skill-identity",
          path: `.claude/skills/${entry.name}/SKILL.md`,
          message: `Skill frontmatter name must match the owning directory name \`${entry.name}\`.`
        });
      }
    }
  } catch {
    // Required directory checks already report missing skill surfaces.
  }

  const settingsPath = path.join(repoRoot, ".claude/settings.json");
  const settings = await readJson(settingsPath);
  const settingsLocalPath = path.join(repoRoot, ".claude/settings.local.json");
  const hasSettingsLocal = await exists(settingsLocalPath);
  const settingsLocal = hasSettingsLocal ? await readJson(settingsLocalPath) : undefined;
  const securityPatternsPath = path.join(repoRoot, ".claude/security-patterns.json");
  const securityPatterns = await readJson(securityPatternsPath);
  if (!settings || typeof settings !== "object") {
    findings.push({
      severity: "high",
      kind: "invalid-settings",
      path: ".claude/settings.json",
      message: "Shared settings must parse as JSON so permissions and hooks are enforceable."
    });
  } else {
    const denyList = Array.isArray(settings.permissions?.deny) ? settings.permissions.deny : [];
    for (const pattern of REQUIRED_DENY_PATTERNS) {
      if (!denyList.includes(pattern)) {
        findings.push({
          severity: "high",
          kind: "deny-coverage",
          path: ".claude/settings.json",
          message: `Missing destructive deny pattern \`${pattern}\`.`
        });
      }
    }

    for (const [eventName, commands] of Object.entries(REQUIRED_HOOK_COMMANDS)) {
      const registrations = Array.isArray(settings.hooks?.[eventName]) ? settings.hooks[eventName] : [];
      const configuredCommands = registrations.flatMap((registration) =>
        Array.isArray(registration.hooks)
          ? registration.hooks.map((hook) => String(hook.command || ""))
          : []
      );

      for (const command of commands) {
        if (!configuredCommands.includes(command)) {
          findings.push({
            severity: "high",
            kind: "hook-registration",
            path: ".claude/settings.json",
            message: `Missing ${eventName} hook registration for \`${command}\`.`
          });
        }
      }
    }
  }

  if (hasSettingsLocal && (!settingsLocal || typeof settingsLocal !== "object")) {
    findings.push({
      severity: "high",
      kind: "invalid-settings-local",
      path: ".claude/settings.local.json",
      message: "Local settings must parse as JSON when the optional local override file is present."
    });
  }

  if (!securityPatterns || typeof securityPatterns !== "object") {
    findings.push({
      severity: "high",
      kind: "invalid-security-patterns",
      path: ".claude/security-patterns.json",
      message: "Security patterns must parse as JSON so scanner-backed review can use them."
    });
  } else {
    const patterns = Array.isArray(securityPatterns.patterns) ? securityPatterns.patterns : [];
    if (patterns.length < 4) {
      findings.push({
        severity: "medium",
        kind: "thin-security-patterns",
        path: ".claude/security-patterns.json",
        message: `Expected at least 4 security patterns, found ${patterns.length}.`
      });
    }

    for (const pattern of patterns) {
      if (
        !isNonEmptyString(pattern.id) ||
        !isNonEmptyString(pattern.severity) ||
        !isNonEmptyString(pattern.description) ||
        !isNonEmptyString(pattern.regex)
      ) {
        findings.push({
          severity: "high",
          kind: "invalid-security-pattern",
          path: ".claude/security-patterns.json",
          message: "Each security pattern must include non-empty id, severity, description, and regex fields."
        });
        break;
      }
    }
  }

  const gitignorePath = path.join(repoRoot, ".gitignore");
  const requiredIgnorePatterns = [
    "CLAUDE.local.md",
    ".claude/settings.local.json",
    ".claude/worktrees/*",
    "!.claude/worktrees/.gitignore"
  ];
  for (const pattern of requiredIgnorePatterns) {
    if (!(await fileContains(gitignorePath, pattern))) {
      findings.push({
        severity: "high",
        kind: "gitignore-coverage",
        path: ".gitignore",
        message: `Missing project ignore pattern \`${pattern}\`.`
      });
    }
  }

  const traceabilityPath = path.join(repoRoot, "docs/FRAMEWORK_TRACEABILITY.md");
  const traceabilityRefs = await readTraceabilityReferences(traceabilityPath);
  for (const reference of traceabilityRefs) {
    const fullPath = path.join(repoRoot, reference);
    if (!(await exists(fullPath))) {
      findings.push({
        severity: "high",
        kind: "traceability-reference",
        path: "docs/FRAMEWORK_TRACEABILITY.md",
        message: `Traceability evidence path does not resolve: \`${reference}\`.`
      });
    }
  }

  return {
    status: findings.length === 0 ? "complete" : "attention",
    findings,
    counts,
    checked: {
      requiredFiles: REQUIRED_FILES.length,
      requiredDirectories: REQUIRED_DIRS.length,
      legacyRulesCount,
      traceabilityRefs: traceabilityRefs.length
    }
  };
}

export { run };

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  run()
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.findings.length === 0 ? 0 : 1);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
