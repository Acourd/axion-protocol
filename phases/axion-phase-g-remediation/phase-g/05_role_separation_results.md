# Role Separation Test Results - Phase G

All 10 test scenarios executed on patched corpus `axion-corpus-isolated`:

1. **executor=approver**: `APPROVAL_NOT_INDEPENDENT` (PASS)
2. **executor=auditor**: `CHECK_NOT_INDEPENDENT` (PASS)
3. **approver=auditor**: `CHECK_NOT_INDEPENDENT` (PASS)
4. **all-same identity**: `APPROVAL_NOT_INDEPENDENT` (PASS)
5. **three distinct actors**: `CHECK_VALID` (PASS)
6. **absent executorActorId**: `CHECK_NOT_INDEPENDENT` (PASS)
7. **absent approval envelope**: `APPROVAL_MISSING` (PASS)
8. **absent check envelope**: `CHECK_MISSING` (PASS)
9. **dual-role actor**: `CHECK_NOT_INDEPENDENT` (PASS)
10. **self-approval nonce safe**: Rejected without creating `.used` file (PASS)
