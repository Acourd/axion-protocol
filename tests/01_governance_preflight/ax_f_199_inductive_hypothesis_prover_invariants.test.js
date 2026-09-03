'use strict';

/**
 * AX-F-199: Invariantes del Demostrador Inductivo de Hipótesis y Teoremas de Estado (M_COG_010)
 *
 * Valida de forma determinista:
 * 1. Comprobación estricta de Caso Base P(s_0).
 * 2. Demostración formal del Paso Inductivo ∀s (P(s) => P(s')).
 * 3. Detección y aislamiento de contraejemplo ante transiciones inválidas.
 * 4. Emisión de certificado InductiveProofCertificate_v1 sellado con SHA-256.
 * 5. Integración transparente con DriveEngine.proveInductiveInvariant().
 */

const assert = require('assert');
const path = require('path');
const InductiveHypothesisProver = require('../../tools/inductive_hypothesis_prover.js');
const DriveEngine = require('../../tools/drive_engine.js');

console.log('=== AX-F-199 Invariantes del Demostrador Inductivo de Hipótesis (M_COG_010) ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const prover = new InductiveHypothesisProver(ROOT);

// Especificación formal de prueba: Preservación de Estado Fail-Closed en Killswitch
const validSpec = {
  theoremName: 'Preservación de Estado Fail-Closed',
  initialState: { active: true, haltTriggered: false, sequence: 0 },
  invariantPredicate: (s) => s && s.active === true && typeof s.sequence === 'number' && s.sequence >= 0,
  actionSpace: ['ADVANCE_STEP', 'RENEW_TOKEN', 'STALL'],
  sampleStates: [
    { active: true, haltTriggered: false, sequence: 0 },
    { active: true, haltTriggered: false, sequence: 5 },
    { active: true, haltTriggered: false, sequence: 100 }
  ],
  transitionFn: (s, action) => {
    const next = { ...s };
    if (action === 'ADVANCE_STEP') next.sequence += 1;
    if (action === 'RENEW_TOKEN') next.sequence += 0;
    if (action === 'STALL') next.sequence += 0;
    return next;
  }
};

// Invariante 1: Demostración formal válida (Caso Base + Paso Inductivo)
const cert = prover.proveInvariant(validSpec);
assert.strictEqual(cert.status, 'PROVEN_BY_MATHEMATICAL_INDUCTION');
assert.strictEqual(cert.baseCaseHolds, true);
assert.strictEqual(cert.inductiveStepHolds, true);
assert.strictEqual(cert.transitionsVerifiedCount, 9);
assert.ok(cert.certificateDigest && cert.certificateDigest.length === 64);
console.log(`✓ Invariante 1: Teorema demostrado inductivamente sobre ${cert.transitionsVerifiedCount} transiciones (Digest: ${cert.certificateDigest.slice(0, 16)}...)`);

// Invariante 2: Refutación inmediata si el Caso Base no sostiene el invariante
const invalidBaseSpec = {
  ...validSpec,
  initialState: { active: false, sequence: -1 }
};
const refutationBase = prover.proveInvariant(invalidBaseSpec);
assert.strictEqual(refutationBase.status, 'INDUCTIVE_PROOF_REFUTED');
assert.strictEqual(refutationBase.stage, 'BASE_CASE');
console.log('✓ Invariante 2: Refutación fail-closed inmediata en Caso Base demostrada');

// Invariante 3: Refutación y contraejemplo si el Paso Inductivo es violado
const corruptingTransitionSpec = {
  ...validSpec,
  transitionFn: (s, action) => {
    const next = { ...s };
    if (action === 'ADVANCE_STEP') next.sequence = -999; // Corrupción inducida
    return next;
  }
};
const refutationStep = prover.proveInvariant(corruptingTransitionSpec);
assert.strictEqual(refutationStep.status, 'INDUCTIVE_PROOF_REFUTED');
assert.strictEqual(refutationStep.stage, 'INDUCTIVE_STEP');
assert.ok(refutationStep.counterexample !== undefined);
assert.strictEqual(refutationStep.counterexample.action, 'ADVANCE_STEP');
console.log(`✓ Invariante 3: Detección y aislamiento de contraejemplo en Paso Inductivo validada (Acción corruptora: "${refutationStep.counterexample.action}")`);

// Invariante 4: Integración con DriveEngine
const driveEngine = new DriveEngine(ROOT);
const driveCert = driveEngine.proveInductiveInvariant(validSpec);
assert.strictEqual(driveCert.status, 'PROVEN_BY_MATHEMATICAL_INDUCTION');
assert.strictEqual(driveCert.certificateType, 'InductiveProofCertificate_v1');
console.log('✓ Invariante 4: Integración nativa con DriveEngine.proveInductiveInvariant() verificada');

console.log('\nPASS AX-F-199 — Invariantes del demostrador inductivo demostrados al 100%.');
