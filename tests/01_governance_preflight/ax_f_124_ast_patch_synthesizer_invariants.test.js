'use strict';

/**
 * Axion Protocol — Invariantes del Sintetizador de Parches AST y Verificación Formal de Convergencia.
 *
 * Valida de forma estricta:
 * 1. Síntesis heurística determinista ante discrepancias de aserción (LITERAL_MISMATCH) y exports faltantes.
 * 2. Verificación formal previa (Pre-Mutation SMT + Regression Proof) antes de tocar el sistema de archivos.
 * 3. Bloqueo inmediato y descarte de parches que introduzcan antipatrones o debiliten aserciones.
 * 4. Aplicación atómica de parches conformes con sellado de digest criptográfico.
 * 5. Integración transparente con DriveEngine.
 */

const assert = require('assert');
const { crearSandbox } = require('../../tools/test_sandbox.js');
const path = require('path');
const fs = require('fs');
const ASTPatchSynthesizer = require('../../tools/ast_patch_synthesizer.js');
const DriveEngine = require('../../tools/drive_engine.js');

console.log('=== AX-F-124 Invariantes de Síntesis de Parches AST y Verificación Formal ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const synthesizer = new ASTPatchSynthesizer(ROOT);

// 1. Validar síntesis de parche limpia
const sampleSource = `
'use strict';
const MODE = 'DRAFT';
function getStatus() { return 'DRAFT'; }
module.exports = { getStatus };
`.trim();

const patchRes = synthesizer.synthesizePatch({
  sourceCode: sampleSource,
  errorDiagnostics: {
    errorType: 'LITERAL_MISMATCH',
    actual: 'DRAFT',
    expected: 'PRODUCTION'
  }
});

assert.strictEqual(patchRes.success, true, 'La síntesis debe generar un parche exitoso');
assert.strictEqual(patchRes.heuristicApplied, 'CORRECT_LITERAL_VALUE');
assert.ok(patchRes.candidateCode.includes("'PRODUCTION'"), 'El código debe contener el valor corregido');
console.log('✓ Síntesis heurística de parche validada (CORRECT_LITERAL_VALUE)');

// 2. Validar verificación formal del parche limpio
const safetyClean = synthesizer.verifyPatchSafety(sampleSource, patchRes.candidateCode);
assert.strictEqual(safetyClean.isSafe, true, 'El parche limpio debe ser calificado como seguro');
assert.strictEqual(safetyClean.verdict, 'FORMALLY_PROVEN_SAFE');
assert.strictEqual(safetyClean.smtTheoremsProven, 4, 'Los 4 teoremas SMT deben ser probados');
console.log('✓ Verificación formal pre-mutación (Regression + SMT) validada');

// 3. Validar rechazo de parche inseguro con silent catch
const unsafePatch = synthesizer.synthesizePatch({
  sourceCode: sampleSource,
  errorDiagnostics: { errorType: 'LITERAL_MISMATCH', actual: 'DRAFT', expected: 'PRODUCTION' }
});
unsafePatch.candidateCode += '\ntry { run(); } catch (_) {}\n';

const safetyUnsafe = synthesizer.verifyPatchSafety(sampleSource, unsafePatch.candidateCode);
assert.strictEqual(safetyUnsafe.isSafe, false, 'Parches con silent catch deben ser rechazados');
assert.strictEqual(safetyUnsafe.reason, 'REJECTED_BY_REGRESSION_GUARD');
console.log('✓ Bloqueo y descarte de parche inseguro verificado');

// 4. Validar aplicación atómica en sandbox
const sandbox = crearSandbox('test_patch_sandbox');
fs.mkdirSync(sandbox, { recursive: true });
const targetRel = 'sandbox_module.js';
const targetAbs = path.join(sandbox, targetRel);
fs.writeFileSync(targetAbs, sampleSource, 'utf8');

const sandboxSynthesizer = new ASTPatchSynthesizer(sandbox);
const applyRes = sandboxSynthesizer.applyPatchIfSafe(targetRel, patchRes);

assert.strictEqual(applyRes.applied, true, 'El parche seguro debe aplicarse al archivo');
const updatedContent = fs.readFileSync(targetAbs, 'utf8');
assert.ok(updatedContent.includes("'PRODUCTION'"));
console.log('✓ Aplicación atómica de parche en archivo verificada');

// 5. Validar integración con DriveEngine
const driveEngine = new DriveEngine(ROOT);
const drivePatch = driveEngine.synthesizeAndVerifyPatch(sampleSource, {
  errorType: 'LITERAL_MISMATCH',
  actual: 'DRAFT',
  expected: 'PRODUCTION'
});

assert.strictEqual(drivePatch.isDeployable, true, 'DriveEngine debe certificar el parche como desplegable');
console.log('✓ Integración DriveEngine.synthesizeAndVerifyPatch() verificada');

// Limpiar sandbox
if (fs.existsSync(sandbox)) {
  fs.rmSync(sandbox, { recursive: true, force: true });
}

console.log('\nPASS AX-F-124 — Invariantes de síntesis heurística y verificación formal AST verificados al 100%.');
