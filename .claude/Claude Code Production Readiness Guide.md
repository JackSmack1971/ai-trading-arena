# **Architectural Specifications for High-Performance Claude Code Agent Environments**

## **Source-Confidence Framework and Verification Methodology**

To ensure the architectural integrity of this specification, a formal classification framework is established to evaluate configuration mechanisms and behavioral patterns. Recommendations are graded across five distinct tiers based on the source origin and the quality of empirical verification.

| Classification Tier | Definition | Verification Criteria | Target Confidence Level |
| :---- | :---- | :---- | :---- |
| **Class I: Officially Documented** | Direct, explicit behavior specified in primary materials.1 | Official Anthropic product documentation, developer logs, and SDK guides.3 | 95%–100% |
| **Class II: Officially Implied** | Behavioral patterns derived from official examples, courseware, or team repos.5 | Standard library integrations, official CLI diagnostic outputs, and codebases.5 | 80%–90% |
| **Class III: Empirically Observed** | Community configuration structures validated in production codebases.5 | Public Git repository metadata, open-source plugin layouts, and fork analyses.5 | 60%–75% |
| **Class IV: Experimental Workaround** | Programmatic patches designed to bypass verified product bugs or platform quirks.10 | Platform-specific issues, issue threads, and custom hook-based workarounds.10 | 40%–55% |
| **Class V: Speculative Pattern** | Projected system configurations based on early beta features or industry standards.4 | Beta endpoint schemas, future development plans, and multi-agent designs.4 | 15%–35% |

### **Repository Evidence Metadata Extraction**

To ground this report in empirical data, an evidence extraction pass was conducted by sampling public GitHub repositories containing production Claude Code configurations. This analysis focused on identifying file structures, YAML schemas, and script boundaries.

| Target Repository | Extraction Focus | Active Version Metadata | Key Artifact Patterns Found | Empirical Scope |
| :---- | :---- | :---- | :---- | :---- |
| **alirezarezvani/claude-skills** | Modular Skill Frameworks 8 | v2.9.0 / v2.10.0 8 | 338 skills across 16 domains, 533 Python automation tools, CONVENTIONS.md 8 | Enterprise Research & Business Ops 8 |
| **shanraisshan/claude-code-best-practice** | Subagent Frontmatter & Hooks 5 | v2.1.101 15 | 16 frontmatter fields, command-agent-skill loop, path-scoped rules 5 | Workflow Orchestration 5 |
| **arian88/claude-agents** | Benchmark Testing & Diagnostics 16 | v2.0+ community 16 | testing/ directory, 22-tool routing tables, context-triggered manifests 16 | Diagnostic Quality Assurance 16 |
| **VoltAgent/awesome-claude-code-subagents** | Domain Personas & Checklists 17 | v2.0+ community 17 | Role-based tool assignment tables, markdown-nested guidelines 17 | Specialized Agent Directories 17 |

## **Documented Verification of Claude Code Configurations**

Claude Code's behavioral and execution layers are configured through a series of declarative manifests, settings files, and interactive states.2

                      
                                     │  
         ┌───────────────────────────┴───────────────────────────┐  
         ▼                                                       ▼  
                           \[ Programmatic Control Layer \]  
   ├── CLAUDE.md (Root Rules)                        ├── settings.json (Hooks & Env) \[18\]  
   ├──.claude/rules/ (Path Rules)                   ├──.mcp.json (Tool Connectors)   
   └──.claude/agents/ (Worker Manifests)           └── CLI Flags (--plan, \-p, \--init) 

### **Subagents and Worker Isolation**

Custom subagents located in .claude/agents/ (and globally in \~/.claude/agents/) are officially documented Class I mechanisms.6 Subagents run within their own isolated context windows, preventing verbose outputs like search queries, linter logs, or build errors from cluttering the parent session's history.2  
The runtime resolves subagent settings by recursively scanning directories, using the name field in the frontmatter as the primary identifier.6 In version 2.1.63, the Task tool was renamed to Agent to better align with these multi-agent workflows; existing configurations remain supported as backwards-compatible aliases.6

### **Persistent Project Memory**

The CLAUDE.md manifest serves as a persistent context layer, loaded automatically at the start of every session.1 This file establishes baseline coding standards, build paths, test runners, and repository rules.1  
To optimize token usage and prevent instruction drift, the manifest should be kept under 200 lines.1 When a /compact command is run, the project-root CLAUDE.md is re-injected into the session head, whereas nested directory rules must be reloaded dynamically once the agent accesses those paths again.1

### **Modular Skill Frameworks**

Skills configured in SKILL.md files provide reusable, on-demand playbooks that expand Claude's core capabilities.22 The skills engine has been unified with the custom slash-command system, meaning that command files in .claude/commands/ and skill packages in .claude/skills/ are processed identically.22  
Skills support dynamic context injection, allowing developers to embed terminal output directly into prompts 22:  
Staged changes for this task:  
\!git diff \--cached \--name-only  
The system executes the nested terminal command and injects its live stdout back into the prompt context at runtime.22

### **Event-Driven Lifecycle Hooks**

Hooks are deterministic scripts registered in settings.json that run automatically during specific session events.18 Hooks run on three distinct cadences 23:

* **Once per session** (e.g., SessionStart, SessionEnd) 18  
* **Once per turn** (e.g., UserPromptSubmit, Stop, StopFailure) 18  
* **On every tool call inside the loop** (e.g., PreToolUse, PostToolUse) 18

Hooks provide direct control over tool execution; for example, a PreToolUse hook can evaluate proposed bash commands and return a blocking decision to prevent dangerous operations before they run.23

### **Operational and Automation States**

The runtime supports several interactive and non-interactive execution modes to fit different development workflows.3

* **Plan Mode (--plan or Ctrl+G)**: A non-modifying analysis phase where Claude explores code and structures architectural plans before making edits.5  
* **Goal Tracking (/goal)**: Sets specific exit criteria monitored by an independent background evaluator, keeping the agent at work until the conditions are met.20  
* **Non-Interactive Mode (-p)**: Enables headless, scriptable execution, allowing developers to pipe data into Claude or run it in CI pipelines (e.g., GitHub Actions, GitLab CI/CD) to automate code reviews and issue triage.3

## **High-Performance Behavioral Optimization**

To build reliable, cost-effective Claude Code environments, developers must optimize the agent's reasoning depth, tool selection, and context efficiency.1

### **Context-Window Decay and Prompt Attention Bounds**

In long-running sessions, context window accumulation directly impacts model accuracy.1 As history expands, prompt attention decays, causing the model to occasionally ignore rules or drift from constraints.1 To maximize the space available for active reasoning, developers can use a structured token optimization formula:  
![][image1]  
Where ![][image2] is the total context limit, ![][image3] represents static instructions, ![][image4] is the active history, and ![][image5] is tool-call overhead.  
To keep ![][image3] minimal, global configurations should be split.1 Immutable repository facts belong in the root CLAUDE.md, while path-specific rules should be moved to .claude/rules/.1 Using path-scoped rules ensures that instructions are lazy-loaded only when the agent touches matching directories, keeping the active context window lean and focused.1

### **Cognitive-Load Model Routing**

Using high-tier frontier models for simple tasks increases execution costs and latency.12 A optimized workflow routes tasks dynamically based on complexity 12:

* **Low Cognitive Load (e.g., search, indexing, linting)**: Routed to Haiku 4.5 through specialized read-only subagents.2 This model handles rapid search and directory mapping efficiently at a lower cost.2  
* **Medium Cognitive Load (e.g., refactoring, feature development)**: Routed to Sonnet 4.6, balancing reasoning depth with high execution speeds.14  
* **High Cognitive Load (e.g., security audits, architecture design)**: Routed to Opus 4.8, leveraging its advanced reasoning for complex logical analysis.12

## **Body Prompt Architecture and Instruction Logic**

The instructions inside an agent's system prompt directly control how it behaves and interacts with the workspace.22 To ensure consistent execution, prompts should use clear, imperative logic and avoid conversational filler.22

### **Operating Procedures and Rules**

System prompts should be structured using numbered, step-by-step procedures.29 This linear structure provides a logical path for the agent, reducing skipped checks and ensuring thorough execution.29  
Additionally, the prompt should define clear rules for tool usage, explicitly limiting file and shell operations to safe paths to prevent destructive actions.12

# **Database Performance Engineer**

You are a Database Optimizer specializing in query profiling and index optimization.

## **Operating Procedure**

1. Locate target schemas and queries using Grep or language server tools.  
2. Read matched files using Read to map transaction boundaries.  
3. Construct an optimization plan inside a temporary PLAN.md file.  
4. Modify target queries using precise, isolated edits via Edit.  
5. Verify changes by running local linters and database unit tests.

## **Security Controls**

* You are strictly limited to files inside src/db/ and migrations/.  
* Never execute broad shell commands (rm, mv) or alter production data.

