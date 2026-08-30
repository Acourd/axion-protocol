'use strict';

/**
 * Axion Protocol — Invariantes del Motor de Auto-Curación Semántica y Reconciliación de Contratos.
 *
 * Valida de forma estricta:
 * 1. Diagnóstico determinista de fallos (discrepancias de contrato, dependencias y exports).
 * 2. Reconciliación atómica de contratos de API.
 * 3. Inyección segura de dependencias faltantes.
 * 4. Verificación formal previa (Regression + SMT) antes de autorizar código curado.
 * 5. Integración transparente con DriveEngine.
 */

const assert = require('assert');
const path = require('path');
const SemanticAutoHealer = require('../../tools/semantic_auto_healer.js');
const DriveEngine = require('../../tools/drive_engine.js');

console.log('=== AX-F-129 Invariantes de Auto-Curación Semántica y Reconciliación de Contratos ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const healer = new SemanticAutoHealer(ROOT);

// 1. Validar diagnóstico semántico
const diag1 = healer.diagnoseSemanticFailure("Cannot find module './missing_tool.js'", "require('./missing_tool.js')");
assert.strictEqual(diag1.category, 'MISSING_DEPENDENCY');
assert.strictEqual(diag1.missingEntity, './missing_tool.js');
console.log('✓ Diagnóstico semántico validado (MISSING_DEPENDENCY)');

// 2. Validar reconciliación de contratos
const baseCode = `
'use strict';
function execute() {
  return {
    status: 'DONE'
  };
}
module.exports = { execute };
`.trim();

const contractRes = healer.healContractMismatch(baseCode, { success: true, verified: true });
assert.strictEqual(contractRes.success, true);
assert.strictEqual(contractRes.injectedKeysCount, 2);
assert.ok(contractRes.healedCode.includes('success: true'));
assert.ok(contractRes.healedCode.includes('verified: true'));
console.log('✓ Reconciliación de contratos de API validada (2 claves inyectadas)');

// 3. Validar inyección de dependencias
const depRes = healer.healMissingDependency(baseCode, 'node:crypto');
assert.strictEqual(depRes.success, true);
assert.ok(depRes.healedCode.includes("require('node:crypto')"));
console.log('✓ Inyección de dependencias faltantes validada');

// 3b. Validar auto-curación de desreferenciación nula / propiedades no definidas
const unsafeCode = `
'use strict';
function parseUser(user) {
  return user.profile;
}
module.exports = { parseUser };
`.trim();
const nullDiag = healer.diagnoseSemanticFailure("TypeError: Cannot read properties of undefined (reading 'profile')", unsafeCode);
assert.strictEqual(nullDiag.category, 'NULL_DEREFERENCE');
assert.strictEqual(nullDiag.missingEntity, 'profile');
const nullHeal = healer.healNullDereference(unsafeCode, 'profile');
assert.strictEqual(nullHeal.success, true);
assert.ok(nullHeal.healedCode.includes('(user && user.profile)'));
console.log('✓ Auto-curación de desreferenciación nula validada');

// 4. Validar bucle completo de auto-curación con prueba formal
const loopRes = healer.executeHealLoop({
  sourceCode: baseCode,
  errorTrace: 'AssertionError: expected property success to be true',
  contractSpec: { success: true }
});

assert.strictEqual(loopRes.success, true, 'El bucle de auto-curación debe ser exitoso');
assert.strictEqual(loopRes.strategy, 'CONTRACT_RECONCILIATION');
assert.strictEqual(loopRes.safetyVerdict, 'FORMALLY_PROVEN_SAFE');
assert.ok(loopRes.healedCode.includes('success: true'));
console.log(`✓ Bucle de auto-curación con verificación formal validado: [${loopRes.safetyVerdict}]`);

// 5. Validar integración con DriveEngine
const driveEngine = new DriveEngine(ROOT);
const driveHeal = driveEngine.healCodeSemantics({
  sourceCode: baseCode,
  errorTrace: 'AssertionError: expected property success to be true',
  contractSpec: { success: true }
});

assert.strictEqual(driveHeal.success, true);
console.log('✓ Integración DriveEngine.healCodeSemantics() verificada');

console.log('\nPASS AX-F-129 — Invariantes del motor de auto-curación semántica demostrados al 100%.');
