# Nonce Safety Results - Phase G

## Test Sequence & Verification
1. Created valid Ed25519 approval envelope for mission `AX-NONCE-TEST`.
2. Presented approval with `executorActorId = 'alice-approver'` (self-approval attempt).
3. Received `APPROVAL_NOT_INDEPENDENT`.
4. Verified consumption directory `consumed/` remained **0 files** (nonce NOT marked used).
5. Presented same approval envelope with `executorActorId = 'bob-executor'`.
6. Received `APPROVAL_VALID`.
7. Verified consumption directory `consumed/` contained **1 file** (`.used` nonce marker written).
8. Presented same approval envelope again with `executorActorId = 'bob-executor'`.
9. Received `APPROVAL_REPLAYED`.

**Conclusion:** Nonce consumption occurs ONLY after all independence and signature checks pass.
