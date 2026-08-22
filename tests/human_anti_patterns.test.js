const assert = require('assert');
const { analyzeUserIntent } = require('../tools/intent_clarifier.js');
const { runPreflight } = require('../tools/preflight.js');

console.log('=== Pruebas de Desactivación de Malas Prácticas del Humano (Human Anti-Patterns) ===\n');

// Caso 1: Shotgun Debugging ("no funciona arreglalo")
const shotgunInput = "no funciona arreglalo";
const shotgunRes = analyzeUserIntent(shotgunInput);
assert.strictEqual(shotgunRes.status, 'NEEDS_CLARIFICATION');
console.log('✓ Shotgun Debugging ("no funciona arreglalo") fue detenido por el Aclarador (PASS)');

// Caso 2: Prompt Vago de 2 palabras ("haz login")
const vagueInput = "haz login";
const vagueRes = analyzeUserIntent(vagueInput);
assert.strictEqual(vagueRes.status, 'NEEDS_CLARIFICATION');
console.log('✓ Prompt vago ("haz login") canalizado a clarificación por sub-pasos (PASS)');

// Caso 3: Comando destructivo por impaciencia humana ("rm -rf /")
const dangerousInput = "rm -rf /";
const dangerousRes = runPreflight(dangerousInput);
assert.strictEqual(dangerousRes.status, 'DENY');
console.log('✓ Comando destructivo por impaciencia ("rm -rf /") detenido por Preflight Fail-Closed (PASS)');

console.log('\n=== TODAS LAS PRUEBAS DE ORIENTACIÓN AL HUMANO PASARON EXITOSAMENTE (PASS) ===');
