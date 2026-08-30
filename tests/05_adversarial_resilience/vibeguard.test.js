const assert = require('assert');
const { inspectFileContent } = require('../../tools/vibeguard.js');

console.log('=== Pruebas del Escáner Anti-Vibecoding (VibeGuard) ===\n');

// Caso 1: Código limpio sin antipatrones
const cleanCode = `
function add(a, b) {
  return a + b;
}
`;
const cleanResult = inspectFileContent(cleanCode);
assert.strictEqual(cleanResult.status, 'CLEAN');
assert.strictEqual(cleanResult.totalIssues, 0);
console.log('✓ Código limpio verificado correctamente como CLEAN (PASS)');

// Caso 2: Código con antipatrones típicos de Vibecoding (catch mudo, TODO, !important)
const dirtyCode = `
try {
  doSomething();
} catch (e) {}

// TODO: Implementar validación real
const style = "color: red !important;";
`;
const dirtyResult = inspectFileContent(dirtyCode);
assert.strictEqual(dirtyResult.status, 'ANTIPATTERNS_DETECTED');
assert.strictEqual(dirtyResult.totalIssues, 3);
console.log('✓ Antipatrones de Vibecoding (catch mudo, TODO, !important) detectados con éxito (PASS)');

console.log('\n=== TODAS LAS PRUEBAS DE VIBEGUARD PASARON EXITOSAMENTE (PASS) ===');
