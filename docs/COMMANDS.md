# Axion Protocol — Command Reference & Task Recipes

> **The Sovereign Governance Manual**: Exhaustive specification of the 12 Core Governance Commands, operational triggers, and high-efficiency command combinations.

---

## Task Recipes (Recommended Combinations)

To maximize cognitive density, reduce token burn, and eliminate AI hallucinations, use these calibrated command workflows:

| Objective | Recommended Recipe | Operational Behavior |
| :--- | :--- | :--- |
| **Architectural Decisions & Strategy** | `/drive /premortem /critic` | Expands vision 10x (`/critic`), performs a 6-month pre-mortem failure simulation (`/premortem`), and executes verified code (`/drive`). |
| **Fast Atomic Fixes (1–2 files)** | `/drive` | Operates in *Fast-Loop* mode: resolves changes in a single turn with zero micro-interruptions and runs tests in `< 300ms`. |
| **Systematic Bug Debugging** | `/debug /verify` | 4-phase root cause analysis without guessing, verified deterministically against real exit codes. |
| **Ambiguous Requirements Clarification** | `/clarify` | Socratic gate: prompts exactly 2 plain A/B/C questions without technical jargon before writing any code. |
| **Disaster Recovery & Instant Rollback** | `/snapshot` | Restores verified SHA-256 tree checkpoints in `< 5ms` from natural language prompts (*"undo what you did"*). |
| **Multi-Lens Quality Audit** | `/review` | Contextual 4-lens audit (Technical, Functional, UX/Product, Architecture) eliminating cosmetic noise. |
| **Cryptographic Release Attestation** | `/attest` | Generates in-toto Statement v1 DSSE envelopes signed with Ed25519 (SLSA Level 3 compatible). |

---

## The 12 Core Governance Commands

### 1. `/drive` — Autonomous Meta-Orchestrator
- **Purpose**: Autonomous execution in a closed loop. Manages adaptive deliberation (*Fast-Loop* for atomic tasks vs. *Deep-Loop* for structural refactors).
- **Execution**: Runs structured sub-agents and tool calls until `tests/run_all.js` exits with code 0.
- **Reporting**: Emits a deterministic 3-line executive report (`[Acción Cumplida]`, `[Métricas]`, `[Próximo Vector]`).

### 2. `/clarify` — Socratic Intent Gate
- **Purpose**: Prevents premature implementation on underspecified requirements.
- **Rules**: Exactly 2 human questions with A/B/C options. No technical jargon. Compatible with voice dictation.

### 3. `/critic` — Asymptotic Excellence Lens
- **Purpose**: Universal polymorphic evaluator across the 7 Sovereign Maturity Frontiers.
- **Evaluation**: Computes Asymptotic Maturity Rate (AMR) and Day 1 Unrealized Horizon using the 3-Step Ladder.

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
- **Fast Mode**: `node tools/verify_changes.js --fast` executes only impacted suites in `< 300ms`.

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
- **Purpose**: Issues and verifies cryptographic in-toto provenance statements with Ed25519 signatures and Merkle inclusion proofs.

---

## CLI & Platform Parity

All 12 commands are accessible across three environments:
1. **Google Antigravity**: Mounted as native skills in `.agents/skills/<command>/SKILL.md`.
2. **Anthropic Claude Code**: Mounted as slash commands in `.claude/commands/<command>.md`.
3. **Unified CLI**: Accessible via `npx axion <command>` or `node bin/axion.js <command>`.
