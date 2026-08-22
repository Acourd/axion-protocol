# Axion Protocol (v1.1.0-alpha)

> 🇪🇸 [Léelo en español](README.es.md)

> Governance, intent clarity and cryptographic signing for agentic AI operations.

**Experimental · Pre-alpha · Governance-first · No certified runtimes**

Axion Protocol is an experimental local governance runtime for agentic operations. It holds a
seven-phase workflow and **fails closed** whenever it cannot demonstrate risk, authorization,
CHECK, scope, rollback or evidence. It uses Node.js built-in modules only: no external
dependencies, no network, no installation.

Its goal is that a person can understand what an agentic system is trying to do, why it picked
certain resources, what changed, what evidence it produced, and how to undo it.

---

## Actual state

This section exists so that nobody — its author included — mistakes a candidate for a certified
release.

| Question | Answer |
| :--- | :--- |
| Is this the most complete corpus? | **Yes.** Full Ed25519 layer, 38 executable suites. |
| Is this a certified release? | **No.** Its certification was formally invalidated on 2026-08-06. |
| Are there known open defects? | **Yes, two** — one of them partially closed. |

### Open non-conformities

- **`AX-NC-0001` (CRITICAL, reduced)** — Role separation had three independent paths that reached
  `VERIFIED` with the invariants violated, without breaking cryptography or forging signatures.
  **Two are now closed and one remains open**:

  | Path | State | Probe |
  | :--- | :--- | :--- |
  | Principal aliases and homoglyphs | **Closed** | `r02` green |
  | Payload re-read after verification | **Closed** | `r03` green |
  | Self-declared executor identity | **Open** | `r01` red |

  The open one is the deep one: `executorActorId` is written by the executor itself, which is the
  untrusted party. Closing it means binding identity to a fact outside the payload — the operating
  system account — through the trust service that Phase H specifies, which needs a privileged
  Windows service and kernel-enforced ACLs. Until then, **role separation cannot be considered
  demonstrated**.

  What the runtime does instead of staying quiet: every `VERIFIED` verdict now carries an
  **assurance block** stating how each identity was established — `ATTESTED` for the approver and
  auditor, whose identities come from verified Ed25519 signatures, and `SELF_DECLARED` for the
  executor. Any separation involving the executor is reported as
  `UNDEMONSTRATED_SELF_DECLARED_IDENTITY`, and `AX-NC-0001` travels inside the evidence and the
  attestation. A consumer does not have to read this README to find out.
- **`AX-NC-0002` (HIGH)** — The certification was issued without a checker capable of failing. Of
  the 13 suites that reported `13/13 PASS`, four could not tell a correct system from a broken one.

### Closed in this version

- **`AX-NC-0003` (HIGH)** — A functional regression: `LOW` risk could never reach `VERIFIED`. The
  independence check demanded an approver even for risk levels the policy does not submit to
  approval, so "there is no approver" was treated as "invalid approver". The requirement is now
  derived from the compiled policy, **never** from whether the approval envelope is present:
  inferring it from the envelope would have let anyone skip the approver simply by omitting it.
  `tests/phase_e/approval_required_bypass.test.js` guards exactly that.

### Suite results

Last full run on Node v24.19.0 — **38/38 PASS**:

| Batch | Result |
| :--- | :--- |
| Functional | 8/8 |
| Regression | 10/10 |
| Phase E | 20/20 |

Of the seven Phase H probes — which exist to *demonstrate* defects and **must** stay red while the
defect lives — **`r02`, `r03` and `r05` are now green**. The other four remain red on purpose.

Run them with `node tests/run_all.js`. Green suites **do not constitute promotion or certification**
(`policies/promotion.yaml`: `execution_implies_support: false`): the open path of `AX-NC-0001` is
not solved by cryptography, but by binding the executor's identity to something the executor does
not control.

---

## What it does

1. **Human intent crystallization** (`tools/intent_clarifier.js`) — Clarifies vague requests
   without jargon before a single line of code is touched.
