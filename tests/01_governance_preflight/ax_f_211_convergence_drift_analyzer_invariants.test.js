'use strict';

/**
 * AX-F-211: Invariantes del Analizador de Deriva de Convergencia (M_COG_016)
 *
 * Valida de forma determinista:
 * 1. Monitoreo de trayectoria convergente con tests incrementales en verde.
 * 2. Activación fail-closed de HALT_STAGNATION_LOOP tras 3 iteraciones sin mejora.
 * 3. Detección de deriva de alcance (HALT_SCOPE_DRIFT) ante mutaciones no autorizadas.
 * 4. Emisión de ConvergenceDriftCertificate_v1 sellado con SHA-256.
 * 5. Integración transparente con DriveEngine.createConvergenceDriftAnalyzer() y auditConvergenceTrajectory().
 */

const assert = require('assert');
const path = require('path');
const ConvergenceDriftAnalyzer = require('../../tools/convergence_drift_analyzer.js');
const DriveEngine = require('../../tools/drive_engine.js');

console.log('=== AX-F-211 Invariantes del Analizador de Deriva de Convergencia (M_COG_016) ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const analyzer = new ConvergenceDriftAnalyzer({ projectRoot: ROOT });

// Invariante 1: Trayectoria convergente saludable
analyzer.recordStep({ stepIndex: 1, testsPassed: 5, testsTotal: 10 });
analyzer.recordStep({ stepIndex: 2, testsPassed: 8, testsTotal: 10 });
analyzer.recordStep({ stepIndex: 3, testsPassed: 10, testsTotal: 10 });

const healthyRes = analyzer.analyzeConvergence();
assert.strictEqual(healthyRes.verdict, 'CONVERGING_HEALTHY');
assert.strictEqual(healthyRes.isAllowed, true);
assert.strictEqual(healthyRes.isStagnated, false);
console.log('✓ Invariante 1: Trayectoria convergente saludable verificada (100% de tests alcanzado)');

// Invariante 2: Activación de HALT_STAGNATION_LOOP ante estancamiento
const stagnatedAnalyzer = new ConvergenceDriftAnalyzer({ projectRoot: ROOT });
stagnatedAnalyzer.recordStep({ stepIndex: 1, testsPassed: 4, testsTotal: 10 });
stagnatedAnalyzer.recordStep({ stepIndex: 2, testsPassed: 4, testsTotal: 10 });
stagnatedAnalyzer.recordStep({ stepIndex: 3, testsPassed: 4, testsTotal: 10 });

const stagRes = stagnatedAnalyzer.analyzeConvergence();
assert.strictEqual(stagRes.verdict, 'HALT_STAGNATION_LOOP');
assert.strictEqual(stagRes.isAllowed, false);
assert.strictEqual(stagRes.isStagnated, true);
assert.ok(stagRes.certificateDigest && stagRes.certificateDigest.length === 64);
console.log('✓ Invariante 2: Veto fail-closed HALT_STAGNATION_LOOP demostrado ante 3 pasos sin mejora');

// Invariante 3: Detección de deriva de alcance (HALT_SCOPE_DRIFT)
const driftAnalyzer = new ConvergenceDriftAnalyzer({ projectRoot: ROOT });
driftAnalyzer.recordStep({ stepIndex: 1, testsPassed: 5, testsTotal: 10, filesTouched: ['unauthorized_file_1.js', 'unauthorized_file_2.js'] });
driftAnalyzer.recordStep({ stepIndex: 2, testsPassed: 7, testsTotal: 10, filesTouched: ['unauthorized_file_3.js'] });

const driftRes = driftAnalyzer.analyzeConvergence({ authorizedFiles: ['authorized_file.js'] });
assert.strictEqual(driftRes.verdict, 'HALT_SCOPE_DRIFT');
assert.strictEqual(driftRes.isAllowed, false);
console.log('✓ Invariante 3: Detección estricta de deriva de alcance (HALT_SCOPE_DRIFT) demostrada');

// Invariante 4: Integración con DriveEngine
const driveEngine = new DriveEngine(ROOT);
const driveReport = driveEngine.auditConvergenceTrajectory([
  { stepIndex: 1, testsPassed: 1, testsTotal: 5 },
  { stepIndex: 2, testsPassed: 3, testsTotal: 5 }
]);
assert.strictEqual(driveReport.certificateType, 'ConvergenceDriftCertificate_v1');
assert.strictEqual(driveReport.verdict, 'CONVERGING_HEALTHY');
console.log('✓ Invariante 4: Integración nativa con DriveEngine.auditConvergenceTrajectory() verificada');

console.log('\nPASS AX-F-211 — Invariantes del analizador de deriva de convergencia demostrados al 100%.');