### **Stop Conditions and Escalation Gating**

To prevent agents from getting stuck in infinite tool-use loops, system prompts must define clear stop conditions and escalation thresholds.5

## **Execution Boundaries**

* Stop execution immediately once all database tests pass successfully.  
* Stop and output a diagnostic report if execution reaches maxTurns without a successful build.  
* If a change requires modifying database credentials or third-party configurations, halt execution and escalate to the user using AskUserQuestion.

### **Structured Output and Failure Handling**

To enable clean downstream parsing, agents should produce structured, machine-readable summaries, avoiding unstructured explanations.29

JSON  
{  
  "status": "success",  
  "files\_modified": \["src/db/queries.ts"\],  
  "indexes\_created": \["idx\_users\_org\_id\_status"\],  
  "performance\_delta": "estimated 42% reduction in query latency",  
  "verification\_evidence": "All 14 queries pass index-scan validation checks"  
}

## **Workspace Orchestration and Composition Matrix**

Choosing the right configuration or execution mechanism is critical for maintaining clean, performant, and secure developer environments.2 The matrix below evaluates the core mechanisms of the Claude Code ecosystem.

| Orchestration Mechanism | Best Use Case | Scope Boundaries | Maintenance Burden | Security Risk | Context Cost | Failure Modes | Example Implementation |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| **CLAUDE.md** | Global project facts, style guides, build and test commands.1 | Entire active workspace session.1 | Low; manual edits committed to repository.1 | Low; model-level instructions only.26 | High; loaded at startup and re-injected on turns.1 | Instruction drift, neglected rules during long sessions.1 | Registering build engines and preferred test suites.1 |
| **Subagents** | Isolated parallel tasks, least-privilege security.2 | Directory-level or custom worker sessions.6 | Moderate; requires maintaining agent markdown manifests.5 | Moderate; handles file edits and commands.6 | Isolated; returns only final task summaries.2 | Misrouted tasks due to vague descriptions.6 | Spawning read-only reviewer or security auditor agents.2 |
| **Skills** | Reusable task playbooks, shared team conventions.22 | Project, User, or Enterprise scope.22 | Moderate; requires updating markdown playbooks.22 | Low; restricted to standard conversation rules.22 | Moderate; loads inline only when activated.22 | Execution failures due to missing templates.22 | Packaging API design models or commit guidelines.20 |
| **Hooks** | Deterministic lifecycle scripts, security checks, lint rules.18 | Project or User settings files.18 | High; requires configuring JSON and shell scripts.18 | High; executes arbitrary shell scripts on events.23 | Zero; runs external programmatic code.35 | Shell failures blocking tool execution pipelines.18 | Pre-commit formatting, static scans, secret checks.18 |
| **Slash Commands** | Interactive shortcuts, manual terminal tasks.21 | Interactive CLI session.22 | Moderate; managed via commands folder.21 | Low; runs within normal session permissions.22 | Low; loaded only upon execution.22 | Positional argument and parsing errors.22 | Deploying to staging, running custom log queries.21 |
| **MCP Servers** | Connecting to external databases, APIs, or files.3 | Configured local or remote services.19 | High; requires installing and configuring servers.7 | High; grants system and network access.26 | Low; exposes only tool definition schemas.19 | Integration failures due to missing credentials.7 | Connecting to Jira APIs, databases, or local runtimes.3 |
| **Settings Files** | Hardening permissions, configuring exclusions.19 | User, Project, Local, or Managed scope.19 | Low; static JSON declarations.19 | Low; sets permission boundaries.19 | Zero; declarative configurations.19 | Bypassed rules due to incorrect working directory starts.38 | Configuring global path exclusions and shell permissions.27 |
| **External Scripts** | Custom test runners, compilation checks, builds.8 | Workspace filesystem.8 | High; requires maintaining external shell scripts.8 | High; runs with direct host privileges.18 | Zero; runs outside model context.8 | Platform compatibility issues across OS environments.10 | Running custom integration test suites or compilation checks.18 |
| **CI Workflows** | Non-interactive runs, automated pull requests.3 | Virtual runners, CI pipelines.3 | High; managed via YAML pipelines.3 | Moderate; runs in isolated virtual environments.3 | High; processes broad automated prompts.3 | Build failures due to broken secrets or networks.30 | Running automated security scans on incoming PRs.3 |

## **Diagnostic Analysis of Failure Modes and Anti-Patterns**

This section explores eleven common architectural failure modes within the Claude Code ecosystem, providing concrete mitigations and bad/good comparison examples for each.

### **1\. Agent Misrouting via Overbroad Descriptions**

* **Root Cause**: When multiple subagents use vague or overlapping description metadata, Claude struggle to identify the correct agent, leading to misrouted tasks.6  
* **Anti-Pattern**:  
  YAML  
  \# Unstructured description metadata  
  name: ts-helper  
  description: "Helps write TypeScript code for the project."

* **Mitigation**: Use precise, high-signal descriptions that detail the agent's target files, directories, and specific trigger keywords.5  
  YAML  
  \# High-signal description metadata  
  name: ts-helper  
  description: \>  
    Reviews, refactors, and implements TypeScript endpoint controllers within src/api/routes/.  
    Triggers on phrases like: 'modify api route', 'new endpoint schema', 'add router controller'.

### **2\. Excessive Subagent Permissions and Safety Exposure**

* **Root Cause**: Granting agents broad terminal access for simple read-only tasks violates the principle of least privilege, increasing the risk of destructive actions.12  
* **Anti-Pattern**:  
  YAML  
  \# Unrestricted permissions on a read-only agent  
  name: security-audit-agent  
  tools: Bash, Read, Write, Edit  
  permissionMode: bypassPermissions

* **Mitigation**: Restrict tool access to the minimum set required for the task, explicitly blocking write and execution privileges for reviewer roles.2  
  YAML  
  \# Restrained read-only permissions  
  name: security-audit-agent  
  tools: Read, Grep, Glob  
  disallowedTools: Bash, Write, Edit  
  permissionMode: dontAsk

### **3\. Context Pollution from Volatile Workspaces**

* **Root Cause**: Running search operations in unconfigured workspaces loads build logs, node modules, and caches into the active history, exhausting context windows.20  
* **Anti-Pattern**: Asking an agent to search the root directory without ignoring build outputs, loading compiled bundles and caches into context.27  
* **Mitigation**: Set explicit path exclusions in settings files to prevent the agent from reading generated or temporary directories.27  
  JSON  
  {  
    "claudeMdExcludes": \[  
      "\*\*/node\_modules/\*\*",  
      "\*\*/dist/\*\*",  
      "\*\*/.next/\*\*",  
      "\*\*/coverage/\*\*"  
    \]  
  }

### **4\. Bloated and Monolithic CLAUDE.md Manifests**

* **Root Cause**: Packing all style guidelines, schemas, and workflows into a single CLAUDE.md file consumes large amounts of context and degrades instruction adherence.1  
* **Anti-Pattern**: A massive CLAUDE.md containing detailed database schemas, deployment checklists, and historical release notes.1

* # **Mitigation: Keep the primary CLAUDE.md under 200 lines, delegating specific rules to path-scoped rule files in .claude/rules/.1**   **Repository Instructions**   **See @docs/architecture.md for project overview.**   **Specific frontend style guidelines are located in .claude/rules/frontend.md.**

### **5\. Weak Stop Conditions and Loop Escapes**

* **Root Cause**: If an agent lacks clear exit parameters, it can get stuck in infinite retry loops, attempting to resolve compiler or linter errors repeatedly.5  
* **Anti-Pattern**: A subagent prompt that instructs the model to "fix all errors" without setting turn limits or fallback triggers, leading to endless edits.5

* ## **Mitigation: Set explicit turn limits (maxTurns) in the agent's frontmatter and define clear halt triggers in the prompt instructions.5**   **YAML**   **\# Mandatory execution gate**   **maxTurns: 10**    **Loop Control**   **If the compiler fails with the same error twice, stop making edits, restore files using git, and report the diagnostic logs to the user.**

### **6\. Missing Verification Loops**

* **Root Cause**: Allowing an agent to modify code without running unit tests or linters often introduces broken code or syntax errors into the repository.20  
* **Anti-Pattern**: Asking an agent to "implement a new auth handler" without defining any verification tests or validation steps.20

* ## **Mitigation: Require the agent to run verification commands autonomously after any code modifications.20**   **Verification Loop**

  1. Implement the planned query optimization changes.  
  2. Execute the local test suite: npm run test:db.  
  3. If tests fail, diagnose the issue and refine the query.

### **7\. Code Changes Accepted Without Verifiable Evidence**

* **Root Cause**: Accepting an agent's claim of completion without inspecting raw logs or execution evidence can allow hidden compilation or test errors to bypass checks.12  
* **Anti-Pattern**: Trusting claims like "all tests pass" without requiring the model to output the raw test execution logs.12

