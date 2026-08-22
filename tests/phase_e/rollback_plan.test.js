'use strict';

const assert = require('assert');
const { ROLLBACK_STATUS, validateRollbackPlan } = require('../../tools/rollback_plan.js');

const missionId = 'AX-RB-001';
const plan = {
  contractVersion: '1.0.0',
  planId: 'RB-001',
  missionId,
  strategy: 'RESTORE_SNAPSHOT',
  snapshotDigest: 'a'.repeat(64),
  steps: ['restaurar rutas autorizadas desde snapshot'],
  verification: ['comparar manifest SHA-256 canonico'],
};

const valid = validateRollbackPlan(plan, missionId);
assert.equal(valid.status, ROLLBACK_STATUS.ROLLBACK_VALID);
assert.match(valid.rollbackHash, /^[a-f0-9]{64}$/);
assert.equal(validateRollbackPlan(null, missionId).status, ROLLBACK_STATUS.ROLLBACK_MISSING);
assert.equal(validateRollbackPlan({ ...plan, steps: [] }, missionId).status, ROLLBACK_STATUS.ROLLBACK_INVALID);
assert.equal(
  validateRollbackPlan({ ...plan, missionId: 'AX-RB-OTHER' }, missionId).status,
  ROLLBACK_STATUS.ROLLBACK_BINDING_MISMATCH,
);

console.log('PASS rollback plan — snapshot, pasos, verificacion y mision vinculados');
