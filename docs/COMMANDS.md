# Axion Protocol — Command Reference & Task Recipes

> **The Local Governance Manual**: Exhaustive specification of the 12 Core Governance Commands, operational triggers, and calibrated recipes for agent workflows.

---

## Task Recipes (Recommended Combinations)

To maximize cognitive density, reduce token burn, and mitigate agent cognitive drift, use these calibrated command workflows:

| Objective | Recommended Recipe | Operational Behavior |
| :--- | :--- | :--- |
| **Architectural Decisions & Strategy** | `/drive /premortem` | Performs a 6-month pre-mortem failure simulation (`/premortem`) and executes verified changes (`/drive`). |
| **Fast Atomic Fixes (1–2 files)** | `/drive` | Operates in *Fast-Loop* mode: resolves changes in a single turn with zero micro-interruptions and runs targeted tests rapidly. |
| **Systematic Bug Debugging** | `/debug /verify` | 4-phase root cause analysis without guessing, verified deterministically against real exit codes. |
| **Ambiguous Requirements Clarification** | `/clarify` | Socratic gate: prompts exactly 2 plain A/B/C questions without technical jargon before writing any code. |
| **Disaster Recovery & Instant Rollback** | `/snapshot` | Restores verified SHA-256 tree checkpoints immediately and atomically from natural language prompts (*"undo what you did"*). |
| **Multi-Lens Quality Audit** | `/review` | Contextual 4-lens audit (Technical, Functional, UX/Product, Architecture) eliminating cosmetic noise. |
| **Cryptographic Release Attestation** | `/attest` | Generates in-toto Statement v1 DSSE envelopes signed with Ed25519 for local audit trails. |

---

## The 12 Core Governance Commands

### 1. `/drive` — Autonomous Meta-Orchestrator
- **Purpose**: Autonomous execution in a closed loop. Manages adaptive deliberation (*Fast-Loop* for atomic tasks vs. *Deep-Loop* for structural refactors).
- **Execution**: Runs structured sub-agents and tool calls until `tests/run_all.js` exits with code 0.
- **Reporting**: Emits a deterministic 3-line executive report (`[Acción Cumplida]`, `[Métricas]`, `[Próximo Vector]`).

### 2. `/clarify` — Socratic Intent Gate
- **Purpose**: Prevents premature implementation on underspecified requirements.
- **Rules**: Exactly 2 human questions with A/B/C options. No technical jargon. Compatible with voice dictation.

### 3. `/debug` — Systematic 4-Phase Debugger
- **Purpose**: Root-cause debugging without blind patching.
- **Phases**: 1) Hypothesis formulation, 2) Minimal reproducible test case, 3) Targeted fix, 4) Real execution verification.

### 4. `/premortem` — Adversarial Failure Simulation
- **Purpose**: Conducts a 6-month adversarial failure autopsy and blast-radius calculation before modifying critical modules.
- **Verdict**: ALLOW, NEEDS_HUMAN_REVIEW, or DENY.

### 5. `/preflight` — Fail-Closed Terminal Classifier
- **Purpose**: Inspects and classifies every terminal command before execution via lexical parsing and risk matrices.
- **Safety**: Rejects destructive mutations and unverified shell executions.

### 6. `/snapshot` — SHA-256 Checkpoint & Rollback
- **Purpose**: Atomic tree preservation and semantic rollback independent of Git.
- **Quota**: Automatically manages checkpoint retention (quota: 3) to prevent disk bloating.

### 7. `/verify` — Deterministic Execution Verifier
- **Purpose**: Prohibits visual-inspection claims. Demands real test execution with exit code 0.
- **Fast Mode**: `node tools/verify_changes.js --fast` executes only impacted suites rapidly and targetedly.

### 8. `/review` — Selective 4-Lens Auditor
- **Purpose**: Inspects code diffs through 4 lenses: Technical, Functional, UX/Product, and Architecture.
- **Efficiency**: Actively discards irrelevant lenses to prevent reading fatigue.

### 9. `/memory` — Persistent Fractal Memory
- **Purpose**: Anti-drift project memory indexed in 4 strict tiers (`limite`, `correccion`, `decision`, `convencion`).
- **Anchoring**: Injects < 150 token anchor into context to prevent amnesia in long sessions.

### 10. `/profile` — User Calibration Engine
- **Purpose**: Calibrates and persists the user profile across 5 dimensions (Technical Depth, Input Method, Environment, Cadence, Creative Autonomy).

### 11. `/halt` — Emergency Killswitch
- **Purpose**: Immediate fail-closed execution freeze (`.axion/HALT`). Intercepts all tool use until explicitly resumed.

### 12. `/attest` — Cryptographic DSSE Attestor
- **Purpose**: Issues and verifies cryptographic in-toto provenance statements in DSSE envelopes with Ed25519 signatures.

---

## CLI & Platform Parity

The **12 canonical governance commands** are prompts/skills, not CLI subcommands. Their
availability per surface is:

1. **Google Antigravity**: Mounted as native skills in `.agents/skills/<command>/SKILL.md`.
2. **Anthropic Claude Code**: Mounted as slash commands in `.claude/commands/<command>.md`.
3. **OpenCode / Codex / Copilot**: `.opencode/commands/<command>.md` plus the `command`
   registration in the root `opencode.json`, and the `AGENTS.md` directives respectively.

**10 of the 12 have a CLI subcommand** in `node bin/axion.js <command>`: `drive`,
`clarify`, `premortem`, `preflight`, `snapshot`, `verify`, `memory`, `profile`, `halt` and
`attest`. **`/debug` and `/review` are prompt-only**: they describe an agent procedure and
have no standalone CLI entry.

---

## Core Commands vs. Internal Tools

The **12 Core Governance Commands** above represent the canonical user-facing contract of Axion Protocol across agent harnesses. Additional utilities in `tools/` (preflight classifiers, SQLite snapshot indexers, bundle compiler, health checks, etc.) operate as internal infrastructure engines invoked by `/drive`, `/verify`, or automated test suites.