2. **Risk classification and policy compilation** (`tools/risk_policy_compiler.js`) — Rates each
   task (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`). `HIGH` and `CRITICAL` demand explicit human approval
   and a rollback plan bound to the mission.
3. **Ed25519 verification** (`tools/approval_ed25519.js`, `tools/check_ed25519.js`) — Verifies
   signed approvals carrying a nonce and an expiry, consumed exactly once and recorded atomically.
   The CHECK must be signed by a registered auditor other than the executor.
4. **Preflight and structured execution** (`tools/preflight.js`, `tools/structured_command.js`) —
   The only `ALLOW` path accepts `{ executable, args, cwd, shell: false }`. Raw shell, wrappers or
   ambiguous syntax yield `DENY` or `NEEDS_HUMAN_REVIEW`.
5. **SHA-256 evidence** (`tools/evidence_hasher.js`) — Binds mission, risk, command and arguments,
   scope, approval, rollback, CHECK, state and independent evidence.
6. **Interoperable attestations** (`tools/attestation.js`, `tools/dsse.js`) — Expresses a verified
   mission as an in-toto Statement v1 inside a DSSE envelope — the same format used by in-toto,
   SLSA, cosign and GitHub attestations — so the evidence can be checked by tooling that knows
   nothing about Axion.
7. **Emergency stop** (`tools/killswitch.js`) — A halt that blocks every mission before phase 1.
   Stopping is cheap and needs no signature; resuming is a deliberate human act outside the
   runtime. An unreadable halt record counts as a halt: when it cannot be proven that nobody
   asked to stop, nothing runs.

## What it does not do

- It is not an AI model nor an autonomous runtime.
- **It does not intercept commands automatically.** Enforcement exists only when a consumer calls
  `tools/workflow_runner.js` and honours its verdict. There is no global interception.
- The installer copies files; it does not switch enforcement on by itself.
- It does not guarantee correctness or absence of errors, and must not be used today as an
  effective security control.
- Rollback requires a bound plan and a verifiable snapshot; there is no universal one-click restore.
- **The emergency stop halts automation, not adversaries.** Anyone with write access to the halt
  directory can remove the file. It protects against the common case — an agent running away and
  needing to be stopped — not against a hostile executor with disk access.
- It does not turn documentation into enforcement: `authority.yaml`, `promotion.yaml` and
  `retention.yaml` remain `DOCUMENT_ONLY`.
- It claims no compatibility with untested runtimes.

---

## The unified hybrid cycle (7 phases)

```text
[1. UNDERSTAND (Clarifier)] ──> [2. PLAN (Risk compiler)] ──> [3. GATE (Ed25519 approval)]
                                                                          │
                                                                          ▼
[7. PROMOTE/LEARN] <── [6. AUDIT (SHA-256 evidence)] <── [5. BUILD (Preflight)] <── [4. TEST (TDD)]
```

Transitions are strictly ordered. Any failure leaves the machine in a terminal blocked state, and
`VERIFIED` is emitted only after all seven phases complete.

---

## Quick start

Requires **Node.js 20 or newer**. There are no dependencies to install — the package declares
none, and a regression test keeps it that way.

Without installing anything:

```bash
npx axion-protocol --help
```

Or from a clone:

```bash
node install.js
```

```bash
node tools/intent_clarifier.js "build me a login"
```

Classifying a raw shell string. It **never returns `ALLOW`**: wrapped in a shell, there is no way
to determine with certainty what it would execute, so the best possible outcome is
`NEEDS_HUMAN_REVIEW` (exit 2) — and if it looks destructive, `DENY` (exit 1).

```bash
node tools/preflight.js "git commit -m message"
```

Reaching `ALLOW` requires a structured command that is also on the allowlist:

```bash
node tools/preflight.js --json '{"executable":"git","args":["status"],"cwd":".","shell":false}'
```

```bash
node tools/approval_ed25519.js --help
```

Stopping everything, and checking whether something is stopped:

```bash
node tools/killswitch.js halt "the agent is touching production"
node tools/killswitch.js status
node tools/killswitch.js resume
```

For the presentation page, open [`index.html`](index.html) in your browser — no server, no
dependencies.

---

## Executable tools (`tools/`)

| Tool | Purpose |
| :--- | :--- |
| `workflow_runner.js` | Fail-closed orchestration of the seven phases. |
| `intent_clarifier.js` | Jargon-free interview to crystallize requirements. |
| `risk_policy_compiler.js` | Compiles and evaluates `policies/risk.yaml`. |
| `approval_ed25519.js` | Fixture signing plus approval verification and consumption. |
| `check_ed25519.js` | Verification of the signed independent CHECK. |
| `identity_canonical.js` | Canonical actor identity: aliases, homoglyphs and mixed scripts. |
| `assurance.js` | How each identity was established, and which separations that leaves undemonstrated. |
| `killswitch.js` | Emergency stop: halts every mission before phase 1. |
| `dsse.js` | DSSE envelopes with spec-exact Pre-Authentication Encoding. |
| `attestation.js` | in-toto Statement v1 attestations of a verified mission. |
| `structured_command.js` | Classification and execution with `shell: false`. |
| `preflight.js` | Classifies commands: `ALLOW`, `DENY` or `NEEDS_HUMAN_REVIEW`. |
| `evidence_hasher.js` | SHA-256 manifests with canonical binding. |
| `rollback_plan.js` | Validates and hashes the minimum restore plan. |
| `vibeguard.js` | Static linter against symptomatic patches. |
| `learning_engine.js` | Records durable lessons learned. |
| `install.js` | One-step installer with idempotent backups. |

### Unified CLI

Every tool is reachable through one entry point. The subcommands dispatch to the modules in
`tools/`, so there is no second implementation that could drift from the first, and exit codes
are propagated unchanged:

```bash
axion init --target ./my-project     # inject governance rules
axion preflight "git commit -m msg"  # classify a command
axion halt "the agent is loose"      # emergency stop
axion status                         # is anything halted?
axion attest verify att.json key.pem # verify an attestation
axion test                           # run the whole suite
```

The published package is **118 kB** and carries no dependencies. It ships the test suite on
purpose: you can run the suite that tries to refute this project instead of taking the README
at its word. `phases/` — the audit evidence — stays in the repository, not in the package.

### Interoperable evidence

A verified mission can be expressed as an **in-toto Statement v1** wrapped in a **DSSE**
envelope, signed with the same Ed25519 keys:

```bash
node tools/attestation.js verify attestation.json auditor-public.pem
```

| Field | Value |
| :--- | :--- |
| `payloadType` | `application/vnd.in-toto+json` |
| `predicateType` | `https://axion-protocol.org/attestation/workflow/v1` |
| Subject | The mission evidence manifest digest |

This is an **export layer, not a replacement**. The internal envelope still governs gating, and
the Ed25519 layer is deliberately not redesigned — it survived the Phase G re-audit and Phase H
puts it out of scope. What changes is that the evidence stops being a private dialect.

DSSE signs the *Pre-Authentication Encoding*, which binds the payload type into the signature.
Without it, a signature issued for one document type could be replayed as another; the suite
attempts exactly that replay and requires it to fail.

### Trust boundary

The human private key belongs neither to the corpus nor to the executor. The authority registry
holds public keys only and is received through trusted context, never from the task payload. Axion
offers no operations to register, revoke or delete authorities: that requires a separate human
procedure. Test fixtures generate ephemeral private keys in memory only.

---

## Tests

No third-party runner, no dependencies. All 38 suites at once:

```bash
node tests/run_all.js
```

Or one batch at a time:

```bash
node tests/run_all.js funcional
node tests/run_all.js regresion
node tests/run_all.js phase_e
```

Each file can also be run on its own; it reports its result through the exit code.

**Functional** (8)

```bash
node tests/adversarial.test.js
node tests/clarifier.test.js
node tests/human_anti_patterns.test.js
node tests/install.test.js
node tests/learning_git.test.js
node tests/tools.test.js
node tests/vibeguard.test.js
node tests/workflow.test.js
```

**Regression** (10)

```bash
node tests/regression/ax_f_001_installer_backup.test.js
node tests/regression/ax_f_002_risk_gate.test.js
node tests/regression/ax_f_003_verified_requires_checks.test.js
node tests/regression/ax_f_004_evidence_manifest.test.js
node tests/regression/ax_f_005_preflight_destructive.test.js
node tests/regression/ax_f_006_learnings_preservation.test.js
node tests/regression/ax_f_008_doc_consistency.test.js
node tests/regression/ax_f_012_suite_integrity.test.js
node tests/regression/ax_f_013_documented_examples.test.js
node tests/regression/ax_f_014_package_contract.test.js
```

**Phase E and identity** (20)

```bash
node tests/phase_e/approval_ed25519.test.js
node tests/phase_e/approval_forgery_baseline.test.js
node tests/phase_e/approval_required_bypass.test.js
node tests/phase_e/assurance.test.js
node tests/phase_e/attestation.test.js
node tests/phase_e/c01_governance_chain.test.js
node tests/phase_e/c02_destructive_classifier.test.js
node tests/phase_e/c03_independent_attestations.test.js
node tests/phase_e/check_ed25519.test.js
node tests/phase_e/evidence_binding.test.js
node tests/phase_e/killswitch.test.js
node tests/phase_e/payload_reread.test.js
node tests/phase_e/principal_alias.test.js
node tests/phase_e/revocation.test.js
node tests/phase_e/risk_policy_compiler.test.js
node tests/phase_e/role_separation.test.js
node tests/phase_e/rollback_plan.test.js
node tests/phase_e/structured_command.test.js
node tests/phase_e/workflow_enforcement_e2e.test.js
node tests/phase_e/workflow_state_machine.test.js
```

A green suite **does not constitute promotion or certification**
(`policies/promotion.yaml`: `execution_implies_support: false`). There is no coverage
instrumentation, and the tests cover neither web interface rendering nor concurrent behaviour.

### Corpus integrity

There are **two manifests with different purposes**, and they should not be confused:

| File | What it is | Must match the current tree |
| :--- | :--- | :--- |
| `09_candidate_manifest.json` | **Live** seal of the corpus and its suite: 116 files. | **Yes** |
| `sha256-manifest.txt` | **Historical** record of the Phase E start: 70 files. | **No** |

The second freezes the corpus as it stood when Phase E began. The corpus kept evolving through
phases F and G, so several of its hashes no longer match — and that is correct. If they did match,
it would mean somebody rewrote the record to make it look clean. `phase-e-integrity.yaml` documents
that scope and in turn seals the historical manifest.

A manifest cannot contain its own hash, because the value changes as it is written. The integrity
of `09_candidate_manifest.json` comes from the git history.

The repository ships `.gitattributes` with `* -text` precisely so that a `git clone` does not
rewrite line endings and break every one of these hashes on the machine that downloads it.

---

## This repository and Axkern

The project lives in two trees with distinct roles:

| | **Axion Protocol** (this repo) | **Axkern** |
| :--- | :--- | :--- |
| Role | **Canonical** version | **Experimental** field (rolling) |
| Contents | Sealed corpus, evidence for phases A→H | Corpus + agent environment + rescued material |
| State | Public, sealed by manifest and CI | Local, verified archive |

Nothing lands here merely because it exists in Axkern. Promotion demands evidence, tests, rollback,
audit and explicit approval, per `policies/promotion.yaml` and the *Promotion* section of
[`GOVERNANCE.md`](GOVERNANCE.md).

**Case in point:** `tools/principal_registry.js` **lives only in Axkern** and remains unpromoted.
Its goal — closing the alias path of `AX-NC-0001` — was eventually met by another route: rule R4
was implemented here as `tools/identity_canonical.js`. The Axkern draft normalized with NFKC, and
NFKC does not turn a Cyrillic `а` into a Latin one, so it did not close the path. It is kept as a
record of the first attempt.

---

## Documentation

- [Project vision](docs/vision.md)
- [Architecture](docs/architecture.md)
- [Threat model](docs/threat_model.md)
- [Formal governance](GOVERNANCE.md)
- [Security policy](SECURITY.md)
- [Roadmap](ROADMAP.md)

Most documents under `docs/` and the evidence in `phases/` are written in Spanish, which is the
project's working language. This README and [`README.es.md`](README.es.md) are kept in sync.

---

## License

Distributed under the [Apache License 2.0](LICENSE). See [`NOTICE`](NOTICE) for the historical
material under `phases/`, which preserves the licence notice that predates this decision.