* ## **Mitigation: Mandate that the agent output raw execution summaries and test results to prove verification was successful.12**   **Completion Policy**   **Do not report a task as complete without pasting the final, successful stdout log from npm run test directly into your summary.**

### **8\. Cross-Platform Hook Failures**

* **Root Cause**: Hardcoding platform-specific shell operators inside hooks causes execution failures when running across different developer environments (e.g., macOS vs. Windows).10  
* **Anti-Pattern**:  
  JSON  
  {  
    "hooks": {  
      "PostToolUse": \[{  
        "matcher": "Edit",  
        "command": "cmd.exe /c format.bat"  
      }\]  
    }  
  }

* **Mitigation**: Use platform-agnostic environments (e.g., Node, Python) and leverage project variables to resolve paths cleanly.8  
  JSON  
  {  
    "hooks": {  
      "PostToolUse":  
    }  
  }

### **9\. Unhandled MCP and Connection Failures**

* **Root Cause**: If external tools or services crash, the agent can get blocked, repeatedly trying to access the broken resource without success.7  
* **Anti-Pattern**: Prompts that assume external MCP connections are always online, lacking fallback options or error handlers.7

* ## **Mitigation: Define explicit fallback steps to guide the agent when external tool dependencies are offline.7**   **Tool Fallback Policy**   **If the database MCP server fails to connect, log a diagnostic warning and fallback to reading local database mocks in tests/fixtures/.**

### **10\. Ambiguous Inter-Agent Handoffs**

* **Root Cause**: Spawning secondary agents without sharing a structured state file can cause task details, decisions, or dependencies to get lost.12  
* **Anti-Pattern**: Initiating secondary workers with broad prompts like "now check my edits" without sharing context, leading to duplicate searches.12

* ## **Mitigation: Write the system state and pending actions to a structured file before invoking another agent.8**   **State Preservation**   **Before invoking another agent, write a detailed task summary to .claude/handoff.json documenting the modified paths, test status, and next steps.**

### **11\. Bypassed Repository Policies**

* **Root Cause**: Local hooks and settings are ignored when Claude Code is launched from directories other than the project root.38  
* **Anti-Pattern**: Starting Claude from a package subdirectory, which silently bypasses root settings and hooks.27  
* **Mitigation**: Always start Claude Code sessions from the project root directory, using subdirectory-specific settings files only for isolated packages.27

## **Reusable Copy-Paste Agent Archetype Blueprints**

Note: The configurations below are version-sensitive and require Claude Code version 2.1.63 or later to support advanced fields and model overrides.6

### **1\. Canonical Subagent Blueprint**

## **name: canonical-subagent description: \> Standard template manifest for general-purpose engineering tasks. Use when asked to implement core logic, write tests, or refactor components. tools: Read, Write, Edit, Bash, Grep, Glob, Agent disallowedTools: model: claude-sonnet-4-6 permissionMode: acceptEdits maxTurns: 10 skills: mcpServers: hooks: memory: project background: false effort: medium isolation: worktree color: cyan**

# **Role and Mission**

You are a general-purpose Software Engineer. Your goal is to design, implement, and verify robust code modifications.

## **Operating Procedure**

1. **Search**: Find target files and dependencies using Grep or Glob.  
2. **Design**: Build an implementation plan in PLAN.md before making edits.  
3. **Execute**: Modify target files using precise, isolated changes with the Edit tool.  
4. **Verify**: Run the local test suite and linter to confirm changes are correct.  
5. **Output**: Report the results and paste the final test output logs.

## **Tool-Use Guidelines**

* Limit search queries to target directories to save context space.  
* Never use dangerous shell wildcards (rm \-rf, sudo, mv \*). 12

## **Required Evidence Collection**

* You MUST run git diff after your edits and inspect the changes for accuracy.  
* Paste the raw, successful stdout log of the test suite in your final summary.

## **Stop and Escalation Conditions**

* Stop immediately and report results once all unit tests pass.  
* Stop and escalate using AskUserQuestion if modifications require altering project keys or credentials.

## **Output Schema**

Ensure your final report is structured as a clear markdown document:

* **Summary**: High-level overview of the implemented changes.  
* **Modified Files**: List of modified file paths.  
* **Execution Proof**: Raw, successful terminal outputs of tests and linters.

## **Failure Handling**

* If the test suite fails, revert changes using git restore and report the diagnostic logs.

## **Verification Requirements**

* Code changes MUST compile cleanly without any warnings or linter errors.

### **2\. Read-Only Reviewer Blueprint**

## **name: read-only-reviewer description: \> Reviews code modifications for structure, style, and optimization opportunities. Triggers on pull request reviews or requests to audit components. tools: Read, Grep, Glob disallowedTools: Write, Edit, Bash, Agent model: claude-sonnet-4-6 permissionMode: dontAsk maxTurns: 5 skills: mcpServers: hooks: memory: local background: false effort: medium isolation: color: blue**

# **Role and Mission**

You are a Senior Technical Reviewer. Your role is to analyze code changes and suggest improvements without making any edits.14

## **Operating Procedure**

1. Find proposed changes by reading modified files with Read.  
2. Search for related component definitions using Grep to trace patterns.  
3. Evaluate the changes against the style standards set in CLAUDE.md.  
4. Suggest structural improvements and style optimizations.

## **Tool-Use Guidelines**

* You are strictly limited to read-only tools (Read, Grep, Glob).2  
* Do not attempt to use write or terminal execution tools.

## **Required Evidence Collection**

* Reference the exact line numbers and file paths for each of your suggestions.14

## **Stop and Escalation Conditions**

* Stop once you have completed a thorough analysis of the target paths.  
* Halt and escalate to the user if critical files are missing or unreadable.

## **Output Schema**

Your final review MUST be formatted as a structured markdown report:

* **Overview**: High-level summary of the reviewed modifications.  
* **Critical Issues**: Major errors, style violations, or bugs.  
* **Suggestions**: Actionable recommendations for code improvements and optimizations.

## **Failure Handling**

* If target paths cannot be resolved, log the missing dependencies and exit.

## **Verification Requirements**

* Verify that your recommendations align with the project guidelines in CLAUDE.md.

### **3\. Security Reviewer Blueprint**

name: security-reviewer  
description: \>  
Audits modifications for potential security vulnerabilities, OWASP violations, and secret exposure.  
Auto-invokes when auth routes or database controllers are modified.  
tools: Read, Grep, Glob, Agent(sandbox-vulnerability-checker)  
disallowedTools: Write, Edit, Bash  
model: claude-opus-4-8  
permissionMode: dontAsk  
maxTurns: 8  
skills:

* owasp-mitigation-playbook  
  mcpServers:  
  hooks:  
  memory: project  
  background: false  
  effort: high  
  isolation:  
  color: red

# **Role and Mission**

You are a Security Auditor. Your mission is to audit codebase changes for security risks, vulnerabilities, and secret exposure.14

## **Operating Procedure**

1. Read auth controllers and database integrations with Read.  
2. Scan database queries for potential SQL injection vulnerabilities.  
3. Audit route definitions to ensure authorization checks are enforced.  
4. Verify that no private keys, passwords, or credentials are exposed.

## **Tool-Use Guidelines**

* Never modify files or run terminal commands; focus on mapping security issues.  
* You may spawn isolated subagents to check code patterns under secure environments.14

## **Required Evidence Collection**

* Document every vulnerability with its severity rating (Low, Medium, High, Critical) and the specific line numbers where it occurs.

## **Stop and Escalation Conditions**

* Stop once you have analyzed all target controllers.  
* Escalate immediately using AskUserQuestion if you detect exposed production secrets.

## **Output Schema**

Format your final security review as a structured markdown report:

* **Executive Summary**: Overview of the analyzed paths.  
* **Vulnerabilities**: Detailed list of identified risks, including severity ratings and suggested mitigations.  
* **Security Posture**: General security evaluation of the reviewed changes.

## **Failure Handling**

* If target paths are unreadable, report the configuration block and exit.

## **Verification Requirements**

* Ensure your audit covers all primary OWASP vulnerability targets.

### **4\. TDD Development Agent Blueprint**

## **name: tdd-developer description: \> Specialized developer that writes unit tests before implementing code modifications. Triggers on requests to build new features with test-driven development. tools: Read, Write, Edit, Bash, Grep, Glob disallowedTools: Agent model: claude-sonnet-4-6 permissionMode: acceptEdits maxTurns: 12 skills: mcpServers: hooks: memory: project background: false effort: medium isolation: worktree color: green**

# **Role and Mission**

You are an expert TDD Engineer. Your mission is to write failing unit tests before implementing any code modifications.14

## **Operating Procedure**

