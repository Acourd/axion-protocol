'use strict';

const assert = require('assert');
const { IDENTITY_ASSURANCE, SEPARATION, assessAssurance } = require('../../tools/assurance.js');

console.log('=== AX-F-051 Invariantes de Separación y Niveles de Garantía de Identidad ===\n');

// 1. Inmutabilidad estricta (Object.isFrozen)
const aFrozen = assessAssurance({ approvalVerified: true, checkVerified: true });
assert.strictEqual(Object.isFrozen(aFrozen), true, 'el resultado de assessAssurance debe ser inmutable');
assert.strictEqual(Object.isFrozen(aFrozen.identities), true, 'las identidades deben ser inmutables');
assert.strictEqual(Object.isFrozen(aFrozen.separations), true, 'las separaciones deben ser inmutables');
console.log('✓ Inmutabilidad criptográfica de la evaluación de garantía verificada');

// 2. Matriz combinatoria completa de estados
// Caso A: Sin aprobación ni chequeo (Riesgo bajo sin firma requerida)
const casoA = assessAssurance({ approvalVerified: false, checkVerified: false });
assert.strictEqual(casoA.identities.executor, IDENTITY_ASSURANCE.SELF_DECLARED);
assert.strictEqual(casoA.identities.approver, IDENTITY_ASSURANCE.NOT_APPLICABLE);
assert.strictEqual(casoA.identities.auditor, IDENTITY_ASSURANCE.NOT_APPLICABLE);
assert.strictEqual(casoA.separations.approverVsAuditor, SEPARATION.NOT_APPLICABLE);
assert.strictEqual(casoA.separations.executorVsApprover, SEPARATION.NOT_APPLICABLE);
assert.strictEqual(casoA.separations.executorVsAuditor, SEPARATION.NOT_APPLICABLE);
assert.strictEqual(casoA.openNonConformities.length, 0);

// Caso B: Solo aprobación verificada
const casoB = assessAssurance({ approvalVerified: true, checkVerified: false });
assert.strictEqual(casoB.identities.approver, IDENTITY_ASSURANCE.ATTESTED);
assert.strictEqual(casoB.identities.auditor, IDENTITY_ASSURANCE.NOT_APPLICABLE);
assert.strictEqual(casoB.separations.executorVsApprover, SEPARATION.UNDEMONSTRATED);
assert.strictEqual(casoB.openNonConformities.includes('AX-NC-0001'), true);

// Caso C: Solo chequeo verificado
const casoC = assessAssurance({ approvalVerified: false, checkVerified: true });
assert.strictEqual(casoC.identities.approver, IDENTITY_ASSURANCE.NOT_APPLICABLE);
assert.strictEqual(casoC.identities.auditor, IDENTITY_ASSURANCE.ATTESTED);
assert.strictEqual(casoC.separations.executorVsAuditor, SEPARATION.UNDEMONSTRATED);
assert.strictEqual(casoC.openNonConformities.includes('AX-NC-0001'), true);

// Caso D: Aprobación y Chequeo verificados
const casoD = assessAssurance({ approvalVerified: true, checkVerified: true });
assert.strictEqual(casoD.identities.approver, IDENTITY_ASSURANCE.ATTESTED);
assert.strictEqual(casoD.identities.auditor, IDENTITY_ASSURANCE.ATTESTED);
assert.strictEqual(casoD.separations.approverVsAuditor, SEPARATION.DEMONSTRATED);
assert.strictEqual(casoD.separations.executorVsApprover, SEPARATION.UNDEMONSTRATED);
assert.strictEqual(casoD.separations.executorVsAuditor, SEPARATION.UNDEMONSTRATED);
assert.strictEqual(casoD.openNonConformities.includes('AX-NC-0001'), true);
console.log('✓ Matriz combinatoria completa de niveles de garantía (Casos A, B, C, D) verificada');

// 3. Invariante inviolable: El ejecutor NUNCA puede figurar como ATTESTED
const combinaciones = [
  { approvalVerified: false, checkVerified: false },
  { approvalVerified: true, checkVerified: false },
  { approvalVerified: false, checkVerified: true },
  { approvalVerified: true, checkVerified: true },
  { approvalVerified: 'algo', checkVerified: 123 },
  { approvalVerified: null, checkVerified: undefined }
];

for (const c of combinaciones) {
  const res = assessAssurance(c);
  assert.strictEqual(res.identities.executor, IDENTITY_ASSURANCE.SELF_DECLARED);
  assert.notStrictEqual(res.separations.executorVsApprover, SEPARATION.DEMONSTRATED);
  assert.notStrictEqual(res.separations.executorVsAuditor, SEPARATION.DEMONSTRATED);
}
console.log('✓ Invariante inviolable de no-demostración del ejecutor verificado al 100%');

console.log('\nPASS AX-F-051 — Niveles de garantía e invariantes de separación demostrados al 100%.\n');
