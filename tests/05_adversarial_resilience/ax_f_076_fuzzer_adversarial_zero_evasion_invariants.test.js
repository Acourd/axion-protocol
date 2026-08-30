'use strict';

const assert = require('assert');
const AdversarialFuzzer = require('../../tools/fuzzer.js');

console.log('=== AX-F-076 Invariantes Adversariales del Fuzzer y Tasa de Intercepción Cero Evasión ===\n');

const fuzzer = new AdversarialFuzzer();

// 1. Manejo seguro de entradas vacías o no textuales
const rNull = fuzzer.testPreflight(null);
assert.strictEqual(rNull.blocked, true);
assert.strictEqual(rNull.decision, 'DENY');

const rVacio = fuzzer.testPreflight('   ');
assert.strictEqual(rVacio.blocked, true);
assert.strictEqual(rVacio.decision, 'DENY');
console.log('✓ Manejo seguro y fail-closed de comandos no válidos en testPreflight verificado');

// 2. Comprobación del corpus completo de ataques (100+ vectores)
const corpus = AdversarialFuzzer.getAttackCorpus();
assert.strictEqual(Array.isArray(corpus), true);
assert.strictEqual(corpus.length >= 100, true, `El corpus debe contener al menos 100 vectores (actual: ${corpus.length})`);

const categoriasEsperadas = [
  'UNIX_DIRECT',
  'WIN_DIRECT',
  'OBFUSCATED_PIPE',
  'SUBSHELL_EVAL',
  'VAR_EXPANSION',
  'PS_IEX_DOWNLOAD',
  'GIT_DESTRUCTIVE',
  'CHAINED_OPERATORS'
];

for (const cat of categoriasEsperadas) {
  assert.strictEqual(corpus.some((item) => item.category === cat), true, `Debe contener la categoría ${cat}`);
}
console.log(`✓ Cobertura del corpus de ${corpus.length} vectores en 8 categorías verificada`);

// 3. Ejecución de la suite completa de fuzzing adversarial (Meta: 100% intercepción, 0% evasión)
const res = fuzzer.runFullFuzzingSuite();
assert.strictEqual(res.pass, true, 'La suite de fuzzing debe pasar al 100%');
assert.strictEqual(res.evaded, 0, 'No debe existir ninguna evasión');
assert.strictEqual(res.blocked, res.total, 'Todos los vectores deben ser interceptados');
assert.strictEqual(res.evasion_rate, '0.0%');
assert.strictEqual(res.interception_rate, '100.0%');

for (const [cat, data] of Object.entries(res.categories)) {
  assert.strictEqual(data.evaded, 0, `Categoría ${cat} no debe tener evasiones`);
  assert.strictEqual(data.blocked, data.total, `Categoría ${cat} debe interceptar todos sus vectores`);
}
console.log(`✓ 100% de tasa de intercepción (0% evasión) en los ${res.total} vectores demostrada`);

console.log('\nPASS AX-F-076 — Invariantes de fuzzing adversarial demostrados al 100%.\n');
