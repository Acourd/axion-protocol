# Patch Review - Phase G

## Summary of Changes
- `tools/approval_ed25519.js`: Added `executorActorId` parameter to `verifyAndConsumeApproval`. Returns `APPROVAL_NOT_INDEPENDENT` before consuming nonce if `approval.actorId === executorActorId`.
- `tools/check_ed25519.js`: Added `approvalActorId` parameter to `verifyIndependentCheck`. Returns `CHECK_NOT_INDEPENDENT` if `check.actorId === executorActorId || check.actorId === approvalActorId`.
- `tools/workflow_runner.js`: Propagated `runtimeContext.executorActorId` and extracted `taskPayload.approvalEnvelope.approval.actorId` to pass to validation functions.
- `tests/phase_e/approval_ed25519.test.js`: Updated test helper to pass `executorActorId`.
- `tests/phase_e/check_ed25519.test.js`: Updated test helper to pass `approvalActorId`.
- `tests/phase_e/role_separation.test.js`: Added comprehensive role separation test suite (10 test cases).

## Scope Non-Touch Verification
- `tools/structured_command.js`: UNTOUCHED
- `tools/preflight.js`: UNTOUCHED
- `tools/risk_policy_compiler.js`: UNTOUCHED
- `tools/canonical_json.js`: UNTOUCHED
- `tools/evidence_hasher.js`: UNTOUCHED
- `tools/rollback_plan.js`: UNTOUCHED
- `policies/`: UNTOUCHED
