'use strict';

/**
 * AX-F-222: Invariantes del Centinela Metacognitivo de Drive (M_META_001)
 *
 * Valida de forma determinista la metacognición de segundo orden sobre /drive:
 * 1. Detección heurística de oscilación cíclica de mutaciones (Ping-Pong Loop) y corte inmediato.
 * 2. Protección estricta de archivos críticos en Fast-Loop que fuerza escalamiento a Deep-Loop.
 * 3. Compactación quirúrgica de telemetría de fallos y poda de inflación de tokens (Token Bloat).
 * 4. Validación de no-tautología en pruebas y verificación de la fase RED de TDD.
 * 5. Emisión de DriveMetacognitiveReport_v1 sellado con SHA-256.
 * 6. Integración nativa con DriveEngine (factory, classifyContext blindado, ciclo guard).
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const DriveMetacognitiveSentinel = require('../../tools/drive_metacognitive_sentinel.js');
const DriveEngine = require('../../tools/drive_engine.js');

console.log('=== AX-F-222 Invariantes del Centinela Metacognitivo de Drive (M_META_001) ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const sentinel = new DriveMetacognitiveSentinel({ projectRoot: ROOT });

// -----------------------------------------------------------------------------
// Invariante 1: Detección Heurística de Oscilación Cíclica (Ping-Pong Loop Guard)
// -----------------------------------------------------------------------------
sentinel.clearCycleTracker();

// Secuencia no oscilante: Estados distintos y progresivos (S1 -> S2 -> S3)
const resProg1 = sentinel.recordMutationState({ 'src/mod.js': 'const x = 1;' });
assert.strictEqual(resProg1.isOscillating, false);
assert.strictEqual(resProg1.cycleDetected, false);

const resProg2 = sentinel.recordMutationState({ 'src/mod.js': 'const x = 2;' });
assert.strictEqual(resProg2.isOscillating, false);

const resProg3 = sentinel.recordMutationState({ 'src/mod.js': 'const x = 3;' });
assert.strictEqual(resProg3.isOscillating, false);

// Secuencia oscilante: Reintroducción del estado S2 (Ping-Pong: S1 -> S2 -> S3 -> S2)
const resOsc = sentinel.recordMutationState({ 'src/mod.js': 'const x = 2;' });
assert.strictEqual(resOsc.isOscillating, true);
assert.strictEqual(resOsc.cycleDetected, true);
assert.strictEqual(resOsc.cycleLength, 2);
assert.strictEqual(resOsc.priorIteration, 2);
assert.strictEqual(resOsc.currentIteration, 4);
assert.strictEqual(resOsc.recommendation, 'ABORT_CYCLE_DETECTED');
assert.ok(typeof resOsc.stateDigest === 'string' && resOsc.stateDigest.length === 64);
console.log('✓ Invariante 1a: Oscilación cíclica de estados (Ping-Pong Loop) detectada y abortada con éxito');

// Oscilación de firmas de error (Error A -> Error B -> Error A -> Error B)
sentinel.clearCycleTracker();
sentinel.recordMutationState('state_alpha', { errorSignature: 'FAIL test_suite_auth' });
sentinel.recordMutationState('state_beta', { errorSignature: 'FAIL test_suite_crypto' });
sentinel.recordMutationState('state_gamma', { errorSignature: 'FAIL test_suite_auth' });
const resErrorOsc = sentinel.recordMutationState('state_delta', { errorSignature: 'FAIL test_suite_crypto' });
assert.strictEqual(resErrorOsc.hasErrorOscillation, true);
assert.strictEqual(resErrorOsc.isOscillating, true);
assert.strictEqual(resErrorOsc.cycleDetected, true);
assert.strictEqual(resErrorOsc.recommendation, 'ABORT_CYCLE_DETECTED');
console.log('✓ Invariante 1b: Oscilación de firmas de error interceptada antes del agotamiento de intentos');

// Invariante 1c: Estados nulos o indefinidos consecutivos no deben disparar falso ciclo de estados
sentinel.clearCycleTracker();
const nullRes1 = sentinel.recordMutationState(null);
const nullRes2 = sentinel.recordMutationState(null);
assert.strictEqual(nullRes1.isOscillating, false);
assert.strictEqual(nullRes2.isOscillating, false);
assert.strictEqual(nullRes2.cycleDetected, false);
console.log('✓ Invariante 1c: Ausencia de descriptor de estado no genera falsos positivos de ciclo');

// -----------------------------------------------------------------------------
// Invariante 2: Punto Ciego de Blast Radius en Fast-Loop (Escalamiento a Deep-Loop)
// -----------------------------------------------------------------------------
// Archivos inocuos (1 o 2 archivos no críticos) deben permitirse en FAST_LOOP
const safeCheck = sentinel.evaluateFastLoopSafety(['docs/API.md', 'examples/demo.js']);
assert.strictEqual(safeCheck.allowed, true);
assert.strictEqual(safeCheck.mode, 'FAST_LOOP');
assert.strictEqual(safeCheck.requiresDeliberation, false);

// Archivo crítico central del orquestador (drive_engine.js): DEBE ser bloqueado en Fast-Loop
assert.strictEqual(sentinel.isCriticalFile('tools/drive_engine.js'), true);
const engineCheck = sentinel.evaluateFastLoopSafety(['tools/drive_engine.js']);
assert.strictEqual(engineCheck.allowed, false);
assert.strictEqual(engineCheck.escalatedMode, 'DEEP_LOOP');
assert.strictEqual(engineCheck.requiresDeliberation, true);
assert.strictEqual(engineCheck.reason, 'CRITICAL_FILE_PROTECTED');
assert.ok(engineCheck.criticalFiles.includes('tools/drive_engine.js'));

// Archivos de manifiesto, hooks, criptografía y gobernanza
const criticalList = [
  'package.json',
  '.git/hooks/pre-commit',
  '.github/workflows/ci.yml',
  'policies/security_policy.json',
  'tools/approval_ed25519.js',
  'tools/killswitch.js',
  'tools/agent_shield.js',
  'bin/axion.js'
];

for (const critFile of criticalList) {
  assert.strictEqual(sentinel.isCriticalFile(critFile), true, `Archivo ${critFile} debe ser clasificado como crítico`);
  const critCheck = sentinel.evaluateFastLoopSafety([critFile]);
  assert.strictEqual(critCheck.allowed, false, `Fast-Loop no debe permitir ${critFile}`);
  assert.strictEqual(critCheck.escalatedMode, 'DEEP_LOOP');
}

// Más de 2 archivos inocuos deben escalar a DEEP_LOOP por blast radius multi-archivo
const multiSafeCheck = sentinel.evaluateFastLoopSafety(['src/a.js', 'src/b.js', 'src/c.js']);
assert.strictEqual(multiSafeCheck.allowed, false);
assert.strictEqual(multiSafeCheck.escalatedMode, 'DEEP_LOOP');
assert.strictEqual(multiSafeCheck.reason, 'MULTI_FILE_CHANGE');

// Invariante 2b: Rutas absolutas Windows (con mayúsculas o barras normalizadas) son críticas
const winAbsCritical = path.resolve(ROOT, 'tools', 'drive_engine.js');
assert.strictEqual(sentinel.isCriticalFile(winAbsCritical), true);
const winAbsCheck = sentinel.evaluateFastLoopSafety([winAbsCritical]);
assert.strictEqual(winAbsCheck.allowed, false);
assert.strictEqual(winAbsCheck.escalatedMode, 'DEEP_LOOP');
console.log('✓ Invariante 2: Bloqueo estricto de bypass en Fast-Loop para archivos críticos (relativos y absolutos Windows) verificado');

// -----------------------------------------------------------------------------
// Invariante 3: Compactación de Telemetría de Fallos y Poda de Contexto
// -----------------------------------------------------------------------------
// Simular salida masiva de 200 líneas con 1 fallo quirúrgico
const rawTerminalOutput = [
  'Ejecutando suites de prueba...',
  ...Array.from({ length: 180 }, (_, i) => `  ✓ [01_governance] ax_f_${String(i).padStart(3, '0')}_test (50ms)`),
  '  FAIL [01_governance] ax_f_999_critical_regression (salida 1)',
  '  AssertionError [ERR_ASSERTION]: Expected false to be true',
  '      at Object.<anonymous> (tests/01_governance/ax_f_999.test.js:42:10)',
  '      at Module._compile (node:internal/modules/cjs/loader:1546:14)',
  '==================================================',
  'RESUMEN: 180 pasadas, 1 fallida. Tiempo: 4.2s'
].join('\n');

const compactionRes = sentinel.compactFailureTelemetry(rawTerminalOutput, { maxContextLines: 25 });
assert.ok(compactionRes.originalTokens > compactionRes.compactedTokens);
assert.ok(compactionRes.savedTokens > 500, `Debe ahorrar sustanciales tokens (ahorrados: ${compactionRes.savedTokens})`);
assert.ok(compactionRes.savingsPercent >= 50.0);
assert.ok(compactionRes.compactedOutput.includes('ax_f_999_critical_regression'));
assert.ok(compactionRes.compactedOutput.includes('ERR_ASSERTION'));
assert.ok(compactionRes.compactedOutput.includes('líneas omitidas') || compactionRes.compactedOutput.includes('podadas'));
assert.strictEqual(compactionRes.digest.length, 64);

// Compactación de Diff con verificación de reversibilidad
const origCode = 'function calc() {\n  return 42;\n}\nmodule.exports = calc;\n';
const modCode = 'function calc() {\n  return 100;\n}\nmodule.exports = calc;\n';
const diffRes = sentinel.compactMutationDiff(origCode, modCode);
assert.strictEqual(diffRes.isReversibleVerified, true);
assert.ok(diffRes.diffText.includes('-  return 42;'));
assert.ok(diffRes.diffText.includes('+  return 100;'));
console.log(`✓ Invariante 3: Poda de telemetría (${compactionRes.savingsPercent}% tokens ahorrados) y diff compacto verificados`);

// -----------------------------------------------------------------------------
// Invariante 4: Validación de No-Tautología en Pruebas y Fase RED de TDD
// -----------------------------------------------------------------------------
// 4a. Detección de aserciones tautológicas vacías
const tautologicalCode1 = `
  const assert = require('assert');
  assert.ok(true);
  assert.strictEqual(1, 1);
`;
const checkTaut1 = sentinel.validateTestNonTautology(tautologicalCode1);
assert.strictEqual(checkTaut1.isTautological, true);
assert.strictEqual(checkTaut1.isValid, false);
assert.ok(checkTaut1.violations.length >= 2);

const tautologicalCode2 = `
  const assert = require('assert');
  const res = "some string";
  assert.strictEqual(typeof res, 'string');
`;
const checkTaut2 = sentinel.validateTestNonTautology(tautologicalCode2);
assert.strictEqual(checkTaut2.isTautological, true);
assert.strictEqual(checkTaut2.isValid, false);

const validTestCode = `
  const assert = require('assert');
  const result = calculateHash('test_data');
  assert.strictEqual(result.length, 64);
  assert.ok(result.startsWith('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'));
`;
const checkValid = sentinel.validateTestNonTautology(validTestCode);
assert.strictEqual(checkValid.isTautological, false);
assert.strictEqual(checkValid.isValid, true);
assert.strictEqual(checkValid.violations.length, 0);
assert.ok(checkValid.assertionCount >= 2);

// 4c. Comprobación no-tautológica legítima (typeof seguido de aserción de valor sobre la misma variable)
const validWithTypeOf = `
  const assert = require('assert');
  const payload = getPayload();
  assert.strictEqual(typeof payload, 'string');
  assert.strictEqual(payload, 'EXPECTED_DATA');
`;
const checkValidWithTypeOf = sentinel.validateTestNonTautology(validWithTypeOf);
assert.strictEqual(checkValidWithTypeOf.isValid, true);
assert.strictEqual(checkValidWithTypeOf.isTautological, false);
assert.strictEqual(checkValidWithTypeOf.violations.length, 0);

// 4b. Verificación de Fase RED de TDD (la prueba debe fallar sobre la línea base sin implementar)
const failingRedTest = () => {
  assert.strictEqual('NOT_IMPLEMENTED', 'DESIRED_OUTPUT');
};
const redPhasePass = sentinel.verifyRedPhase(failingRedTest);
assert.strictEqual(redPhasePass.validRedPhase, true);
assert.strictEqual(redPhasePass.status, 'GENUINE_RED_PHASE_VERIFIED');
assert.strictEqual(redPhasePass.passedBaseline, false);

// Una prueba que pasa sobre la línea base vacía/no implementada no es un RED válido (falso verde)
const vacuousGreenTest = () => {
  // Pasa inmediatamente sin probar nada nuevo
  return true;
};
const redPhaseFail = sentinel.verifyRedPhase(vacuousGreenTest);
assert.strictEqual(redPhaseFail.validRedPhase, false);
assert.strictEqual(redPhaseFail.passedBaseline, true);
assert.strictEqual(redPhaseFail.reason, 'TAUTOLOGICAL_OR_PRE_PASSING');
console.log('✓ Invariante 4: Filtro de pruebas tautológicas y verificación formal de fase RED demostrados');

// -----------------------------------------------------------------------------
// Invariante 5: Emisión de Reporte Metacognitivo Sellado
// -----------------------------------------------------------------------------
const auditReport = sentinel.runMetacognitiveAudit({
  files: ['src/safe_module.js'],
  testSourceCode: validTestCode,
  terminalOutput: rawTerminalOutput
});
assert.strictEqual(auditReport.reportType, 'DriveMetacognitiveReport_v1');
assert.strictEqual(typeof auditReport.reportDigest, 'string');
assert.strictEqual(auditReport.reportDigest.length, 64);
assert.strictEqual(auditReport.evaluation.fastLoopSafety.allowed, true);
assert.strictEqual(auditReport.evaluation.testValidation.isValid, true);
assert.ok(auditReport.evaluation.telemetryCompacted.savedTokens > 0);
console.log('✓ Invariante 5: DriveMetacognitiveReport_v1 emitido con digest SHA-256: ' + auditReport.reportDigest.slice(0, 16) + '...');

// -----------------------------------------------------------------------------
// Invariante 6: Integración Nativa con DriveEngine
// -----------------------------------------------------------------------------
const engine = new DriveEngine(ROOT);

// Factory method
const engineSentinel = engine.getMetacognitiveSentinel();
assert.ok(engineSentinel instanceof DriveMetacognitiveSentinel);

// classifyContext blindado contra punto ciego de blast radius
const classifiedEngine = engine.classifyContext({ files: ['tools/drive_engine.js'] });
assert.strictEqual(classifiedEngine.mode, 'DEEP_LOOP');
assert.strictEqual(classifiedEngine.requiresDeliberation, true);
assert.ok(classifiedEngine.reason.includes('Archivo crítico protegido') || classifiedEngine.reason.includes('crítico'));

// runWithBacktracking con cycle guard
let cycleAttempt = 0;
const cyclingTask = () => {
  cycleAttempt++;
  // Genera estado oscilante: 1 -> 2 -> 1 -> 2
  const state = cycleAttempt % 2 === 1 ? 'STATE_A' : 'STATE_B';
  return {
    pass: false,
    state,
    error: new Error('Fallo simulado')
  };
};

const backtrackResult = engine.runWithBacktracking(cyclingTask, { maxAttempts: 6 });
assert.strictEqual(backtrackResult.success, false);
assert.strictEqual(backtrackResult.abortedByCycle, true);
assert.ok(backtrackResult.attempts < 6, `Debe abortar antes de agotar 6 intentos (abortó en intento ${backtrackResult.attempts})`);
assert.ok(backtrackResult.error.includes('Oscilación de mutaciones detectada'));

// Invariante 6b: Excepciones lanzadas en patrón alternante interceptadas en runWithBacktracking
let throwAttempt = 0;
const alternatingThrowTask = () => {
  throwAttempt++;
  if (throwAttempt % 2 === 1) {
    throw new Error('FAIL_AUTH_SUITE');
  } else {
    throw new Error('FAIL_CRYPTO_SUITE');
  }
};
const throwBacktrack = engine.runWithBacktracking(alternatingThrowTask, { maxAttempts: 6, autoCheckpoint: false });
assert.strictEqual(throwBacktrack.success, false);
assert.strictEqual(throwBacktrack.abortedByCycle, true);
assert.ok(throwBacktrack.attempts < 6, `Debe abortar por oscilación de errores antes de agotar 6 intentos (abortó en intento ${throwBacktrack.attempts})`);
assert.ok(throwBacktrack.error.includes('Oscilación de mutaciones detectada'));

// Compactación de telemetría a través del motor
const compactedFromEngine = engine.compactFailureTelemetry(rawTerminalOutput);
assert.ok(compactedFromEngine.savedTokens > 0);
console.log('✓ Invariante 6: Integración nativa en DriveEngine verificada (factory, blast radius gate, cycle guard)');

console.log('\nPASS AX-F-222 — Invariantes de DriveMetacognitiveSentinel demostrados al 100%.');
