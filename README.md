# 🛡️ Axion Protocol

> **The Zero-Bloat Governance Harness & Fail-Closed Safety Engine for Autonomous AI Agents.**  
> *Turn reckless "vibecoding" into verifiable, production-grade autonomous software engineering.*
>
> **Status**: EXPERIMENTAL runtime. Enforcement does not intercept arbitrary OS-level shell commands automatically without the integrated agent hook. Requires **Node.js 20** or later.

[![CI Passing](https://img.shields.io/badge/CI-180%20Passing-brightgreen.svg)](https://github.com/Acourd/axion-protocol/actions)
[![Version](https://img.shields.io/badge/Version-v1.2.0--beta.1-blue.svg)](package.json)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![Zero Dependencies](https://img.shields.io/badge/Dependencies-0-success.svg)](package.json)
[![Execution Speed](https://img.shields.io/badge/Suite%20Speed-10.5s%20(8%20workers)-informational.svg)](tests/run_all.js)
[![Package Size](https://img.shields.io/badge/Size-140_kB-informational.svg)](package.json)

---

## 💡 Why Axion Protocol?

AI coding assistants (**Claude Code, Google Antigravity, Cursor, Aider**) are revolutionizing software development. However, when unleashed autonomously, developers face four critical vulnerabilities:

1. 💥 **Reckless "Vibecoding" & Hallucinations**: Agents guessing ambiguous requirements and refactoring core architectures without human alignment.
2. 💣 **Destructive Terminal Operations**: Accidental `rm -rf`, port collisions, secret leakage, and unverified migrations.
3. 💾 **Disk Inflation & Context Rot**: Runaway checkpoint accumulation, gigabytes of untracked temp files, and test suites that slow down to 5+ minutes.
4. ❓ **Zero Provenance & Auditability**: Inability to mathematically prove *who* authorized a change, *what* tests actually passed, and *whether* the supply chain was compromised.

**Axion Protocol solves this completely.** It is a lightweight, local-first governance harness (140 kB, **zero external npm dependencies**) that wraps your AI agent in a **deterministic fail-closed state machine**.

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

## ⚡ Key Value Propositions

* 🧭 **Socratic Intent Crystallization (`/clarify`)**: Prompts the agent to ask exactly 2 plain, structured A/B/C questions before touching code on ambiguous requests.
* 🛡️ **Fail-Closed Terminal Shield (`/preflight`)**: Intercepts and classifies every terminal command (`ALLOW` / `NEEDS_HUMAN_REVIEW` / `DENY`) before execution.
* ⏪ **Instant Deterministic Rollback (`/rollback`)**: Restores verified SHA-256 tree snapshots in `< 5ms` from natural language prompts (*"undo what you did"*).
* ⚡ **Anti-Bloat & Lightning Diff Testing (`tools/smart_incremental_runner.js`)**: Auto-compacts disk checkpoints to a strict quota of 2 and executes only impacted tests in `< 300ms`.
* 🔐 **Enterprise Cryptographic Attestation (`/attest`)**: Generates in-toto Statement v1 DSSE envelopes signed with Ed25519, CycloneDX v1.5 SBOMs, and Merkle root inclusion proofs (SLSA Level 3 compatible).
* 🌐 **100% Cross-Platform Parity**: 12 unified slash commands available identically in **Google Antigravity**, **Anthropic Claude Code**, and the standalone CLI.

---

## 🚀 Quick Start (Under 30 Seconds)

### 0. Try the 15-Second Live Interactive Sandbox Demo

Experience fail-closed terminal interception, mathematical invariant correction, and instant < 5ms rollback in an ephemeral memory sandbox:

```bash
# Run the live interactive demo
node bin/axion.js demo

# Or run the reproducible competitive benchmark suite
node bin/axion.js benchmark
```

### 1. Initialize Axion in your project

```bash
# Inject fail-closed governance into your workspace
npx axion-protocol init
```

*`init` configures `.agents/` (Antigravity), `.claude/` (Claude Code), `tools/`, `policies/` and `schemas/` without overwriting existing configs without a SHA-256 backup.*

### 2. Verify Governance Health

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

🎉 [Axion Protocol v1.2.0-beta.1] 12/12 comprobaciones en verde. Gobernanza operativa.
```

---

## 🎮 The 12 Unified Core Slash Commands

| Command | Category | Purpose | Typical Trigger |
| :--- | :--- | :--- | :--- |
| **`/drive`** | Autonomous Engine | Continuous autonomous meta-orchestrator with mission tracking and worker sandboxing. | *"Execute this end-to-end autonomously"* |
| **`/clarify`** | Intent Gate | Socratic gate: exactly 2 human questions with A/B/C options to resolve ambiguity. | *"Build me a dashboard"* (ambiguous) |
| **`/premortem`** | Risk Simulation | 6-month adversarial failure simulation and blast radius calculation before coding. | *"What do you think of this architecture idea?"* |
| **`/review`** | Code Audit | 4-lens audit (Technical, Functional, UX/A11y, Architecture) with AST blast radius. | *"Review the changes before committing"* |
| **`/verify`** | Proof of Work | Deterministic test execution requiring real exit code 0. | *"Prove that the bug is fixed"* |
| **`/snapshot`** | State Snapshot | Creates a SHA-256 verifiable disk snapshot independent of Git. | *"Save a safe checkpoint before refactoring"* |
| **`/rollback`** | State Recovery | Instantly restores the last verified snapshot in `< 5ms`. | *"Undo that"*, *"revert back to how it was"* |
| **`/preflight`** | Terminal Guard | Lexical classifier: `ALLOW`, `NEEDS_HUMAN_REVIEW`, or `DENY`. | Automatically before any terminal command |
| **`/debug`** | Troubleshooting | 4-phase systematic debugging: isolate, reproduce, atomic fix, verify. | *"Fix this error and find the root cause"* |
| **`/memory`** | Context Anchor | Cross-session persistent project memory and context compaction. | *"Remember this rule for future sessions"* |
| **`/attest`** | Cryptography | Emits in-toto DSSE attestation + CycloneDX SBOM + Merkle proof. | *"Certify this completed mission"* |
| **`/halt`** | Killswitch | Instant fail-closed emergency stop that blocks all tool calls. | *"Emergency stop"*, *"abort execution"* |

---

## 🥊 Competitive Advantage

| Feature | Raw AI Assistant (Cursor / Claude / Copilot) | Enterprise Gateways (Snyk / SonarQube) | **Axion Protocol v1.2.0** |
| :--- | :---: | :---: | :---: |
| **Execution Model** | Fail-Open (executes anything) | Post-commit CI blocking | **Fail-Closed (pre-execution runtime barrier)** |
| **Ambiguity Prevention** | None (guesses & hallucinates) | None | **Socratic 2-Question Gate (`/clarify`)** |
| **Instant Rollback** | Manual Git reset (messy) | None | **Atomic SHA-256 Snapshot (< 5ms)** |
| **Cryptographic Proof** | None | Limited | **in-toto DSSE + SLSA L3 + Merkle Ledger** |
| **Disk & Checkpoint Guard** | Uncontrolled inflation | N/A | **Inline Auto-Compacting + AST Diff Runner** |
| **Dependencies & Weight** | Heavy IDE / Server | Heavy Cloud SaaS | **0 Dependencies · 140 kB · 100% Local** |

---

## 🧪 Verification & Test Suite

Axion Protocol includes **182 deterministic test suites** out of the box with zero external dependencies:

```bash
# Run all 180 test suites concurrently (8 workers)
node tests/run_all.js

# Run incremental tests for only modified files (< 300ms)
node bin/axion.js test-diff

# Generate in-toto SBOM & SLSA provenance report
node bin/axion.js sbom

# Build and verify Merkle Tree ledger
node bin/axion.js merkle
```

### Coverage by Domain

| Domain | What it proves | Suites |
|--------|---------------|--------|
| 🛡️ **Governance & Preflight** | PreToolUse hooks, lexical preflight, killswitch, risk policy compiler, structured commands, workflow state machine, drive engine | 91 |
| 🔐 **Cryptography & Attestation** | DSSE/PAE envelopes, RFC 8785 canonical JSON, in-toto Statement v1, Ed25519 signatures, evidence binding, revocation | 27 |
| 🧭 **Intent & Socratic UX** | 2-question clarifier, A/B/C contracts, SHA-256 intent sealing, profile calibration, interactive wizard, deep reasoning | 23 |
| 💾 **State, Checkpoints & Recovery** | Atomic snapshots, rollback plan validation, memory guard limits, context shield anchoring, evidence hasher, governance drift detection | 23 |
| ⚡ **Adversarial Resilience** | 100+ mutation vectors, pre-mortem verdict derivation, VibeGuard lexical gate, boilerplate detection, fuzzer burst resilience | 18 |

> **Total: 182 suites · 0 dependencies · ~4s execution time**

---

## 📚 Documentation & Architecture

* 📖 **[Architecture & Threat Model](docs/threat_model.md)** — Security boundaries and mathematical invariants.
* 🌐 **[Interactive Web UI Documentation](docs/site/)** — WCAG 2.2 AA compliant terminal simulator and governance dashboard.
* 📜 **[Changelog](CHANGELOG.md)** — Detailed history from v1.0.0 to v1.2.0-beta.1.

---

## 📄 License & Privacy

Licensed under the **[Apache 2.0 License](LICENSE)**.  
**100% Local-First. Zero telemetry. Zero cloud dependencies. Your code and keys never leave your machine.**
