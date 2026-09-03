'use strict';

/**
 * AX-F-193: Invariantes del Inyector Dinámico de Precondiciones AST (M_COG_005)
 *
 * Valida de forma determinista:
 * 1. Discriminación estricta entre parámetros obligatorios y opcionales (default values).
 * 2. Inyección atómica de guardas de precondición (typeof, falsy) en el prólogo funcional.
 * 3. Verificación sintáctica formal en sandbox de la fuente enriquecida.
 * 4. Integración transparente con DriveEngine.injectDynamicInvariants().
 */

const assert = require('assert');
const path = require('path');
const DynamicInvariantAssertor = require('../../tools/dynamic_invariant_assertor.js');
const DriveEngine = require('../../tools/drive_engine.js');

console.log('=== AX-F-193 Invariantes del Inyector Dinámico de Precondiciones (M_COG_005) ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const assertor = new DynamicInvariantAssertor(ROOT);

// Invariante 1: Extracción de parámetros obligatorios vs opcionales
const parsed = assertor.parseParameters('targetFile, options = {}, isStrict = false');
assert.strictEqual(parsed.length, 3);
assert.strictEqual(parsed[0].name, 'targetFile');
assert.strictEqual(parsed[0].isOptional, false, 'targetFile debe ser obligatorio');
assert.strictEqual(parsed[1].name, 'options');
assert.strictEqual(parsed[1].isOptional, true, 'options con default {} debe ser opcional');
assert.strictEqual(parsed[2].name, 'isStrict');
assert.strictEqual(parsed[2].isOptional, true, 'isStrict con default false debe ser opcional');
console.log('✓ Invariante 1: Clasificación de parámetros obligatorios y opcionales validada');

// Invariante 2: Inyección atómica de guarda
const sampleFunc = `
  function executeMission(missionId, options = {}) {
    return missionId.toUpperCase();
  }
`;
const injectionResult = assertor.injectGuards(sampleFunc);
assert.strictEqual(injectionResult.modified, true);
assert.strictEqual(injectionResult.injectedGuardsCount, 1);
assert.ok(injectionResult.source.includes("if (!missionId) throw new TypeError('PRECONDITION_FAILED: missionId is required');"));
console.log('✓ Invariante 2: Inyección atómica de guarda de precondición verificada');

// Invariante 3: Verificación formal en sandbox y ejecución fail-closed
const processed = assertor.processSource(sampleFunc);
assert.strictEqual(processed.success, true);
assert.strictEqual(processed.verificationStatus, 'INJECTION_FORMALLY_VERIFIED');

// Comprobar comportamiento de la función inyectada
const fn = new Function(processed.assertedSource + '\nreturn executeMission;');
const generatedFn = fn();

// Ejecución con argumento válido -> Éxito
assert.strictEqual(generatedFn('m_001'), 'M_001');

// Ejecución con argumento nulo -> Fail-Closed inmediato con PRECONDITION_FAILED
assert.throws(() => {
  generatedFn(null);
}, /PRECONDITION_FAILED: missionId is required/);
console.log('✓ Invariante 3: Ejecución fail-closed inmediata demostrada en sandbox');

// Invariante 4: Integración con DriveEngine
const driveEngine = new DriveEngine(ROOT);
const driveProcessed = driveEngine.injectDynamicInvariants(sampleFunc);
assert.strictEqual(driveProcessed.success, true);
assert.strictEqual(driveProcessed.injectedGuardsCount, 1);
console.log('✓ Invariante 4: Integración nativa con DriveEngine.injectDynamicInvariants() verificada');

console.log('\nPASS AX-F-193 — Invariantes del inyector dinámico de precondiciones demostrados al 100%.');
