# Axion Protocol

> **Experimental Local Governance Tools for Agent Workflows.**
> *Local governance tools to structure and constrain autonomous AI agent workflows.*
>
> **Status**: EXPERIMENTAL runtime. Enforcement does not intercept arbitrary OS-level shell commands automatically without the integrated agent hook. Requires **Node.js 22.13** or later. Zero external npm dependencies.

[![CI Status](https://img.shields.io/badge/CI-243%20Suites-informational.svg?style=flat-square)](https://github.com/Acourd/axion-protocol/actions)
[![Version](https://img.shields.io/badge/Version-v1.4.0--beta.1-0969da.svg?style=flat-square)](package.json)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg?style=flat-square)](LICENSE)
[![Zero Dependencies](https://img.shields.io/badge/Dependencies-0-success.svg?style=flat-square)](package.json)

---

## The Core Problem in Autonomous AI Coding

Autonomous coding assistants (**Claude Code, Google Antigravity, Cursor, Codex**) are transforming software delivery. However, when operating autonomously, non-technical creators and enterprise teams face four severe systemic risks:

1. **Reckless Hallucinations & Vibecoding**: AI models making blind assumptions on ambiguous requirements, inventing APIs, and refactoring mission-critical subsystems without human alignment.
2. **Destructive Terminal Operations**: Accidental filesystem corruption, port collisions, unauthorized secret exposure, and unverified database operations.
3. **Context Rot & Token Waste**: Thousands of dollars wasted in runaway reasoning loops, repetitive conversational turns, and massive context degradation.
4. **Zero Cryptographic Auditability**: Inability to mathematically prove what tests actually ran, who approved mutations, and whether the code supply chain was compromised.

**Axion Protocol helps structure these workflows locally.** It provides lightweight governance tools (**zero external npm dependencies**) to introduce deliberate checkpoints and boundaries in supported agent environments.

---

## Value Propositions

- **Socratic Intent Gate (`/clarify`)**: Forces the agent to ask exactly 2 plain A/B/C human questions before touching code on ambiguous requests, designed to mitigate blind guessing.
- **Terminal Preflight Check (`/preflight`)**: Inspects and classifies terminal commands (`ALLOW` / `NEEDS_HUMAN_REVIEW` / `DENY`) using lexical analysis and structured execution (`shell: false`).
- **Deterministic Rollback (`/snapshot`)**: Restores SHA-256 tree snapshots from natural language prompts (*"undo what you did"*), independent of Git.
- **Incremental Runner (`tools/smart_incremental_runner.js`)**: Analyzes static inverse dependency ASTs to execute only impacted test suites.
- **Pre-Flight TDD Synthesizer (`tools/preflight_tdd_synthesizer.js`)**: Derives formal assertion contracts before disk mutations to reduce trial-and-error iterations.
- **Provenance & Local Attestations (`/attest`)**: Generates local DSSE/in-toto Statement v1 envelopes signed with Ed25519.
- **Multi-Platform Consistency**: Unified governance designed to operate consistently across included integrations (**Google Antigravity**, **Anthropic Claude Code**) and the standalone CLI.

---

## 7-Phase Unified Lifecycle Architecture

```text
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  1. INTENT   │ ──► │ 2. PREMORTEM │ ──► │  3. PREFLIGHT│ ──► │ 4. EXECUTION │
│  (/clarify)  │     │  (/premortem)│     │ (/preflight) │     │   (/drive)   │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
                                                                      │
┌──────────────┐     ┌──────────────┐     ┌──────────────┐            ▼
│ 7. ATTEST    │ ◄── │  6. AUDIT    │ ◄── │  5. VERIFY   │ ◄──────────┘
│  (/attest)   │     │  (/review)   │     │  (/verify)   │
└──────────────┘     └──────────────┘     └──────────────┘
```

---

## Quickstart (Under 30 Seconds)

### 1. Interactive Demo (No Installation Required)

Experience terminal command classification and deterministic rollback in an in-memory demonstration (no disk writes):

```bash
# Run the live interactive terminal demo
node bin/axion.js demo

# Run the competitive benchmark suite
node bin/axion.js benchmark
```

### 2. Source Installation for Public Beta (GitHub)

During this preparation phase, Axion Protocol is consumed directly from source (NPM registry distribution is intentionally locked):

```bash
# Clone the repository
git clone https://github.com/Acourd/axion-protocol.git
cd axion-protocol

# Initialize governance in a target workspace
node bin/axion.js init --target /path/to/target-workspace

# Or register user-level slash commands for your agent environment
node bin/axion.js init --user
```

*(The installer compares SHA-256 hashes to automatically back up pre-existing files if they differ before writing).*

### 3. Verify Health & Governance State

```bash
# Audit the project workspace from the cloned CLI
node bin/axion.js check --target /path/to/target-workspace
```

Output:
```text
[Axion Health Check] Auditando proyecto...
  ✓ PASS   Motor Node.js: v24.x (requiere >= 22.13.0)
  ✓ PASS   Hook PreToolUse: ejercitado en vivo (bloquea destructivos)
  ✓ PASS   Slash Commands: 12/12 en .agents/skills · 12/12 en .claude/commands
  ✓ PASS   Killswitch: RUNNING — sin parada activa

[Axion Protocol v1.4.0-beta.1] 13/13 comprobaciones en verde. Gobernanza operativa.
```

---

## Governance Commands & Recipes

Axion Protocol provides 12 core slash commands designed to work in synergy. For full documentation, operational triggers, and recommended workflows (e.g., `/drive /premortem /debug`), consult the dedicated manual:

**[Explore the Complete Command Reference & Recipes Manual ->](docs/COMMANDS.md)**

| Command | Category | Core Objective |
| :--- | :--- | :--- |
| `/drive` | Autonomous Execution | Meta-orchestrator in closed-loop with *Fast-Loop* vs. *Deep-Loop* bifurcation. |
| `/clarify` | Socratic Intent Gate | 2 structured A/B/C human questions without technical jargon. |
| `/debug` | Systematic Debugging | 4-phase root-cause debugging cycle verified by physical evidence. |
| `/premortem` | Failure Simulation | 6-month adversarial failure autopsy and blast-radius boundary calculation. |
| `/preflight` | Terminal Security | Structured pre-execution command classifier (`shell: false`). |
| `/snapshot` | State Recovery | Deterministic SHA-256 tree checkpoints and natural language rollback. |
| `/verify` | Deterministic Truth | Real test execution requiring exit code 0; supports `--fast` incremental testing. |
| `/review` | Multi-Lens Audit | Selective code inspection via 4 lenses (Technical, Functional, UX, Architecture). |
| `/memory` | Persistent Memory | 4-tier fractal memory (< 150 token anchor) preventing cross-session drift. |
| `/profile` | Human Calibration | Calibrates user profile across 5 operational dimensions (Voice, IDE, Cadence). |
| `/halt` | Emergency Killswitch | Operational freeze via local lockfile (`.axion/HALT`). |
| `/attest` | Cryptography | in-toto Statement v1 DSSE envelopes signed with Ed25519. |

---

## Test Verification & Deterministic Invariants

Axion Protocol includes **243 deterministic test suites** that run concurrently with zero external test runners:

```bash
# Run the complete test suite across all 5 domains
npm test
```

### Coverage by Domain

| Domain Pillar | Core Responsibilities | Test Suites |
| :--- | :--- | :---: |
| 🛡️ **Governance & Preflight** | PreToolUse hooks, lexical preflight, killswitch, risk policy compiler, structured commands, workflow state machine, drive engine | 147 |
| 🔐 **Cryptography & Attestation** | DSSE/PAE envelopes, RFC 8785 canonical JSON, in-toto Statement v1, Ed25519 signatures, evidence binding, revocation | 32 |
| 🧭 **Intent & Socratic UX** | 2-question clarifier, A/B/C contracts, SHA-256 intent sealing, profile calibration, interactive wizard, deep reasoning | 23 |
| 💾 **State, Checkpoints & Recovery** | Atomic snapshots, rollback plan validation, memory guard limits, context shield anchoring, evidence hasher, governance drift detection | 23 |
| ⚡ **Adversarial Resilience** | Mutation vectors, pre-mortem verdict derivation, VibeGuard lexical gate, boilerplate detection, fuzzer burst resilience | 18 |

**Total: 243 suites** across the 5 governance domains. CI publishes the verified result.

Public end-to-end verification route (keygen → run attest → verify subject Merkle):
[`docs/VERIFICATION_PATH.md`](docs/VERIFICATION_PATH.md).

---

## License & Author

Distributed under the **Apache-2.0 License**. See [LICENSE](LICENSE) for details.  
Created and maintained by **Adria** ([@Acourd](https://github.com/Acourd)).
