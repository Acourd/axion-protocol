'use strict';

/**
 * Axion Protocol — Invariantes del Fuzzer Polimórfico de 2.500 Vectores de Ataque.
 *
 * Valida de forma estricta:
 * 1. Generación exhaustiva de 2.500 vectores en 10 categorías de caos ortogonales (250 c/u).
 * 2. Cero evasión (0.0%) frente a mutaciones destructivas, ofuscadas y homoglyphs.
 * 3. 100.0% de intercepción fail-closed (DENY o NEEDS_HUMAN_REVIEW).
 * 4. Resistencia ante inyecciones Unicode, alternate streams y tuberías anidadas.
 */

const assert = require('assert');
const path = require('path');
const ChaosFuzzer2500 = require('../../tools/chaos_fuzzer_2500.js');

console.log('=== AX-F-102 Invariantes de Fuzzing de Caos Polimórfico (2.500 Vectores) ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const fuzzer = new ChaosFuzzer2500(ROOT);

// 1. Validar conteo y distribución de vectores
assert.strictEqual(fuzzer.vectors.length, 2500, 'Debe generar exactamente 2.500 vectores de ataque');
console.log(`✓ 2.500 vectores de ataque sintéticos generados en memoria`);

// 2. Ejecutar simulación completa de caos
const results = fuzzer.runFullChaosFuzzing();

assert.strictEqual(results.pass, true, 'La simulación de caos debe retornar pass: true');
assert.strictEqual(results.total, 2500, 'El total evaluado debe ser 2.500');
assert.strictEqual(results.blocked, 2500, 'Los 2.500 vectores deben ser interceptados');
assert.strictEqual(results.evaded, 0, 'No debe existir ninguna evasión (0.0%)');

// 3. Validar las 10 categorías ortogonales
const expectedCategories = [
  'UNIX_DESTRUCTIVE_CHAOS',
  'WIN_DESTRUCTIVE_CHAOS',
  'OBFUSCATED_PIPE_PIPELINES',
  'NESTED_SUBSHELL_EVAL',
  'POWERSHELL_IEX_REFLECTIONS',
  'FILE_DESCRIPTOR_STREAM_CORRUPTIONS',
  'ASYNC_SUBPROCESS_ESCAPES',
  'PATH_TRAVERSAL_AND_ADS',
  'GIT_DESTRUCTIVE_AND_HOOKS',
  'UNICODE_HOMOGLYPH_NULL_INJECTIONS'
];

for (const cat of expectedCategories) {
  const catData = results.categories[cat];
  assert.ok(catData, `La categoría ${cat} debe existir en los resultados`);
  assert.strictEqual(catData.total, 250, `La categoría ${cat} debe contar con 250 vectores`);
  assert.strictEqual(catData.blocked, 250, `La categoría ${cat} debe tener 250 vectores interceptados`);
  assert.strictEqual(catData.evaded, 0, `La categoría ${cat} debe tener 0 evasiones`);
  console.log(`✓ [${cat}] 250/250 interceptados (100.0%)`);
}

console.log('\nPASS AX-F-102 — 2.500 vectores de ataque bloqueados al 100% con 0.0% evasión.');
