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

## 🚀 Quick Start

Requires **Node.js 20+**. Zero dependencies — only Node built-ins.

### As a Claude Code plugin

```bash
/plugin marketplace add Acourd/axion-protocol
/plugin install axion-protocol
```

The 16 commands and the `PreToolUse` gate become available immediately.

### As an npm package (Antigravity, Cursor, VS Code, Codex, CI)

```bash
# Inject governance into the current project
npx axion-protocol init

# Verify it actually landed
npx axion check
```

`init` writes to `.agents/` (Antigravity), `.claude/` (Claude Code), `tools/`,
`policies/` and `schemas/`. It never overwrites without a SHA-256 backup, it refuses to
claim success on an incomplete payload, and it leaves an existing `.claude/settings.json`
untouched — telling you what to add instead.

### Commands not showing up?

Claude Code reads project commands from the **session root**. If you launched it one
directory above the project, none of the 16 will appear — the files are fine, the scope
isn't. Either start Claude Code inside the project, or install them once for every
directory:

```bash
npx axion init --user
```

That writes the commands to `~/.claude/commands`, backing up anything it replaces. The
prompts load anywhere; the tools they cite only resolve inside a project that has Axion
installed.

---

## 🎮 Core Slash Commands

Axion commands are designed for **zero-collision synergy** with Antigravity, Claude Code, and AG-Kit:

| Command | Purpose | When to use |
| :--- | :--- | :--- |
| **`/clarify`** | Socratic intent gate: exactly 2 plain questions with A/B/C options. | Before planning, on vague requests. |
| **`/premortem`** | 3-tier adversarial failure simulation across 4 orthogonal anchors. | Before building any new feature or architectural idea. |
| **`/deep`** | 4-phase structured deliberation engine with blast-radius calculation. | Before high-risk refactors or complex structural changes. |
| **`/profile`** | Calibrates 5 dimensions (depth, input, environment, cadence, autonomy) and persists them. | Once per project; adjust anytime. |
| **`/onboard`** | Indexes a repository: stack, entry points, how it is tested, what not to touch. | First contact with a codebase. |
| **`/checkpoint`** | Seals a SHA-256 verifiable snapshot of the tree. | Before refactors, migrations, mass deletes. |
| **`/rollback`** | Restores the last verified checkpoint. Verifies the whole manifest before writing; seals a safety net first. | "Undo that" — in any language. |
| **`/preflight`** | Lexical risk classifier. `ALLOW` / `NEEDS_HUMAN_REVIEW` / `DENY`. | Automatically, before every terminal call. |
| **`/verify`** | Deterministic verification by execution. Exit code 0 or it did not work. | Before claiming anything works. |
| **`/debug`** | Four phases: reproduce, root cause, atomic fix, verify. No blind patches. | When something fails. |
| **`/review`** | Four lenses (technical, functional, UX, architecture) with severity scale. | Before merging or promoting. |
| **`/compact`** | Seals a short context anchor that returns P0 rules to the end of the window. | Long sessions, against 'lost-in-the-middle'. |
| **`/remember`** | Persistent project memory: decisions, conventions, limits, corrections. | So you never have to repeat yourself. |
| **`/halt`** | Emergency killswitch. Blocks every tool call, fail-closed. | To freeze a runaway agent, now. |
| **`/unhalt`** | Deliberate human release of the stop. | To resume safe execution. |
| **`/attest`** | in-toto Statement v1 in a DSSE envelope, verifiable with cosign. | On completing a certified mission. |

---

## 🌟 Key Features for Creators & Teams

* 💬 **Socratic Intent Gate**: AI is strictly guided to clarify ambiguous requests in 2 human questions before coding.
* ⏪ **Natural Language Rollback**: Say *"undo what you did"* or *"revert"*, and Axion restores the exact verified state without Git friction.
* 🛡️ **Discrete Risk in Planning**: Warnings appear only during planning for high-risk or destructive actions.
* 🔐 **Ed25519 & in-toto Attestations**: Cryptographic single-use nonces and DSSE envelopes compatible with SLSA, Cosign, and GitHub Attestations.
* 🌐 **Polyglot Executive Summaries**: Final mission reports delivered in your native language with goals, tests passed, and SHA-256 evidence.

---

## 🧪 Verification & Test Suite

Axion Protocol includes **59 deterministic test suites** out of the box with zero external dependencies:

```bash
# Run all 59 test suites
node tests/run_all.js
```

<details>
<summary><strong>📋 View all 59 Test Suites Included</strong></summary>

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
- `ax_f_015_workflow_contract.test.js`
- `ax_f_016_tool_contracts.test.js`
- `ax_f_017_memory.test.js`
- `ax_f_018_evidence_scope.test.js`
- `ax_f_019_deep_reasoning.test.js`
- `ax_f_020_adversarial_fuzzing.test.js`
- `ax_f_021_memory_guard.test.js`
- `ax_f_022_deep_reasoning_robustness.test.js`
- `ax_f_023_premortem.test.js`
- `ax_f_024_command_scope.test.js`
- `ax_f_025_profile_calibration.test.js`
- `ax_f_026_updater_preservation.test.js`
- `ax_f_027_state_machine_strictness.test.js`
- `ax_f_028_evidence_canonical_dedup.test.js`
- `ax_f_029_vibeguard_lexical_resilience.test.js`
- `ax_f_030_dsse_pae_interoperability.test.js`
- `ax_f_031_canonical_json_rfc8785.test.js`
- `ax_f_032_identity_canonical_alias.test.js`
- `ax_f_033_cli_unified_dispatcher.test.js`

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
- `checkpoint_restore.test.js`
- `evidence_binding.test.js`
- `killswitch.test.js`
- `payload_reread.test.js`
- `premortem_gate.test.js`
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
