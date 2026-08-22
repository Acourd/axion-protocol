# Rollback and Reapply Certification - Phase G

## Verification Workflow
1. Restored baseline custody `baseline-custody.zip` to clean temporary directory `temp-cert-reapply`.
2. Verified 0 divergence against `01_baseline_manifest.json` (1118 files matched).
3. Re-applied `phase-g/patch.diff` to restored baseline.
4. Executed `tests/phase_e/role_separation.test.js` on re-applied corpus: **PASS**
5. Executed `tests/phase_e/workflow_enforcement_e2e.test.js` on re-applied corpus: **PASS**
6. Verified candidate ZIP integrity and internal manifest: **PASS**