1. Write failing unit tests in the appropriate test directory (tests/).  
2. Run the test suite and verify that the new tests fail as expected.  
3. Implement the minimal code modifications required to make the tests pass.  
4. Run the test suite again and confirm that all tests pass cleanly.  
5. Refactor the code for style, ensuring all tests continue to pass.

## **Tool-Use Guidelines**

* All edits must be processed through precise, isolated changes with Edit.  
* Run tests strictly using the project's test runner via Bash.

## **Required Evidence Collection**

* You MUST capture and output the terminal logs showing the failing test run before writing code changes.  
* Paste the final, successful test stdout logs to prove verification succeeded.

## **Stop and Escalation Conditions**

* Stop once all unit tests run and pass successfully.  
* Stop and escalate if edits break existing, unrelated test files.

## **Output Schema**

Format your final report as a structured markdown summary:

* **Test Specifications**: List of written tests and assertions.  
* **Failing Log**: Terminal output of the initial failing test run.  
* **Passing Log**: Final, successful stdout logs showing all tests passed.

## **Failure Handling**

* If tests continue to fail after implementation edits, revert changes using git and output the compiler errors.

## **Verification Requirements**

* Verify that linter checks pass and no new errors are introduced.

### **5\. Codebase Researcher Blueprint**

## **name: codebase-researcher description: \> Explores deep codebases, builds systems maps, and traces component dependencies. Triggers on requests to map dependencies or explore unfamiliar code. tools: Read, Grep, Glob disallowedTools: Write, Edit, Bash, Agent model: claude-haiku-4-5 permissionMode: dontAsk maxTurns: 10 skills: mcpServers: hooks: memory: project background: true effort: low isolation: color: yellow**

# **Role and Mission**

You are a Technical Investigator. Your mission is to trace code flows, map component dependencies, and identify where files live.2

## **Operating Procedure**

1. Map target directories using pattern queries with Glob.16  
2. Locate class structures, exports, and integrations using Grep.  
3. Trace system execution and import flows by reading files with Read.  
4. Compile a comprehensive architecture dependency map.

## **Tool-Use Guidelines**

* You are restricted to read-only tools to keep search and research fast and cost-effective.2  
* Avoid reading large binary or non-code files.

## **Required Evidence Collection**

* Trace and document the exact execution and import paths between components.14

## **Stop and Escalation Conditions**

* Stop once you have mapped the execution path of the target process.  
* Escalate if you encounter obfuscated or unreadable compiled source files.

## **Output Schema**

Format your final report as a structured markdown overview:

* **Architecture Overview**: Map of the discovered system layout.  
* **Execution Flow**: Step-by-step trace of the target process.  
* **Dependency Paths**: List of import paths and connections between components.

## **Failure Handling**

* If dependencies are missing, map the resolved paths and flag the missing packages.

## **Verification Requirements**

* Verify that your dependency maps match the actual imports on disk.

### **6\. Adversarial Verification Agent Blueprint**

## **name: adversarial-verifier description: \> Finds bugs, edge cases, and failure scenarios in proposed code modifications. Triggers on requests to verify code quality. tools: Read, Grep, Glob, Bash disallowedTools: Write, Edit, Agent model: claude-opus-4-8 permissionMode: acceptEdits maxTurns: 8 skills: mcpServers: hooks: memory: project background: false effort: max isolation: worktree color: orange**

# **Role and Mission**

You are an Adversarial Quality Auditor. Your role is to find potential bugs, edge cases, and failure points in proposed code modifications.14

## **Operating Procedure**

1. Read proposed edits and identify weak assumptions or unhandled inputs.  
2. Search for race conditions, error-handling gaps, or missing validations.  
3. Write test scripts to stress-test edits under load or edge conditions.  
4. Attempt to break modifications by identifying scenarios where they fail.

## **Tool-Use Guidelines**

* Restrict file modifications to writing test scenarios inside test directories.  
* Run tests and edge cases using terminal execution scripts via Bash.

## **Required Evidence Collection**

* Document every identified failure case with a step-by-step guide to reproduce it.

## **Stop and Escalation Conditions**

* Stop once you have tested modifications against common edge cases.  
* Escalate immediately if you find critical flaws that break core system features.

## **Output Schema**

Format your final report as an adversarial assessment:

* **Audited Changes**: Summary of the evaluated modifications.  
* **Identified Risks**: List of edge cases, unhandled inputs, or race conditions.  
* **Reproduction Steps**: Step-by-step guides and test outputs for each issue.

## **Failure Handling**

* If edits fail stress tests, write a failing unit test that reproduces the bug.

## **Verification Requirements**

* Verify that your edge-case tests match valid production environments.

### **7\. Issue-to-PR Implementation Agent Blueprint**

name: issue-to-pr-agent  
description: \>  
Reads GitHub issues, implements the required fixes, and creates pull requests.  
Triggers on automation requests to fix issues.  
tools: Read, Write, Edit, Bash, Grep, Glob, Agent  
disallowedTools:  
model: claude-sonnet-4-6  
permissionMode: acceptEdits  
maxTurns: 15  
skills:

* fix-issue  
  mcpServers:  
  hooks:  
  memory: project  
  background: false  
  effort: medium  
  isolation: worktree  
  color: purple

# **Role and Mission**

You are an Automated Developer. Your goal is to resolve issues, verify fixes, and raise clean pull requests.14

## **Operating Procedure**

1. Read the issue details and gather context using development tools.20  
2. Search the codebase for relevant components and design a clean fix.  
3. Implement the planned modifications in an isolated git branch.  
4. Run tests and linters to confirm the fix is correct.  
5. Create a descriptive commit and open a pull request for review.

## **Tool-Use Guidelines**

* Limit edits to files relevant to the issue to prevent scope creep.  
* Run tests and manage git commands using terminal scripts via Bash.

## **Required Evidence Collection**

* Capture and output the linter check and test suite execution logs.  
* Document the git branch name and pull request details.

## **Stop and Escalation Conditions**

* Stop once your pull request has been successfully created.  
* Escalate using AskUserQuestion if the issue requires modifying core infrastructure settings.

## **Output Schema**

Format your final report as a structured markdown summary:

* **Resolved Issue**: Reference to the issue details.  
* **Implemented Changes**: List of file edits and fixes.  
* **Verification Logs**: Successful test and linter execution output.  
* **Pull Request**: Created git branch and PR information.

## **Failure Handling**

* If tests fail, revert changes using git, diagnose the compiler errors, and refine the fix.

## **Verification Requirements**

* Verify that changes compile cleanly and no warnings are introduced.

### **8\. Documentation Pipeline Agent Blueprint**

## **name: doc-pipeline-agent description: \> Analyzes code modifications and updates matching project documentation, READMEs, and API specifications. Triggers on requests to document edits. tools: Read, Write, Edit, Glob, Grep disallowedTools: Bash, Agent model: claude-haiku-4-5 permissionMode: acceptEdits maxTurns: 6 skills: mcpServers: hooks: memory: project background: true effort: low isolation: color: pink**

# **Role and Mission**

You are a Technical Writer. Your mission is to keep project documentation, API schemas, and setup instructions up to date.14

## **Operating Procedure**

1. Find recent edits by reading modified paths and diffs with Read.  
2. Locate matching documentation files using Glob or Grep.  
3. Update READMEs, API guides, and code comments to match modifications.  
4. Ensure API parameter tables and setup keys are documented correctly.

## **Tool-Use Guidelines**

* Restrict edits strictly to markdown documentation and inline code comments.17  
* Do not modify source code logic or execute terminal commands.

## **Required Evidence Collection**

* Trace and verify that all updated documents align with the implemented changes.14

## **Stop and Escalation Conditions**

* Stop once all related documentation files have been updated.  
* Escalate if code changes alter major system architectures without a spec document.

## **Output Schema**

Your final summary MUST be formatted as a structured report:

* **Updated Documentation**: List of modified documentation paths.  
* **Documented Changes**: Overview of updated API schemas, guides, or instructions.  
* **Fidelity Checklist**: Verification that docs match the code.

## **Failure Handling**

* If documentation files are missing, create new markdown docs in the appropriate paths.

## **Verification Requirements**

* Verify that markdown files are formatted correctly and link paths are valid.

## **Production-Readiness Evaluation Rubric**

To maintain high-quality agent environments, this evaluation framework scores agent and subagent configurations from 0 to 5 across 10 specific dimensions.

Total Readiness Score \= Sum of Scores across all 10 Dimensions (0 to 50 scale)

       0                      15                     30                     45          50  
       ├──────────────────────┼──────────────────────┼──────────────────────┼───────────┤  
  Critical Risks       Remediation Required     Production Ready          Elite Level

### **Evaluation Dimensions**

#### **1\. Scope Clarity**

