# Root Cause Analysis - Phase G

## Vulnerabilities Addressed
1. **F-01 (Executor = Approver)**: `verifyAndConsumeApproval` validated Ed25519 signature and authority registry roles (`HUMAN_AUTHORITY`), but did not verify whether the signer (`approval.actorId`) was equal to the current executor (`executorActorId`). Nonce was consumed prior to any independence check.
2. **F-02 (Approver = Auditor)**: `verifyIndependentCheck` checked `check.actorId !== executorActorId` and verified the `INDEPENDENT_AUDITOR` role, but did not receive or check `approvalActorId`. An actor holding both roles (or signing with two keyIds registered to the same `actorId`) could audit their own approvals.
