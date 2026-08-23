# 🛡️ Axion Protocol

> **The Zero-Bloat Governance Harness for Autonomous AI Agents.**  
> *Fail-Closed execution, intent crystallization, instant rollback, and supply chain attestations.*
> 
> **Status**: EXPERIMENTAL runtime. Enforcement does not intercept arbitrary OS-level shell commands automatically without the integrated agent hook. Requires **Node.js 20** or later.

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

Requires **Node.js 20**+. Run directly via `npx` or inject into any existing project:

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

* 💬 **Socratic Intent Gate**: AI is strictly guided to clarify ambiguous requests in 2 human questions before coding.
* ⏪ **Natural Language Rollback**: Say *"undo what you did"* or *"revert"*, and Axion restores the exact verified state without Git friction.
* 🛡️ **Discrete Risk in Planning**: Warnings appear only during planning for high-risk or destructive actions.
* 🔐 **Ed25519 & in-toto Attestations**: Cryptographic single-use nonces and DSSE envelopes compatible with SLSA, Cosign, and GitHub Attestations.
* 🌐 **Polyglot Executive Summaries**: Final mission reports delivered in your native language with goals, tests passed, and SHA-256 evidence.

---

## 🧪 Verification & Test Suite

Axion Protocol includes **38 deterministic test suites** out of the box with zero external dependencies:

```bash
# Run all 38 test suites
node tests/run_all.js
```

<details>
<summary><strong>📋 View all 38 Test Suites Included</strong></summary>

### Funcional
- `adversarial.test.js`
- `clarifier.test.js`
- `human_anti_patterns.test.js`
- `install.test.js`
- `learning_git.test.js`
- `tools.test.js`
- `vibeguard.test.js`
- `workflow.test.js`

### Regresión
- `ax_f_001_installer_backup.test.js`
- `ax_f_002_risk_gate.test.js`
- `ax_f_003_verified_requires_checks.test.js`
- `ax_f_004_evidence_manifest.test.js`
- `ax_f_005_preflight_destructive.test.js`
- `ax_f_006_learnings_preservation.test.js`
- `ax_f_008_doc_consistency.test.js`
- `ax_f_012_suite_integrity.test.js`
- `ax_f_013_documented_examples.test.js`
- `ax_f_014_package_contract.test.js`

### Phase E (Criptografía y Gobernanza)
- `approval_ed25519.test.js`
- `approval_forgery_baseline.test.js`
- `approval_required_bypass.test.js`
- `assurance.test.js`
- `attestation.test.js`
- `c01_governance_chain.test.js`
- `c02_destructive_classifier.test.js`
- `c03_independent_attestations.test.js`
- `check_ed25519.test.js`
- `evidence_binding.test.js`
- `killswitch.test.js`
- `payload_reread.test.js`
- `principal_alias.test.js`
- `revocation.test.js`
- `risk_policy_compiler.test.js`
- `role_separation.test.js`
- `rollback_plan.test.js`
- `structured_command.test.js`
- `workflow_enforcement_e2e.test.js`
- `workflow_state_machine.test.js`

</details>

---

## 📚 Documentation & Architecture

* 📖 **[Architecture & Threat Model](docs/threat_model.md)** — Security boundaries and fail-closed state machine.
* 🇪🇸 **[Guía en Español](README.es.md)** — Documentación completa en español.
* 📜 **[Changelog & Milestones](CHANGELOG.md)** — Release notes for `v1.1.0-alpha`.

---

## 📄 License

Licensed under the **[Apache 2.0 License](LICENSE)**. Zero telemetry, zero bloat, runs 100% locally.
