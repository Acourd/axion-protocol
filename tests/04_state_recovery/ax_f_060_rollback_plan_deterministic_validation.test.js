'use strict';

const assert = require('assert');
const {
  ROLLBACK_STATUS,
  validateRollbackPlan
} = require('../../tools/rollback_plan.js');

console.log('=== AX-F-060 Validación Determinista y Vinculación Criptográfica de RollbackPlan ===\n');

const validMission = 'MISSION-AXION-2026-ALPHA';
const validPlan = {
  contractVersion: '1.0.0',
  planId: 'RB-PLAN-ALPHA-01',
  missionId: validMission,
  strategy: 'RESTORE_SNAPSHOT',
  snapshotDigest: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  steps: [
    'Verificar integridad de respaldo en .axion/checkpoints',
    'Restaurar archivos alterados utilizando atomic file write',
    'Podar artefactos espurios no catalogados'
  ],
  verification: [
    'Ejecutar node tools/verify_changes.js con código 0',
    'Comprobar digest canónico del manifiesto de evidencia'
  ]
};

// 1. Validación de plan canónico exitoso
const resValid = validateRollbackPlan(validPlan, validMission);
assert.strictEqual(resValid.status, ROLLBACK_STATUS.ROLLBACK_VALID);
assert.strictEqual(typeof resValid.rollbackHash, 'string');
assert.strictEqual(/^[a-f0-9]{64}$/.test(resValid.rollbackHash), true);
assert.strictEqual(resValid.planId, validPlan.planId);
assert.strictEqual(Object.isFrozen(resValid), true, 'El resultado debe ser inmutable');
console.log('✓ Plan de reversión canónico validado y sellado como inmutable');

// 2. Invariante de orden de propiedades en hash canónico RFC 8785
const permutedPlan = {
  verification: validPlan.verification,
  steps: validPlan.steps,
  strategy: validPlan.strategy,
  snapshotDigest: validPlan.snapshotDigest,
  missionId: validPlan.missionId,
  planId: validPlan.planId,
  contractVersion: validPlan.contractVersion
};
const resPermuted = validateRollbackPlan(permutedPlan, validMission);
assert.strictEqual(resPermuted.status, ROLLBACK_STATUS.ROLLBACK_VALID);
assert.strictEqual(resPermuted.rollbackHash, resValid.rollbackHash, 'El hash canónico debe ser idéntico independientemente del orden de claves');
console.log('✓ Determinismo canónico de hash RFC 8785 verificado');

// 3. Matriz combinatoria de rechazos por invalidez estructural
const invalidCases = [
  { name: 'contractVersion incorrecta', mutator: p => ({ ...p, contractVersion: '2.0.0' }) },
  { name: 'planId vacío', mutator: p => ({ ...p, planId: '   ' }) },
  { name: 'strategy ausente', mutator: p => ({ ...p, strategy: '' }) },
  { name: 'snapshotDigest con caracteres no hex', mutator: p => ({ ...p, snapshotDigest: 'g'.repeat(64) }) },
  { name: 'snapshotDigest corto (63 chars)', mutator: p => ({ ...p, snapshotDigest: 'a'.repeat(63) }) },
  { name: 'snapshotDigest en mayúsculas', mutator: p => ({ ...p, snapshotDigest: 'A'.repeat(64) }) },
  { name: 'steps array vacío', mutator: p => ({ ...p, steps: [] }) },
  { name: 'steps con elementos vacíos', mutator: p => ({ ...p, steps: ['valido', '  '] }) },
  { name: 'verification array vacío', mutator: p => ({ ...p, verification: [] }) },
  { name: 'verification con tipos no string', mutator: p => ({ ...p, verification: [123] }) }
];

for (const tc of invalidCases) {
  const res = validateRollbackPlan(tc.mutator(validPlan), validMission);
  assert.strictEqual(res.status, ROLLBACK_STATUS.ROLLBACK_INVALID, `Falló caso de invalidez: ${tc.name}`);
  assert.strictEqual(Object.isFrozen(res), true);
}
console.log('✓ Matriz combinatoria de rechazos por invalidez estructural (10/10) verificada');

// 4. Vinculación estricta de misión (Binding Mismatch)
const resMismatch = validateRollbackPlan(validPlan, 'MISSION-OTHER-ID');
assert.strictEqual(resMismatch.status, ROLLBACK_STATUS.ROLLBACK_BINDING_MISMATCH);
assert.strictEqual(Object.isFrozen(resMismatch), true);
console.log('✓ Rechazo por desacoplamiento de misión (ROLLBACK_BINDING_MISMATCH) verificado');

// 5. Manejo de payloads ausentes o corruptos
assert.strictEqual(validateRollbackPlan(null, validMission).status, ROLLBACK_STATUS.ROLLBACK_MISSING);
assert.strictEqual(validateRollbackPlan(undefined, validMission).status, ROLLBACK_STATUS.ROLLBACK_MISSING);
assert.strictEqual(validateRollbackPlan([], validMission).status, ROLLBACK_STATUS.ROLLBACK_MISSING);
assert.strictEqual(validateRollbackPlan('no es objeto', validMission).status, ROLLBACK_STATUS.ROLLBACK_MISSING);
console.log('✓ Tratamiento fail-closed ante payloads ausentes o no estructurados verificado');

console.log('\nPASS AX-F-060 — Validación determinista de RollbackPlan demostrada al 100%.\n');
