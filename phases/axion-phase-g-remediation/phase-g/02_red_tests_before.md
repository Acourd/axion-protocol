# Red Tests Before Patch - Phase G Verification

| Test # | Test Name | Expected Behavior Before Patch | Result Before Patch | Failure Cause |
|---|---|---|---|---|
| 1 | executor=approver | F-01 vulnerability: verifyAndConsumeApproval allowed self-approval | APPROVAL_VALID (RED) | verifyAndConsumeApproval missing executorActorId comparison |
| 2 | executor=auditor | Blocked at verifyIndependentCheck | CHECK_NOT_INDEPENDENT (PASS) | Previously enforced in check_ed25519.js |
| 3 | approver=auditor | F-02 vulnerability: verifyIndependentCheck allowed approver as auditor | CHECK_VALID (RED) | verifyIndependentCheck missing approvalActorId comparison |
| 4 | all-same identity | F-01 & F-02 vulnerability: single actor executes, approves, audits | APPROVAL_VALID (RED) | Both modules allowed same identity |
| 5 | three distinct actors | Normal valid flow | CHECK_VALID (PASS) | Valid baseline behavior |
| 6 | absent executorActorId | Absent identity blocked | CHECK_NOT_INDEPENDENT (PASS) | Handled by undefined check |
| 7 | absent approval envelope | Missing approval blocked | APPROVAL_MISSING (PASS) | Baseline check |
| 8 | absent check envelope | Missing check blocked | CHECK_MISSING (PASS) | Baseline check |
| 9 | dual-role actor | F-02 vulnerability: same actor with two key entries | CHECK_VALID (RED) | Role check passed without actorId check against approver |
| 10 | self-approval nonce | F-01 vulnerability: nonce marked used on self-approval | APPROVAL_VALID (RED) | Nonce consumed before independence check |
