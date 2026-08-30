'use strict';

/**
 * Axion Protocol — Invariantes del Guardián de Regresiones en Bucle de Convergencia.
 *
 * Valida de forma estricta:
 * 1. Detección estricta de antipatrones prohibidos en código (silent catch, eval, secrets, placeholders).
 * 2. Detección determinista de debilitamiento o eliminación de aserciones de prueba (Test Weakening).
 * 3. Aprobación limpia (CLEAN) de refactorizaciones legítimas sin regresiones.
 * 4. Integración transparente con ConvergenceEngine.
 */

const assert = require('assert');
const path = require('path');
const ConvergenceRegressionGuard = require('../../tools/convergence_regression_guard.js');
const ConvergenceEngine = require('../../tools/convergence_loop.js');

console.log('=== AX-F-114 Invariantes del Guardián de Regresiones en Bucle de Convergencia ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const guard = new ConvergenceRegressionGuard(ROOT);

// 1. Validar auditoría de código con antipatrones
const codeWithSilentCatch = 'function test() { try { op(); } catch (_) {} }';
const auditRes1 = guard.auditCodeContent(codeWithSilentCatch, 'sample.js');
assert.strictEqual(auditRes1.pass, false, 'Código con silent catch no debe pasar');
assert.strictEqual(auditRes1.verdict, 'REJECT_MUTATION');
assert.strictEqual(auditRes1.regressions[0].id, 'SILENT_CATCH');
console.log('✓ Detección de bloque catch mudo validada (REJECT_MUTATION)');

const codeWithEval = 'function run(str) { return eval(str); }';
const auditRes2 = guard.auditCodeContent(codeWithEval, 'eval_test.js');
assert.strictEqual(auditRes2.pass, false);
assert.strictEqual(auditRes2.regressions[0].id, 'RAW_EVAL');
console.log('✓ Detección de uso de eval() validada (REJECT_MUTATION)');

// 2. Validar detección de debilitamiento de tests (Test Assertion Deletion)
const beforeTest = `
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.success, true);
  assert.ok(res.body.token);
`;
const afterTestWeakened = `
  assert.strictEqual(res.status, 200);
`;

const diffRes1 = guard.auditMutationDiff(beforeTest, afterTestWeakened, 'test_suite.js');
assert.strictEqual(diffRes1.pass, false, 'Debilitamiento de aserciones debe ser bloqueado');
assert.strictEqual(diffRes1.verdict, 'REJECT_MUTATION');
assert.strictEqual(diffRes1.regressions[0].id, 'TEST_ASSERTION_DELETION');
console.log('✓ Detección de debilitamiento de aserciones de prueba validada (TEST_ASSERTION_DELETION)');

// 3. Validar mutación limpia legítima (CLEAN)
const beforeClean = 'const count = 10;\nassert.strictEqual(count, 10);';
const afterClean = 'const count = 20;\nassert.strictEqual(count, 20);';
const diffRes2 = guard.auditMutationDiff(beforeClean, afterClean, 'clean_module.js');
assert.strictEqual(diffRes2.pass, true, 'Mutación limpia debe ser aprobada');
assert.strictEqual(diffRes2.verdict, 'CLEAN');
assert.strictEqual(diffRes2.regressionsCount, 0);
console.log('✓ Mutación limpia aprobada sin falsos positivos (CLEAN)');

// 4. Validar integración con ConvergenceEngine
const engine = new ConvergenceEngine(ROOT);
const engineAudit = engine.auditRegressions(beforeClean, afterClean, 'integration.js');
assert.strictEqual(engineAudit.pass, true, 'ConvergenceEngine debe auditar regresiones');
console.log('✓ Integración ConvergenceEngine.auditRegressions() verificada');

console.log('\nPASS AX-F-114 — Invariantes del guardián de regresiones en convergencia verificados al 100%.');