* **0: Unrestricted**: No scope boundaries defined; agent has broad access to explore and modify any file.32  
* **1: Generic**: Outlines basic targets but lacks hard, file-level directory restrictions.32  
* **2: Defined**: Explicit target paths defined; however, rules are missing negative boundaries.12  
* **3: Controlled**: Hard path rules set; clear list of allowed and denied directories.12  
* **4: Strict**: Comprehensive scope rules; details precise directories and contains negative limits.12  
* **5: Least Privilege**: Strict path controls; limits target directories and restricts file-editing tools.12

#### **2\. Routing Description Quality**

* **0: Missing**: Missing or extremely vague routing descriptions (e.g., "An agent for this repository").32  
* **1: Low Signal**: Generic capability descriptions that lack specific execution triggers.32  
* **2: Basic**: Outlines the agent's main role and mentions some target file areas.29  
* **3: High Signal**: Detailed description; includes clear target directories and specific trigger keywords.29  
* **4: Optimized**: High-signal description; outlines exact triggers and details expected outputs.5  
* **5: Elite**: Precise routing metadata; includes clear paths, specific trigger keywords, and expected output schemas.5

#### **3\. Tool Minimality**

* **0: Monolithic**: Inherits all workspace tools, allowing write and execution access for read-only roles.32  
* **1: Permissive**: Declares some tool restrictions but leaves execution privileges too broad.32  
* **2: Over-Provisioned**: Limits tool definitions; however, retains unnecessary tools for the agent's role.32  
* **3: Segregated**: Clear separation of privileges; limits write access for reviewer roles.14  
* **4: Minimal**: Restricts tools to the minimum set required; uses denylists to block dangerous commands.14  
* **5: Zero Trust**: Strict privilege boundaries; allows only minimal tool access and secures child agent execution.2

#### **4\. Reasoning Depth**

* **0: Default**: Uses random model selections for complex, logic-heavy engineering tasks.12  
* **1: Basic**: Standard model defaults; lacks effort parameters to scale reasoning depth.14  
* **2: Configured**: Configures basic model overrides but does not calibrate reasoning effort.5  
* **3: Aligned**: Aligns model selection to task complexity (e.g., Sonnet for refactors, Haiku for search).12  
* **4: Calibrated**: Precise model routing; aligns model and effort parameters to task load.5  
* **5: Cognitive Optimization**: Dynamic cognitive routing; uses high-tier models with maximized effort for audits.12

#### **5\. Context Efficiency**

* **0: Bloated**: Broad, unconstrained configurations that overload the active context window.1  
* **1: Low Efficiency**: Generic workspace rules; lacks size limits or path exclusion rules.1  
* **2: Managed**: Restricts instruction lengths but does not ignore noisy build paths.1  
* **3: Filtered**: Configures path exclusions to ignore build files, modules, and caches.27  
* **4: Segmented**: Modular architecture; delegating detailed rules to path-scoped files to save context.1  
* **5: Mathematical Bounded**: Ultra-lean context; project instructions under 200 lines, path-scoped lazy loading, and regular compaction.1

#### **6\. Verification Discipline**

* **0: None**: Relies entirely on self-reports, accepting "looks done" without verification tests.20  
* **1: Passive**: Instructs the agent to "run tests" but does not define specific test scripts.20  
* **2: Basic**: Outlines verification steps; however, lacks clear rules to handle test failures.20  
* **3: Active**: Defines clear verification commands and requires test runs on changes.20  
* **4: Gated**: Gated verification; details clear pass/fail criteria and demands evidence of successful runs.20  
* **5: Closed Loop**: Closed-loop verification; blocks completion until test suites pass, falling back to clean reverts on errors.20

#### **7\. Safety Controls**

* **0: Exposed**: Disables permissions globally without sandboxing, exposing system runtimes.10  
* **1: Policy Only**: Relies on model compliance for safety instead of technical permission controls.26  
* **2: Basic**: Configures permission guidelines in CLAUDE.md but has no technical enforcement.11  
* **3: Technical**: Technical boundaries; uses settings permissions to restrict tool access.11  
* **4: Isolated**: Hard safety boundaries; runs agents inside isolated virtual workspaces or worktrees.5  
* **5: Hard Sandboxed**: Full defense-in-depth; sandboxed runtimes, restricted tools, and PreToolUse hooks to block dangerous shell commands.2

#### **8\. Maintainability**

* **0: Hardcoded**: Hardcoded scripts, inline absolute paths, and duplicated instructions.27  
* **1: Low Modularity**: Basic folder organization; however, settings are duplicated across environments.27  
* **2: Basic Settings**: Project-level settings; but lacks local file overrides for local developers.19  
* **3: Segmented**: Modular configuration; separates shared team settings from local local files.19  
* **4: Config Driven**: Version-controlled scripts; leverages environment variables to configure system paths cleanly.8  
* **5: Enterprise Grade**: High modularity; uses numeric, drop-in managed configurations to deploy clean overrides across projects.19

#### **9\. Downstream Handoff Quality**

* **0: Terminated**: Abrupt session terminations without summaries or task descriptions.12  
* **1: Verbose**: Simple exit remarks (e.g., "Refactor done") without detailing modified files.12  
* **2: Narrative**: High-level execution summaries but lacks structured outputs.29  
* **3: Structured**: Structured outputs; details changes, tests run, and modified file lists.29  
* **4: Typed**: Formats final outputs to matching, machine-readable JSON or Markdown schemas.29  
* **5: State Preserved**: Formal handoff contracts; writes active task states to structured files for other agents to read.8

#### **10\. Source Grounding**

* **0: Groundless**: No code references; relies on speculative assertions or outdated codebase context.25  
* **1: Low Trace**: Generic references to files; does not trace component or module definitions.25  
* **2: Simple Search**: Search code paths but relies on manual directions to locate files.25  
* **3: Active Search**: Uses Glob and Grep to find component files and trace system patterns.16  
* **4: Semantic Trace**: Traces files using language servers and active search queries.16  
* **5: Context Grounded**: Full code intelligence; uses language servers to map components, trace files, and fetch definitions before edits.16

### **Interpretation Bands and Remediation Guidance**

#### **0 to 15: Critical Risk Band**

* **Evaluation Summary**: Unconstrained permissions, bloated context window, and a complete lack of verification checks.1  
* **Actionable Remediation**:  
  1. Immediately strip terminal execution tools (Bash) from general agent definitions.2  
  2. Restructure the root CLAUDE.md to be under 200 lines, moving stylistic guidelines to separate files.1  
  3. Mandate local test suite runs on modifications.20

#### **16 to 30: Remediation Required Band**

* **Evaluation Summary**: Has basic boundaries, but lacks strict privilege controls, contains broad routing rules, and relies too heavily on human validation.11  
* **Actionable Remediation**:  
  1. Refine subagent description metadata to target specific file paths and triggers.5  
  2. Set up PreToolUse and PostToolUse verification hooks to automate linter and formatter runs.18  
  3. Require agents to capture and output linter logs before declaring completion.20

#### **31 to 40: Production Ready Band**

* **Evaluation Summary**: Clear allowed paths, specialized routing descriptions, robust model selections, and closed test verification loops.12  
* **Actionable Remediation**:  
  1. Calibrate model selections, routing simpler tasks to Haiku to optimize costs.2  
  2. Set up local setting overrides (settings.local.json) to keep credentials off shared version control.19  
  3. Ensure all modifications compile cleanly without warnings.20

#### **41 to 50: Elite Orchestration Band**

* **Evaluation Summary**: Sandbox isolation, minimal tools, path-scoped rules, dynamic models, automated tests, and structured handoff schemas.2  
* **Actionable Remediation**:  
  1. Set up numeric, drop-in managed configurations to deploy overrides across multiple teams.19  
  2. Implement adversarial verification agents to stress-test edits under virtual worktrees.5

## **Operational Directory Topology and Adoption Strategy**

To deploy this architecture across engineering workspaces, developers should implement a structured file layout and a phased rollout plan.2

### **Workspace Directory Layout**

.claude/  
├── agents/                           \# Custom subagent manifests   
│   ├── backend-reviewer.md           \# Read-only API auditor   
│   └── code-improver.md              \# Quality reviewer subagent   
├── commands/                         \# Custom terminal slash commands   
│   ├── deploy-staging.md             \# Automated staging deploy   
│   └── audit-security.md             \# Manual security scan shortcut   
├── hooks/                            \# Deterministic scripts and filters   
│   ├── filter-credentials.py         \# PreToolUse credential scanner   
│   └── format-files.js               \# PostToolUse formatter execution   
├── rules/                            \# Path-scoped context rules   
│   ├── api-routes.md                 \# Rules for src/api/   
│   └── db-schema.md                  \# Rules for src/db/   
├── skills/                           \# Reusable prompt playbooks   
│   ├── api-conventions/              \# Shared team conventions   
│   │   └── SKILL.md                  \# API conventions instructions   
│   └── git-standards/                \# Team commit guidelines   
│       └── SKILL.md                  \# Commit etiquette instructions   
├── settings.json                     \# Shared project-level configurations   
└── settings.local.json               \# Git-ignored local developer overrides 

