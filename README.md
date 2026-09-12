# Axion Protocol

> **The Sovereign Governance Harness & Deterministic Safety Engine for Autonomous AI Agents.**  
> *Transform unpredictable AI agent workflows into verifiable, fail-closed, production-grade software engineering.*
>
> **Status**: EXPERIMENTAL runtime. Enforcement does not intercept arbitrary OS-level shell commands automatically without the integrated agent hook. Requires **Node.js 22.13** or later. Zero external npm dependencies.

[![CI Status](https://img.shields.io/badge/CI-233%20Suites-informational.svg?style=flat-square)](https://github.com/Acourd/axion-protocol/actions)
[![Version](https://img.shields.io/badge/Version-v1.3.1--rc.3-0969da.svg?style=flat-square)](package.json)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg?style=flat-square)](LICENSE)
[![Zero Dependencies](https://img.shields.io/badge/Dependencies-0-success.svg?style=flat-square)](package.json)
[![Execution Speed](https://img.shields.io/badge/Suite%20Speed-12s%20(8%20workers)-informational.svg?style=flat-square)](tests/run_all.js)
[![Distribution Size](https://img.shields.io/badge/Package%20Size-535_kB-informational.svg?style=flat-square)](package.json)

---

## The Core Problem in Autonomous AI Coding

Autonomous coding assistants (**Claude Code, Google Antigravity, Cursor, Codex**) are transforming software delivery. However, when operating autonomously, non-technical creators and enterprise teams face four severe systemic risks:

1. **Reckless Hallucinations & Vibecoding**: AI models making blind assumptions on ambiguous requirements, inventing APIs, and refactoring mission-critical subsystems without human alignment.
2. **Destructive Terminal Operations**: Accidental filesystem corruption, port collisions, unauthorized secret exposure, and unverified database operations.
3. **Context Rot & Token Waste**: Thousands of dollars wasted in runaway reasoning loops, repetitive conversational turns, and massive context degradation.
4. **Zero Cryptographic Auditability**: Inability to mathematically prove what tests actually ran, who approved mutations, and whether the code supply chain was compromised.

**Axion Protocol mitigates these risks deterministically.** It delivers an ultra-lightweight, local-first runtime (535 kB, **zero external npm dependencies**) that wraps your AI agent in a **deterministic fail-closed state machine**.

---

## Value Propositions

- **Socratic Intent Gate (`/clarify`)**: Forces the agent to ask exactly 2 plain A/B/C human questions before touching code on ambiguous requests, completely eliminating blind guessing.
- **Fail-Closed Terminal Shield (`/preflight`)**: Intercepts and classifies every terminal command (`ALLOW` / `NEEDS_HUMAN_REVIEW` / `DENY`) with `shell: false` safety.
- **Deterministic Rollback (`/snapshot`)**: Restores SHA-256 tree snapshots from natural language prompts (*"undo what you did"*), independent of Git.
- **Incremental Runner (`tools/smart_incremental_runner.js`)**: Analyzes static inverse dependency ASTs to execute only impacted test suites.
- **Pre-Flight TDD Synthesizer (`tools/preflight_tdd_synthesizer.js`)**: Derives formal assertion contracts before disk mutations to reduce trial-and-error iterations.
- **Provenance & Local Attestations (`/attest`)**: Generates local DSSE/in-toto Statement v1 envelopes signed with Ed25519.
- **Multi-Platform Consistency**: Unified governance designed to operate consistently across **Google Antigravity**, **Anthropic Claude Code**, and the standalone CLI.

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

### 1. Interactive Sandbox Demo (No Installation Required)

Experience fail-closed terminal interception and deterministic rollback in an isolated in-memory sandbox:

```bash
# Run the live interactive terminal demo
node bin/axion.js demo

# Run the competitive benchmark suite
node bin/axion.js benchmark
```

### 2. Initialize in Any Existing Project

```bash
# Inject fail-closed governance into your active workspace
npx axion-protocol init
```

*Automatically configures `.agents/skills/` (Antigravity), `.claude/commands/` (Claude Code), `tools/`, `policies/` and `schemas/` with SHA-256 verification.*

### 3. Verify Health & Governance State

```bash
npx axion check
```

Output:
```text
[Axion Health Check] Auditando proyecto...
  ✓ PASS   Motor Node.js: v24.x (requiere >= 20)
  ✓ PASS   Hook PreToolUse: ejercitado en vivo (bloquea destructivos)
  ✓ PASS   Slash Commands: 12/12 en .agents/skills · 12/12 en .claude/commands
  ✓ PASS   Killswitch: RUNNING — sin parada activa

[Axion Protocol v1.3.1-rc.3] 12/12 comprobaciones en verde. Gobernanza operativa.
```

---

## Governance Commands & Recipes

Axion Protocol provides 12 core slash commands designed to work in synergy. For full documentation, operational triggers, and recommended workflows (e.g., `/drive /premortem /critic`), consult the dedicated manual:

**[Explore the Complete Command Reference & Recipes Manual ->](docs/COMMANDS.md)**

| Command | Category | Core Objective |
| :--- | :--- | :--- |
| `/drive` | Autonomous Execution | Meta-orchestrator in closed-loop with *Fast-Loop* vs. *Deep-Loop* bifurcation. |
| `/clarify` | Socratic Intent Gate | 2 structured A/B/C human questions without technical jargon. |
| `/critic` | Asymptotic Excellence | Universal polymorphic auditor evaluating the 7 Sovereign Maturity Frontiers. |
| `/premortem` | Failure Simulation | 6-month adversarial failure autopsy and blast-radius boundary calculation. |
| `/preflight` | Terminal Security | Structured pre-execution command classifier (`shell: false`). |
| `/snapshot` | State Recovery | Deterministic SHA-256 tree checkpoints and natural language rollback. |
| `/verify` | Deterministic Truth | Real test execution requiring exit code 0; supports `--fast` incremental testing. |
| `/review` | Multi-Lens Audit | Selective code inspection via 4 lenses (Technical, Functional, UX, Architecture). |
| `/memory` | Persistent Memory | 4-tier fractal memory (< 150 token anchor) preventing cross-session drift. |
| `/profile` | Human Calibration | Calibrates user profile across 5 operational dimensions (Voice, IDE, Cadence). |
| `/halt` | Emergency Killswitch | Immediate fail-closed operational freeze (`.axion/HALT`). |
| `/attest` | Cryptography | in-toto Statement v1 DSSE envelopes signed with Ed25519. |

---

## Test Verification & Deterministic Invariants

Axion Protocol includes **233 deterministic test suites** that run concurrently with zero external test runners:

```bash
# Run the complete test suite across all 5 domains
npm test
```

### Coverage by Domain

| Domain Pillar | Core Responsibilities | Test Suites |
| :--- | :--- | :---: |
| 🛡️ **Governance & Preflight** | PreToolUse hooks, lexical preflight, killswitch, risk policy compiler, structured commands, workflow state machine, drive engine | 142 |
| 🔐 **Cryptography & Attestation** | DSSE/PAE envelopes, RFC 8785 canonical JSON, in-toto Statement v1, Ed25519 signatures, evidence binding, revocation | 27 |
| 🧭 **Intent & Socratic UX** | 2-question clarifier, A/B/C contracts, SHA-256 intent sealing, profile calibration, interactive wizard, deep reasoning | 23 |
| 💾 **State, Checkpoints & Recovery** | Atomic snapshots, rollback plan validation, memory guard limits, context shield anchoring, evidence hasher, governance drift detection | 23 |
| ⚡ **Adversarial Resilience** | 100+ mutation vectors, pre-mortem verdict derivation, VibeGuard lexical gate, boilerplate detection, fuzzer burst resilience | 18 |

**Total: 233 suites** passed in ~12s (8 concurrent workers).

---

## License & Author

Distributed under the **Apache-2.0 License**. See [LICENSE](LICENSE) for details.  
Created and maintained by **Adria** ([@Acourd](https://github.com/Acourd)).
