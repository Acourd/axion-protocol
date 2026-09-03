'use strict';

/**
 * AX-F-213: Invariantes del Detector Abductivo de Anomalías (M_COG_017)
 *
 * Valida de forma determinista:
 * 1. Ponderación de inferencia a la mejor explicación (IBE: síntomas, simplicidad, prior).
 * 2. Selección de la hipótesis más parsimoniosa y vector de falsabilidad.
 * 3. Veto fail-closed INCONCLUSIVE_HYPOTHESIS ante cobertura explicativa insuficiente.
 * 4. Emisión de AbductiveDiagnosisCertificate_v1 sellado con SHA-256.
 * 5. Integración transparente con DriveEngine.diagnoseAbductiveAnomaly().
 */

const assert = require('assert');
const path = require('path');
const AbductiveAnomalyDetector = require('../../tools/abductive_anomaly_detector.js');
const DriveEngine = require('../../tools/drive_engine.js');

console.log('=== AX-F-213 Invariantes del Detector Abductivo de Anomalías (M_COG_017) ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const detector = new AbductiveAnomalyDetector({ projectRoot: ROOT, minExplanatoryThreshold: 0.40 });

const testAnomaly = {
  title: 'Regresión de paridad en espejo local',
  symptoms: ['HASH_MISMATCH', 'STALE_TARGET_DIR', 'TIMESTAMP_DRIFT']
};

const candidateHypotheses = [
  {
    id: 'H_SYNC',
    title: 'Desfase por omisión del flag --sync en ejecución de script',
    explainedSymptoms: ['HASH_MISMATCH', 'STALE_TARGET_DIR', 'TIMESTAMP_DRIFT'],
    simplicityScore: 0.95,
    priorProbability: 0.85,
    falsificationCheck: 'Ejecutar sync_mirror_gate.js --sync y comprobar si la paridad sube al 100%'
  },
  {
    id: 'H_FS_CORRUPT',
    title: 'Fallo catastrófico de sectores en bloque de disco duro',
    explainedSymptoms: ['HASH_MISMATCH'],
    simplicityScore: 0.1,
    priorProbability: 0.01,
    falsificationCheck: 'Formatear unidad física'
  }
];

// Invariante 1: Selección de la mejor explicación parsimoniosa
const diagResult = detector.diagnose(testAnomaly, candidateHypotheses);
assert.strictEqual(diagResult.verdict, 'BEST_EXPLANATION_CONFIRMED');
assert.strictEqual(diagResult.isDecisive, true);
assert.strictEqual(diagResult.bestHypothesis.id, 'H_SYNC');
assert.ok(diagResult.bestHypothesis.ibeScore > 0.85);
assert.ok(diagResult.certificateDigest && diagResult.certificateDigest.length === 64);
console.log(`✓ Invariante 1: Mejor explicación IBE confirmada deterministamente (ID: ${diagResult.bestHypothesis.id}, IBE Score: ${diagResult.bestHypothesis.ibeScore})`);

// Invariante 2: Veto fail-closed ante hipótesis insuficientes
const insufficientCandidates = [
  {
    id: 'H_WEAK',
    title: 'Hipótesis que no explica ningún síntoma relevante',
    explainedSymptoms: ['IRRELEVANT_SYMPTOM'],
    simplicityScore: 0.5,
    priorProbability: 0.1
  }
];
const inconclusiveResult = detector.diagnose(testAnomaly, insufficientCandidates);
assert.strictEqual(inconclusiveResult.verdict, 'INCONCLUSIVE_HYPOTHESIS');
assert.strictEqual(inconclusiveResult.isDecisive, false);
assert.strictEqual(inconclusiveResult.bestHypothesis, null);
console.log('✓ Invariante 2: Veto fail-closed INCONCLUSIVE_HYPOTHESIS demostrado ante candidatos insuficientes');

// Invariante 3: Integración con DriveEngine
const driveEngine = new DriveEngine(ROOT);
const driveReport = driveEngine.diagnoseAbductiveAnomaly(testAnomaly, candidateHypotheses);
assert.strictEqual(driveReport.certificateType, 'AbductiveDiagnosisCertificate_v1');
assert.strictEqual(driveReport.bestHypothesis.id, 'H_SYNC');
console.log('✓ Invariante 3: Integración nativa con DriveEngine.diagnoseAbductiveAnomaly() verificada');

console.log('\nPASS AX-F-213 — Invariantes del detector abductivo de anomalías demostrados al 100%.');