### **Phased Operational Deployment Roadmap**

      Phase 1                  Phase 2                  Phase 3  
 ──► ──►  
   • Local guidelines       • Register hooks          • Isolated subagents  
   • Workspace excludes     • Declarative commands     • Multi-agent workflows  
   • Verification suites    • Custom skills packages   • Centralized audits

#### **Phase 1: Context Baselining (Weeks 1 to 2\)**

* **Goal**: Establish a clean instruction layer and protect context window efficiency.1  
* **Action Steps**:  
  1. Run /init with the multi-phase option (CLAUDE\_CODE\_NEW\_INIT=1) to discover project pathways and build the starter configuration.1  
  2. Keep the root CLAUDE.md under 200 lines, detailing essential facts and build commands.1  
  3. Move stylistic and path-specific coding rules into .claude/rules/ to enable lazy-loaded context.1  
  4. Set path exclusions in settings files to prevent the agent from reading build outputs or caches.27  
  5. Run /memory inside the active workspace to verify that rules are loaded correctly.1

#### **Phase 2: Extensibility Scaffolding (Weeks 3 to 4\)**

* **Goal**: Automate repetitive developer tasks and set up technical safety boundaries.2  
* **Action Steps**:  
  1. Package common developer workflows (e.g., commit formats, PR structures) into modular skills.20  
  2. Map manual scripts and tasks to custom slash commands in .claude/commands/.22  
  3. Configure PostToolUse hooks to run code formatters and linters automatically after edits.18  
  4. Register PreToolUse hooks to evaluate and block dangerous shell operations.2  
  5. Verify hook integration by running mock terminal queries and confirming they are intercepted.18

#### **Phase 3: Autonomous Multi-Agent Orchestration (Weeks 5 to 6\)**

* **Goal**: Deploy specialized, sandboxed subagents to run tasks with minimal human intervention.12  
* **Action Steps**:  
  1. Deploy read-only reviewers and security auditors to scan components.14  
  2. Enforce least-privilege tool rules, limiting reviewers to read-only tools.2  
  3. Run write subagents within isolated git worktrees (isolation: worktree) to keep workspaces clean.5  
  4. Integrate Model Context Protocol (MCP) servers to connect tasks to databases and APIs.3  
  5. Implement adversarial verifiers to stress-test edits and verify compilation before PR merges.14

## **Resolution of Architectural Discrepancies**

This section compiles five major discrepancies identified within the Claude Code ecosystem, explaining their technical causes and providing concrete workarounds for each.

| Conflicting Area | Documented Promise | Real-World Behavior | Empirical Impact | Cause | Recommended Workaround |
| :---- | :---- | :---- | :---- | :---- | :---- |
| **Bash Permission Rules** | Declaring commands in permissions.allow auto-approves those actions.11 | Bash commands are not reliably auto-approved, triggering manual permission prompts.11 | Interrupts automated runs, requiring manual approval for safe shell operations.11 | Pattern-matching conflicts on shell arguments and path expansions.11 | Use a PreToolUse hook to evaluate paths programmatically and return an allow decision.11 |
| **Self-Edit Protection** | Skipped permission modes auto-approve all file edits within the project.10 | Edits to Claude's own settings and files still trigger manual permission prompts.10 | Blocks automated agents from updating or configuring workspace setting profiles.10 | Hardcoded security limits designed to prevent models from disabling safety rules.10 | Use a PermissionRequest hook to intercept and programmatically approve modifications to config files.10 |
| **Subdirectory Settings** | Subdirectory configurations are merged when paths are added to the session.38 | Settings and hooks are ignored when directories are added via setting paths.38 | Local safety policies and hooks are bypassed when working across multiple paths.38 | The system only loads hooks and settings from the active launch directory.38 | Always start Claude Code sessions directly from the target folder when working with local rules.27 |
| **Cross-Harness Compatibility** | Skills follow the open Agent Skills standard to run across multiple IDE engines.22 | Claude Code only parses its own custom directory layout (.claude/).41 | Forces developers to maintain duplicate rule sets for different development tools.41 | Prioritizing proprietary layouts over general open specifications in early tool iterations.41 | Create a symlink mapping CLAUDE.md to AGENTS.md to share guidelines across tools.42 |
| **MCP Permission Persistence** | Project settings allow pre-approving connected MCP tools.26 | MCP tool approvals do not persist, prompting on every new session.26 | High manual friction, requiring developers to re-approve tools on every startup.26 | Tool permissions are stored in temporary session arrays and cleared on session exit.26 | Use enterprise-managed configuration files (managed-settings.json) to persist tool approvals.26 |

#### **Works cited**

