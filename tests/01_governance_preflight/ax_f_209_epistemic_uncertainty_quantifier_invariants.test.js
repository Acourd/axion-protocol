'use strict';

/**
 * AX-F-209: Invariantes del Cuantificador Epistémico de Incertidumbre (M_COG_015)
 *
 * Valida de forma determinista:
 * 1. Ponderación empírica y cálculo de entropía de hipótesis.
 * 2. Veto preventivo fail-closed (HALT_EVIDENTIARY_DEFICIT) ante déficit de evidencia.
 * 3. Autorización calibrada (PROCEED_CALIBRATED) con confianza >= 80% ante evidencia sólida.
 * 4. Emisión formal de EpistemicCalibrationCertificate_v1 sellado con SHA-256.
 * 5. Integración transparente con DriveEngine.quantifyEpistemicUncertainty().
 */

const assert = require('assert');
const path = require('path');
const EpistemicUncertaintyQuantifier = require('../../tools/epistemic_uncertainty_quantifier.js');
const DriveEngine = require('../../tools/drive_engine.js');

console.log('=== AX-F-209 Invariantes del Cuantificador Epistémico de Incertidumbre (M_COG_015) ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const quantifier = new EpistemicUncertaintyQuantifier({ projectRoot: ROOT });

// Invariante 1: Activación de HALT ante déficit de evidencia
const deficitProposal = {
  title: 'Mutación no probada de gobernanza',
  empiricalEvidence: [],
  competingHypothesesCount: 3,
  environmentalVolatility: 0.2
};
const deficitResult = quantifier.quantify(deficitProposal);
assert.strictEqual(deficitResult.verdict, 'HALT_EVIDENTIARY_DEFICIT');
assert.strictEqual(deficitResult.isAllowed, false);
assert.ok(deficitResult.epistemicUncertainty > 0.40);
console.log(`✓ Invariante 1: Veto preventivo fail-closed activado ante déficit de evidencia (Incertidumbre: ${deficitResult.epistemicUncertainty})`);

// Invariante 2: Calibración y autorización ante evidencia verificada
const solidProposal = {
  title: 'Despliegue de suite con tests verdes y SHA-256 coincidente',
  empiricalEvidence: [
    { type: 'TEST_PASS', weight: 0.6 },
    { type: 'HASH_VERIFIED', weight: 0.4 }
  ],
  competingHypothesesCount: 1,
  environmentalVolatility: 0.05
};
const solidResult = quantifier.quantify(solidProposal);
assert.strictEqual(solidResult.verdict, 'PROCEED_CALIBRATED');
assert.strictEqual(solidResult.isAllowed, true);
assert.strictEqual(solidResult.confidenceScore, 1.0);
assert.ok(solidResult.certificateDigest && solidResult.certificateDigest.length === 64);
console.log('✓ Invariante 2: Autorización calibrada demostrada al 100% de confianza');

// Invariante 3: Integración con DriveEngine
const driveEngine = new DriveEngine(ROOT);
const driveCert = driveEngine.quantifyEpistemicUncertainty(solidProposal);
assert.strictEqual(driveCert.certificateType, 'EpistemicCalibrationCertificate_v1');
assert.strictEqual(driveCert.verdict, 'PROCEED_CALIBRATED');
console.log('✓ Invariante 3: Integración nativa con DriveEngine.quantifyEpistemicUncertainty() verificada');

console.log('\nPASS AX-F-209 — Invariantes del cuantificador epistémico demostrados al 100%.');
