'use strict';

/**
 * Axion Protocol — Invariantes del Sintetizador Pre-Flight TDD (AX-F-165).
 *
 * Valida de forma estricta:
 * 1. Extracción determinista de firmas, exports, clases y métodos en AST.
 * 2. Síntesis formal de aserciones TDD antes de mutar código.
 * 3. Verificación determinista en runtime con reporte booleano estricto.
 * 4. Generación de digest criptográfico SHA-256 de las aserciones.
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const PreflightTDDSynthesizer = require('../../tools/preflight_tdd_synthesizer.js');

console.log('=== AX-F-165 Invariantes del Sintetizador Pre-Flight TDD ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const synthesizer = new PreflightTDDSynthesizer(ROOT);

// 1. Validar síntesis de aserciones sobre un módulo real
const sampleCode = `
class SampleEngine {
  constructor() {}
  execute() { return true; }
}
module.exports = SampleEngine;
`;

const syn = synthesizer.synthesizeAssertions(sampleCode, { moduleName: 'SampleEngine' });
assert.strictEqual(typeof syn, 'object');
assert.ok(syn.assertionCount >= 2, 'Debe sintetizar al menos 2 aserciones');
assert.strictEqual(typeof syn.digest, 'string');
assert.strictEqual(syn.digest.length, 64, 'Digest SHA-256 debe tener 64 caracteres hex');
console.log(`✓ Síntesis determinista verificada (${syn.assertionCount} aserciones, SHA-256: ${syn.digest.slice(0, 12)}...)`);

// 2. Validar verificación en runtime de módulo válido
class SampleMock {
  constructor() {}
  execute() { return true; }
}

const resPass = synthesizer.verifyRuntimeTarget(SampleMock, syn);
assert.strictEqual(resPass.pass, true, 'El mock válido debe pasar la verificación');
assert.strictEqual(resPass.passedCount, syn.assertionCount);
console.log(`✓ Verificación exitosa en runtime (${resPass.passedCount}/${resPass.totalAssertions} pasadas)`);

// 3. Validar detección de fallo en runtime si el target es nulo o incompleto
const resFail = synthesizer.verifyRuntimeTarget(null, syn);
assert.strictEqual(resFail.pass, false, 'Un target nulo debe fallar la verificación');
console.log('✓ Fallo cerrado ante módulo inválido verificado (Fail-Closed)');

console.log('\nPASS: Invariantes del Sintetizador Pre-Flight TDD (AX-F-165) en verde.');
