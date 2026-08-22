# 🛡️ Axion Protocol

> **The Zero-Bloat Governance Harness for Autonomous AI Agents.**  
> *Fail-Closed execution, intent crystallization, instant rollback, and supply chain attestations.*

[![CI Passing](https://img.shields.io/badge/CI-Passing-brightgreen.svg)](https://github.com/Acourd/axion-protocol/actions)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![Zero Dependencies](https://img.shields.io/badge/Dependencies-0-success.svg)](package.json)
[![Package Size](https://img.shields.io/badge/Size-118_kB-informational.svg)](package.json)

---

## ⚡ What is Axion Protocol?

AI coding agents (Antigravity, Claude Code, Cursor) are powerful, but prone to **uncontrolled "vibecoding"**: guessing requirements, running destructive terminal commands, and hallucinating architectural changes.

**Axion Protocol** is a lightweight local governance harness (118 kB, 0 external dependencies) that enforces a deterministic **7-phase fail-closed lifecycle** before code is touched:

```text
ENTENDER ──► PLANIFICAR ──► GATE ──► TEST ──► CONSTRUIR ──► AUDITAR ──► PROMOVER
(Intent)      (Risk Tier)   (Sign)   (TDD)    (Preflight)   (Evidence)  (Report)
```

---

## 🚀 Quick Start (10 Seconds)

Run directly via `npx` or inject into any existing project:

```bash
# Run CLI directly
npx axion-protocol

# Inject governance rules into your current project
npx axion-protocol init
```

---

## 🎮 Core Slash Commands

Axion commands are designed for **zero-collision synergy** with Antigravity, Claude Code, and AG-Kit:

| Command | Purpose | When to use |
| :--- | :--- | :--- |
| **`/clarify`** | Socratic intent crystallization in 2 plain questions (A/B/C). | Before `/plan` or on vague requests. |
| **`/profile`** | Adapts AI tone, depth, and verbosity to your personal profile. | At session start or anytime. |
| **`/rollback`** | Restores code and disk to the last SHA-256 verified snapshot. | When changes need to be undone. |
| **`/preflight`** | Lexical syntax validator and risk classifier (`shell: false`). | Automatically before running terminal tools. |
| **`/halt`** | Emergency killswitch blocking all agent actions (*fail-closed*). | To immediately freeze an agent. |
| **`/unhalt`** | Deliberate human release of the emergency stop. | To resume safe execution. |
| **`/attest`** | Generates verifiable **in-toto Statement v1 / DSSE** evidence. | When completing a certified mission. |

---

## 🌟 Key Features for Creators & Teams

* 💬 **Socratic Intent Gate**: AI is strictly forbidden from modifying files on vague requests until the user clarifies requirements in 2 human questions.
* ⏪ **Natural Language Rollback**: Say *"undo what you did"* or *"revert"*, and Axion restores the exact verified state without Git friction.
* 🛡️ **Discrete Risk in Planning**: No annoying spam on simple tasks. Explicit warnings appear only during planning for high-risk or destructive actions.
* 🔐 **Ed25519 & in-toto Attestations**: Cryptographic single-use nonces and DSSE envelopes compatible with SLSA, Cosign, and GitHub Attestations.
* 🌐 **Polyglot Executive Summaries**: Final mission reports delivered in your native language with goals, tests passed, and SHA-256 evidence.

---

## 🧪 Verification & Test Suite

Axion Protocol runs **38 deterministic test suites** out of the box with zero external dependencies:

```bash
# Run all 38 test suites
node tests/run_all.js
```

---

## 📚 Documentation & Architecture

* 📖 **[Architecture & Threat Model](docs/threat_model.md)** — Security boundaries and fail-closed state machine.
* 🇪🇸 **[Guía en Español](README.es.md)** — Documentación completa en español.
* 📜 **[Changelog & Milestones](CHANGELOG.md)** — Release notes for `v1.1.0-alpha`.

---

## 📄 License

Licensed under the **[Apache 2.0 License](LICENSE)**. Zero telemetry, zero bloat, runs 100% locally.
