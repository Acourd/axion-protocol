'use strict';

const assert = require('assert');
const {
  IDENTITY_ASSURANCE,
  SEPARATION,
  assessAssurance
} = require('../../tools/assurance.js');

console.log('=== AX-F-066 Invariantes Criptográficos de Garantía y Separación de Identidades ===\n');

// 1. Inmutabilidad de los vocabularios cerrados
assert.strictEqual(Object.isFrozen(IDENTITY_ASSURANCE), true);
assert.strictEqual(Object.isFrozen(SEPARATION), true);
assert.strictEqual(IDENTITY_ASSURANCE.ATTESTED, 'ATTESTED');
assert.strictEqual(IDENTITY_ASSURANCE.SELF_DECLARED, 'SELF_DECLARED');
assert.strictEqual(IDENTITY_ASSURANCE.NOT_APPLICABLE, 'NOT_APPLICABLE');
console.log('✓ Vocabularios cerrados IDENTITY_ASSURANCE y SEPARATION inmutables');

// 2. Invocación limpia con opciones vacías / por defecto
const aDefault = assessAssurance();
assert.strictEqual(Object.isFrozen(aDefault), true);
assert.strictEqual(Object.isFrozen(aDefault.identities), true);
assert.strictEqual(Object.isFrozen(aDefault.separations), true);
assert.strictEqual(aDefault.identities.executor, IDENTITY_ASSURANCE.SELF_DECLARED);
assert.strictEqual(aDefault.identities.approver, IDENTITY_ASSURANCE.NOT_APPLICABLE);
assert.strictEqual(aDefault.identities.auditor, IDENTITY_ASSURANCE.NOT_APPLICABLE);
assert.deepStrictEqual(aDefault.openNonConformities, []);
console.log('✓ Invocación por defecto assessAssurance() verificada');

// 3. Matriz combinatoria completa de evaluación de aseguramiento (4 combinaciones)

// 3a. Caso (false, false): Sin aprobador ni auditor
const a00 = assessAssurance({ approvalVerified: false, checkVerified: false });
assert.strictEqual(a00.separations.approverVsAuditor, SEPARATION.NOT_APPLICABLE);
assert.strictEqual(a00.separations.executorVsApprover, SEPARATION.NOT_APPLICABLE);
assert.strictEqual(a00.separations.executorVsAuditor, SEPARATION.NOT_APPLICABLE);
assert.deepStrictEqual(a00.openNonConformities, []);

// 3b. Caso (true, false): Solo aprobador atestado
const a10 = assessAssurance({ approvalVerified: true, checkVerified: false });
assert.strictEqual(a10.identities.approver, IDENTITY_ASSURANCE.ATTESTED);
assert.strictEqual(a10.identities.auditor, IDENTITY_ASSURANCE.NOT_APPLICABLE);
assert.strictEqual(a10.separations.approverVsAuditor, SEPARATION.NOT_APPLICABLE);
assert.strictEqual(a10.separations.executorVsApprover, SEPARATION.UNDEMONSTRATED);
assert.strictEqual(a10.separations.executorVsAuditor, SEPARATION.NOT_APPLICABLE);
assert.deepStrictEqual(a10.openNonConformities, ['AX-NC-0001']);

// 3c. Caso (false, true): Solo auditor atestado
const a01 = assessAssurance({ approvalVerified: false, checkVerified: true });
assert.strictEqual(a01.identities.approver, IDENTITY_ASSURANCE.NOT_APPLICABLE);
assert.strictEqual(a01.identities.auditor, IDENTITY_ASSURANCE.ATTESTED);
assert.strictEqual(a01.separations.approverVsAuditor, SEPARATION.NOT_APPLICABLE);
assert.strictEqual(a01.separations.executorVsApprover, SEPARATION.NOT_APPLICABLE);
assert.strictEqual(a01.separations.executorVsAuditor, SEPARATION.UNDEMONSTRATED);
assert.deepStrictEqual(a01.openNonConformities, ['AX-NC-0001']);

// 3d. Caso (true, true): Ambos atestados (máximo nivel de separación demostrable)
const a11 = assessAssurance({ approvalVerified: true, checkVerified: true });
assert.strictEqual(a11.identities.executor, IDENTITY_ASSURANCE.SELF_DECLARED);
assert.strictEqual(a11.identities.approver, IDENTITY_ASSURANCE.ATTESTED);
assert.strictEqual(a11.identities.auditor, IDENTITY_ASSURANCE.ATTESTED);
assert.strictEqual(a11.separations.approverVsAuditor, SEPARATION.DEMONSTRATED);
assert.strictEqual(a11.separations.executorVsApprover, SEPARATION.UNDEMONSTRATED);
assert.strictEqual(a11.separations.executorVsAuditor, SEPARATION.UNDEMONSTRATED);
assert.deepStrictEqual(a11.openNonConformities, ['AX-NC-0001']);
assert.strictEqual(a11.summary.includes('2 separacion(es) se comprobaron contra una identidad autodeclarada'), true);
console.log('✓ Matriz combinatoria completa de aseguramiento y no conformidades (AX-NC-0001) verificada');

// 4. Inmutabilidad estricta contra mutaciones externas
assert.throws(() => { a11.summary = 'alterado'; }, /Cannot assign to read only property/);
assert.throws(() => { a11.identities.executor = 'HACKED'; }, /Cannot assign to read only property/);
assert.throws(() => { a11.separations.approverVsAuditor = 'HACKED'; }, /Cannot assign to read only property/);
console.log('✓ Inmutabilidad estricta de estructura y propiedades verificada');

console.log('\nPASS AX-F-066 — Invariantes de garantía y separación de identidades demostrados al 100%.\n');
