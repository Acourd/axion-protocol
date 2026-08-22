'use strict';

const { hashCanonical } = require('./canonical_json.js');

const ROLLBACK_STATUS = Object.freeze({
  ROLLBACK_VALID: 'ROLLBACK_VALID',
  ROLLBACK_MISSING: 'ROLLBACK_MISSING',
  ROLLBACK_INVALID: 'ROLLBACK_INVALID',
  ROLLBACK_BINDING_MISMATCH: 'ROLLBACK_BINDING_MISMATCH',
});

function validateRollbackPlan(plan, missionId) {
  if (!plan || typeof plan !== 'object' || Array.isArray(plan)) {
    return Object.freeze({ status: ROLLBACK_STATUS.ROLLBACK_MISSING });
  }
  const valid = plan.contractVersion === '1.0.0'
    && typeof plan.planId === 'string' && plan.planId.trim() !== ''
    && typeof plan.missionId === 'string' && plan.missionId.trim() !== ''
    && typeof plan.strategy === 'string' && plan.strategy.trim() !== ''
    && typeof plan.snapshotDigest === 'string' && /^[a-f0-9]{64}$/.test(plan.snapshotDigest)
    && Array.isArray(plan.steps) && plan.steps.length > 0
    && plan.steps.every((step) => typeof step === 'string' && step.trim() !== '')
    && Array.isArray(plan.verification) && plan.verification.length > 0
    && plan.verification.every((step) => typeof step === 'string' && step.trim() !== '');
  if (!valid) return Object.freeze({ status: ROLLBACK_STATUS.ROLLBACK_INVALID });
  if (plan.missionId !== missionId) {
    return Object.freeze({ status: ROLLBACK_STATUS.ROLLBACK_BINDING_MISMATCH });
  }
  return Object.freeze({
    status: ROLLBACK_STATUS.ROLLBACK_VALID,
    rollbackHash: hashCanonical(plan),
    planId: plan.planId,
  });
}

module.exports = { ROLLBACK_STATUS, validateRollbackPlan };