1. How Claude remembers your project \- Claude Code Docs, accessed June 2, 2026, [https://code.claude.com/docs/en/memory](https://code.claude.com/docs/en/memory)  
2. Claude Code: Hooks, Subagents, and Skills — Complete Guide \- OfoxAI, accessed June 2, 2026, [https://ofox.ai/blog/claude-code-hooks-subagents-skills-complete-guide-2026/](https://ofox.ai/blog/claude-code-hooks-subagents-skills-complete-guide-2026/)  
3. Overview \- Claude Code Docs, accessed June 2, 2026, [https://code.claude.com/docs/en/overview](https://code.claude.com/docs/en/overview)  
4. Claude Managed Agents overview \- Claude API Docs, accessed June 2, 2026, [https://platform.claude.com/docs/en/managed-agents/overview](https://platform.claude.com/docs/en/managed-agents/overview)  
5. claude-code-best-practice/CLAUDE.md at main \- GitHub, accessed June 2, 2026, [https://github.com/shanraisshan/claude-code-best-practice/blob/main/CLAUDE.md](https://github.com/shanraisshan/claude-code-best-practice/blob/main/CLAUDE.md)  
6. Create custom subagents \- Claude Code Docs, accessed June 2, 2026, [https://code.claude.com/docs/en/sub-agents](https://code.claude.com/docs/en/sub-agents)  
7. The Complete Guide to Building Skills for Claude | Anthropic, accessed June 2, 2026, [https://resources.anthropic.com/hubfs/The-Complete-Guide-to-Building-Skill-for-Claude.pdf](https://resources.anthropic.com/hubfs/The-Complete-Guide-to-Building-Skill-for-Claude.pdf)  
8. claude-skills/CLAUDE.md at main · alirezarezvani/claude-skills \- GitHub, accessed June 2, 2026, [https://github.com/alirezarezvani/claude-skills/blob/main/CLAUDE.md](https://github.com/alirezarezvani/claude-skills/blob/main/CLAUDE.md)  
9. GitHub \- alirezarezvani/claude-skills: 337 Claude Code skills & agent skills & plugins (30+ Agents, 70+ custom commands, 330+ skills, customizable references, scripts)for Claude Code, Codex, Gemini CLI, Cursor, and 8 more coding agents — engineering, marketing, product, compliance, C-level advisory, research, business operations, commercial & finance, and your daily productivity skills., accessed June 2, 2026, [https://github.com/alirezarezvani/claude-skills](https://github.com/alirezarezvani/claude-skills)  
10. Bypass permissions mode still prompts for edits to \~/.claude/settings.json · Issue \#37029 · anthropics/claude-code \- GitHub, accessed June 2, 2026, [https://github.com/anthropics/claude-code/issues/37029](https://github.com/anthropics/claude-code/issues/37029)  
11. \[BUG\] Bash permissions in settings.json not enforced \- requires custom hook workaround · Issue \#18846 · anthropics/claude-code \- GitHub, accessed June 2, 2026, [https://github.com/anthropics/claude-code/issues/18846](https://github.com/anthropics/claude-code/issues/18846)  
12. \[FEATURE\] Allow custom .claude/agents/ definitions as agent team teammates · Issue \#24316 · anthropics/claude-code \- GitHub, accessed June 2, 2026, [https://github.com/anthropics/claude-code/issues/24316](https://github.com/anthropics/claude-code/issues/24316)  
13. CONTRIBUTING.md \- alirezarezvani/claude-skills \- GitHub, accessed June 2, 2026, [https://github.com/alirezarezvani/claude-skills/blob/main/CONTRIBUTING.md](https://github.com/alirezarezvani/claude-skills/blob/main/CONTRIBUTING.md)  
14. claude-code-best-practice/best-practice/claude-subagents.md at main \- GitHub, accessed June 2, 2026, [https://github.com/shanraisshan/claude-code-best-practice/blob/main/best-practice/claude-subagents.md](https://github.com/shanraisshan/claude-code-best-practice/blob/main/best-practice/claude-subagents.md)  
15. claude-code-best-practice-zh/TRANSLATION\_CRON\_REPORT\_2026-04-14.md at main, accessed June 2, 2026, [https://github.com/Rito-w/claude-code-best-practice-zh/blob/main/TRANSLATION\_CRON\_REPORT\_2026-04-14.md](https://github.com/Rito-w/claude-code-best-practice-zh/blob/main/TRANSLATION_CRON_REPORT_2026-04-14.md)  
16. arian88/claude-agents: Claude Code Agents \- GitHub, accessed June 2, 2026, [https://github.com/arian88/claude-agents](https://github.com/arian88/claude-agents)  
17. awesome-claude-code-subagents/CLAUDE.md at main \- GitHub, accessed June 2, 2026, [https://github.com/VoltAgent/awesome-claude-code-subagents/blob/main/CLAUDE.md](https://github.com/VoltAgent/awesome-claude-code-subagents/blob/main/CLAUDE.md)  
18. Automate actions with hooks \- Claude Code Docs, accessed June 2, 2026, [https://code.claude.com/docs/en/hooks-guide](https://code.claude.com/docs/en/hooks-guide)  
19. Claude Code settings \- Claude Code Docs, accessed June 2, 2026, [https://code.claude.com/docs/en/settings](https://code.claude.com/docs/en/settings)  
20. Best practices for Claude Code \- Claude Code Docs, accessed June 2, 2026, [https://code.claude.com/docs/en/best-practices](https://code.claude.com/docs/en/best-practices)  
21. The Complete Claude Code Power User Guide: Slash Commands, Hooks, Skills & More, accessed June 2, 2026, [https://medium.com/@neonmaxima/the-complete-claude-code-power-user-guide-slash-commands-hooks-skills-more-6a3de2d841cc](https://medium.com/@neonmaxima/the-complete-claude-code-power-user-guide-slash-commands-hooks-skills-more-6a3de2d841cc)  
22. Extend Claude with skills \- Claude Code Docs, accessed June 2, 2026, [https://code.claude.com/docs/en/skills](https://code.claude.com/docs/en/skills)  
23. Hooks reference \- Claude Code Docs, accessed June 2, 2026, [https://code.claude.com/docs/en/hooks](https://code.claude.com/docs/en/hooks)  
24. Claude Code | Anthropic's agentic coding system, accessed June 2, 2026, [https://www.anthropic.com/product/claude-code](https://www.anthropic.com/product/claude-code)  
25. What to include in CLAUDE.md... and what not? : r/ClaudeCode \- Reddit, accessed June 2, 2026, [https://www.reddit.com/r/ClaudeCode/comments/1rohbj0/what\_to\_include\_in\_claudemd\_and\_what\_not/](https://www.reddit.com/r/ClaudeCode/comments/1rohbj0/what_to_include_in_claudemd_and_what_not/)  
26. Claude Code Desktop should honor managed-settings.json for all permissions \#30953, accessed June 2, 2026, [https://github.com/anthropics/claude-code/issues/30953](https://github.com/anthropics/claude-code/issues/30953)  
27. Set up Claude Code in a monorepo or large codebase, accessed June 2, 2026, [https://code.claude.com/docs/en/large-codebases](https://code.claude.com/docs/en/large-codebases)  
28. Intro to Claude \- Claude API Docs, accessed June 2, 2026, [https://platform.claude.com/docs/en/intro](https://platform.claude.com/docs/en/intro)  
29. Writing Your Own Skill · alirezarezvani/claude-skills Wiki · GitHub, accessed June 2, 2026, [https://github.com/alirezarezvani/claude-skills/wiki/Writing-Your-Own-Skill](https://github.com/alirezarezvani/claude-skills/wiki/Writing-Your-Own-Skill)  
30. How we contain Claude across products \- Anthropic, accessed June 2, 2026, [https://www.anthropic.com/engineering/how-we-contain-claude](https://www.anthropic.com/engineering/how-we-contain-claude)  
31. Releases · alirezarezvani/claude-skills \- GitHub, accessed June 2, 2026, [https://github.com/alirezarezvani/claude-skills/releases](https://github.com/alirezarezvani/claude-skills/releases)  
32. Audit candidate: shanraisshan/claude-code-best-practice · Issue \#89 · xiaolai/nlpm \- GitHub, accessed June 2, 2026, [https://github.com/xiaolai/nlpm/issues/89](https://github.com/xiaolai/nlpm/issues/89)  
33. 10 Must-Have Skills for Claude (and Any Coding Agent) in 2026 | by unicodeveloper, accessed June 2, 2026, [https://medium.com/@unicodeveloper/10-must-have-skills-for-claude-and-any-coding-agent-in-2026-b5451b013051](https://medium.com/@unicodeveloper/10-must-have-skills-for-claude-and-any-coding-agent-in-2026-b5451b013051)  
34. Configure server-managed settings \- Claude Code Docs, accessed June 2, 2026, [https://code.claude.com/docs/en/server-managed-settings](https://code.claude.com/docs/en/server-managed-settings)  
35. Custom commands and skills \- Tips | SFEIR Institute, accessed June 2, 2026, [https://institute.sfeir.com/en/claude-code/claude-code-custom-commands-and-skills/tips/](https://institute.sfeir.com/en/claude-code/claude-code-custom-commands-and-skills/tips/)  
36. Use Claude Code features in the SDK, accessed June 2, 2026, [https://code.claude.com/docs/en/agent-sdk/claude-code-features](https://code.claude.com/docs/en/agent-sdk/claude-code-features)  
37. Agent SDK overview \- Claude Code Docs, accessed June 2, 2026, [https://code.claude.com/docs/en/agent-sdk/overview](https://code.claude.com/docs/en/agent-sdk/overview)  
38. \[FEATURE\] Load .claude/settings\*.json and hooks from directories added via \--add-dir / additionalDirectories · Issue \#52934 · anthropics/claude-code \- GitHub, accessed June 2, 2026, [https://github.com/anthropics/claude-code/issues/52934](https://github.com/anthropics/claude-code/issues/52934)  
39. Debug your configuration \- Claude Code Docs, accessed June 2, 2026, [https://code.claude.com/docs/en/debug-your-config](https://code.claude.com/docs/en/debug-your-config)  
40. \[BUG\] Claude is ignoring allow permissions in global settings.json \#18160 \- GitHub, accessed June 2, 2026, [https://github.com/anthropics/claude-code/issues/18160](https://github.com/anthropics/claude-code/issues/18160)  
41. Support for AGENTS.md and .agents/skills/, the community has been asking since August 2025 · Issue \#31005 · anthropics/claude-code \- GitHub, accessed June 2, 2026, [https://github.com/anthropics/claude-code/issues/31005](https://github.com/anthropics/claude-code/issues/31005)  
42. agents/docs/harnesses.md at main · wshobson/agents \- GitHub, accessed June 2, 2026, [https://github.com/wshobson/agents/blob/main/docs/harnesses.md](https://github.com/wshobson/agents/blob/main/docs/harnesses.md)

[image1]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAmwAAAAxCAYAAABnGvUlAAAFmklEQVR4Xu3cW6i0VRkH8BVlVEYHjawsSsugAx0w6yr0IoskJfRGDEqQ1G46QoYHkCgwIozSDlBEQYVgaaQR2sVGItTEbpTAkCyioIvuDCGi1r/1LmZ9bzPb2d+evff37e/3g4f9rjWzZ9asPbCe/axZUwoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADsqWfWeMa8kwPz/BrPmXcCACeuk2p8cd55HHltjQ/WeOHUPmO47Xj16hq3zzsB4LD6fY1zp+v317hlun5FjWun62PB92u8d2in2vXPoR0X1Dhl1rcJvy3/n+SkwrNV4w2z/mNJxva7oZ3E87ZyMH/X59b4RY3Tpvavarx5ur6sxh+m653Ie+CaeScAHDYvKS3xiJNLW0TPXNxczhmuD1oW5ouH9rtq/Gdon1/j00N7U06v8Z55Z3VROfL598vZNb4+71zikRqPzztL+/1Xzjs3IGPKY6/y0dLmrBvnLu+5rwztnUgy/aF5JwAcJm8crrNo/q0sErh46XB90K4qi2pKqjXfKkcu+reWvRlvkrVlCU62SI/VhC2Vp4xtWfUpv78Xn/1aJ2E7dWiPc/f6GpcM7Z34To0fzjsB4LDarwTklzX+vE3csLjrES4sbXGOb5S2+PfxJqEaE81Nylbss+adpSW3qUjut3UStlSy7i57k5it8nQJ2yj/HGzNO49S3hd/mncCwGG1VVoSshtfqPG8Gj8o6y/e68rjJXmKfIA+krClmnT91F7Hy7eJZadA+3PO5bl3exBh3W3AJKd9jO+r8d2hnZhLZW27seW2JDqjD5flr3874xgypoytt8dq2lwSyu3GtxN5Hbt93wLAcWMTCUiXateqhG1MPpbFixZ3PUKqMvfV+OrQ92SNm2q8aejbtGUJW15fkoTx836jm+cdkyREu53jdSps+UzXsu3Q9GdrOeYJ2yrr3m/dCls/rLFq7lbJYYVlVVQVNgBOGKsSkL4FmUpQPjeW7cxIhSvJx2OlLaTZGkwi1j9LtF3CdrTyPH+t8bqhLwv1q4Z25OsezqpxXlmcSNyNJDg5nDGaV4jyWjMf/dBDT/JykCN9ue2K0ublzum2uKu0ef1ZaduXdwy3rbJOwpbn+1eNy4e+t5Q2N92PSjs1+mBp89QPdPRTwv2AwKYTtmWHNdKXqmzG/Zmpb6u0+epzksdelrDlxGu2fwHg0EqSkCQoC2ji32WxYEa+tytfpdETkCQvWeQ/MbVz/Y7STuqlOtbvtxcJWx5zXjV6YtaOH08/N/X5rbyO8as7Pl8W8/WXqe+M0hKMF0ztsSqXZChJT8Y+T9hy/dYajw59T2edhC0+XuOpGp8tLaEeK5PR53KrtL9dT8xurPHt0k7hxqYStneXdmq1z90/yuIwx+1lMZ68l15cFglbn8tVCdv4uwBwwski3hfgLJqpFqUCksX/7VN/Xyh/U9opv71M2NZ1/3C9bIE/Gvn+sFTCVumvNRXGnrj2OUg7kuj1hO286bZc52Trw9N9tnuOLo/3gXnnUViVsF03/ewVt/Sv87fMmPpr3amMpVf2UtXNIY+tstg+jZ6wXT21u3yvXP5xAIATUhbB75W2lZeEop+U/HlZJBYP1PhIjXtr/KTGH2u8s7RtqntqvG263376VI1LS9vGTYK5Cdm6PH/eOUgykXlKspN5+nVplcpUKL9c42OlVdEynowr26TZZv17jdeU9n13V9b4UtkfqZQ+VNoX1uZzgKmo5e+V/nw9Subvm9N9f1rjk9P1Xsk/A18r7XleNvVlm/jy0r7YOe+jJLafK21s3amlvd8AAP4n26LPnndyYLJVnyQXAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOMz+CznGyF6SHlkUAAAAAElFTkSuQmCC>

[image2]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABsAAAAaCAYAAABGiCfwAAABm0lEQVR4Xu2UPyhFYRjGH2EQiz+JIrdISRmw2hgMFqWI3cBg8ycxIFKKQRapO7HJLm4ZDAa7MphMRoMFz+M9X77zOfde93YN6v7q1+187znf+57vfe8ByvxHmugt/fB8pgO0jd4HsQfa/fUkMBPELmhtFMvJIuyB+TBAVmCx8TBA+ugVTQXrOZmGbaikIS6Z7vGpoKt0JFjPyxhsQ23sk6KPSC6kl+7S6mA9L8P0naa9NVW+SffxM1kV3YYlLBgNxCviybS2A+uVkvmxIboMK6hgXLJL2ETpaA5olxdzyeroEW2PrgumlT7RDGwzNX0hioWFaFBmo1hRuGR3sLc5oc1RrIe+wArppIewgoqmHpZICdfphBdzhdzQNRQx6iGqNAObyDNa48VcMg3JKbKPutYn6Tndoy3x8DfqhXryBps0H1eI+qb+JaFEOt4p2CdQn7nR2B0BmrZj2H/IxyXbQPZR1xtdw+6tpI3Rb1ZUtapKop82hIseKnQrXPwrdCJz3rX61eFdl5RB2GDoOPVZW0J8yErOr3pVpkwin1neUOOICsL0AAAAAElFTkSuQmCC>

[image3]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAC0AAAAaCAYAAAAjZdWPAAACBElEQVR4Xu2WTyh0YRTGj/yJ/IsFCcUXeyXZWCDZyJ5kQyKfIjZKSmFhobDAgiQpC98XWSgLKQsLJdmLlQVlxUrheTrvNe+8zTA34qb71K+5c86ZO+c97/PeGZFQoX632sE9eLF4AH12URCVBNbAM2hycoFVHjgF16A4OhVcVYNHsA1SnFxg1SHq5WE3EVR5fn4CdU4usPL8fAkKnVxg9Z1+zgVToMpN+JUfP9NKf0GWm4ijGtBgvS8Bh6DRivmWXz/TPsuSeNMDoNUNflbxns+poAtMg1UwDv6ITulOdKHdprYWLIB5MAEyRW3WL2q7A5MrE/3MjkR+wDJM3ZaJN5v4u4rnZ8YXRXeCC/Oswzhvbk+ak18x15zsrJVbl+hJ836bJsbrOTBprvm5DZD8Vu2oE9xI9P+NW4lMr1x0+kdgEOSYeKymKR4wTmlGtFFPbtN2jFa7kMRsmZA49VLQC47BruhW2k1XitpoBPwTXSibidV0PihwYkWiTfOwfonYHHeDyhbdUn6J3TT/BVaAcxOn+CRiU3ylt70Gma83NV6MQ9gTtRRFizSANPPet/glvCHtQj+PiU6f0+JhHAVtopNeksjBpD/PRA8w63vAfzAk+rhjzRU4EX1Wl4F90d3iYW+RT4iHgSvnRNNj5Dh9W6xzfe6JE+fi3hPPxEc1oUKF+mm9AowuX9l0BrOXAAAAAElFTkSuQmCC>

[image4]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACcAAAAaCAYAAAA0R0VGAAACFklEQVR4Xu3WTUgVURjG8TcsSCwjgigwuqlBltGiRRAGFSG2iIJaCSHUIqFFmEjf4aZdEbUoiIoSElokRkXQSlJq4cZFUNTClChoGRJhoP0f3jN+nK7XiWxcdB/44dw5Z/CdOR8zZsX8h1mCnTiEGpSE82WoCMeZZyNeYwQPcRIdeIFNeI49E70zyiKcxyhOo3R6s+3AN3yyjJ+cCruJnzgYtSVZjGeBjjNLM8ZxBguitqm5j7PxyX+ZanzGB6yJ2uLctoznW7v5U7sUnc+XZeZTIJNou+jBmGX8RNJkNYbwBZVR20zZgLfmN6Wbi6OVfCX8/askxYmOC0WLZns43opuy1/cFvSab9wzZSmOxyfjLEe/zV7cCtzFyvC7UHFpUour8cl80RBozjXEDSHaWvSWmLr/qbgnqEcnLpsvFu1/bejCZvPFc8R8sd3BBWzDGwziFvZagazFe7zEqqhNb4mLaLHp+5+KG0Zd+K0tRjegaMiehj5yw/xajVLSZ5/5npkqObzCd9xDE66Zz53d9vvGrH86YJNT4VSgaKg15OqzDh/NF88JlIc+f1ScogJyOBBU2eSXSJy0xS0039iPmd/oY/PRSIpT+3q/bO6Stjg5HM5ruB+YX5MUp77aBeYsOTzCD1xHI94F+83fvV9DHxWhhXPUfL6dM39a2mb60IpdNk/RtNB00ROKv2S0kvXhWkwxxcyWX6+LW620WhIQAAAAAElFTkSuQmCC>

[image5]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACIAAAAaCAYAAADSbo4CAAABnUlEQVR4Xu2WzysFURTHj7Ag8qtILGSh2EiyUyQLykpZsZSNKDbyBygWSn7slKQUEUUWNv4AJVmwkJKNnYUopfD9du7kurxmxrum1Hzq05t7Zubd8+49c+aJpKREowvewLuIduttfsmBy3AL1pkxWYVvsMeMc2EHvIVtJuaVKrgNK61YGTwVnbTGihfBDVhrxbzBZZ5wYs3wEe7APCvOBBdhsRXzxgBscGKD8B1OOfEKOCKf2/fnsD5eYbt7Ikky1UfitMJn+V4fiZOpPrKFDwV/ZCRYhGvivz74vTMSI5Eo9dEEF0Sb4DgsEG2EHB+K9qNe0QY5bM7PwRe4B2dhqYQQVh8t8Ej0MSZDcEX0WnbbC1gtugKcPNheNsJ9CVkR9pAz+CBaG4FP8Eq+3szlXbfGPHcJ683xuWgihEnESiQO7C9uItew0RxHSYRbV27iv6YfHojuO+EL8Vh0IjuRoOh/SqTTfGZFPpwWLUy2+l3R1SCcbBOOwVF4Au9hn2hi83AJTpprvcCEStyggXGeLxT962DDl6UbS0n5X3wARWRR0ojnt+0AAAAASUVORK5CYII=>