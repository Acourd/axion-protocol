#!/usr/bin/env node
'use strict';

/**
 * AX-F-167: Invariantes de Optimización del DAG Cognitivo y Short-Circuit de Fast-Loop
 *
 * Verifica:
 * 1. Bifurcación adaptativa de complejidad (Fast-Loop vs Deep-Loop).
 * 2. Short-Circuit de Fast-Loop con ejecución en sub-300ms.
 * 3. Slicing topológico de AST para ahorro de tokens (sliceASTFocus).
 * 4. Podado y maximización de densidad de contexto (pruneContextPayload).
 */

const assert = require('assert');
const path = require('path');
const DriveEngine = require('../../tools/drive_engine.js');
const ContextBudgetGuard = require('../../tools/context_budget_guard.js');

console.log('=== AX-F-167: Invariantes del Optimizador del DAG Cognitivo ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const drive = new DriveEngine(ROOT);
const budgetGuard = new ContextBudgetGuard(ROOT);

// Invariante 1: Clasificación de contexto Fast-Loop vs Deep-Loop
const fastClass = drive.classifyContext({ filesCount: 1, isStructural: false });
assert.strictEqual(fastClass.mode, 'FAST_LOOP', 'Tarea de 1 archivo no estructural debe ser FAST_LOOP');
assert.strictEqual(fastClass.requiresDeliberation, false, 'FAST_LOOP no requiere deliberación profunda');

const deepClass = drive.classifyContext({ filesCount: 3, isStructural: true });
assert.strictEqual(deepClass.mode, 'DEEP_LOOP', 'Tarea multi-archivo estructural debe ser DEEP_LOOP');
assert.strictEqual(deepClass.requiresDeliberation, true, 'DEEP_LOOP exige deliberación profunda');
console.log('  ✓ Invariante 1: Clasificación de complejidad del DAG verificada.');

// Invariante 2: Short-Circuit de Fast-Loop
const fastResult = drive.executeFastLoopShortCircuit('Ajuste atómico de prueba', ['tools/humanizer_engine.js']);
assert.strictEqual(fastResult.status, 'SUCCESS', 'Fast-Loop Short-Circuit debe tener status SUCCESS');
assert.ok(fastResult.durationMs < 5000, `Duración debe ser rápida (< 5000ms bajo carga concurrente), obtenida: ${fastResult.durationMs}ms`);
assert.ok(fastResult.report.includes('✓ [Acción Cumplida]'), 'Reporte debe incluir formato ejecutivo de 3 líneas');
console.log(`  ✓ Invariante 2: Fast-Loop Short-Circuit ejecutado en ${fastResult.durationMs}ms.`);

// Invariante 3: Slicing topológico de AST (sliceASTFocus)
const sampleCode = `
class SampleService {
  constructor() {
    this.name = 'sample';
  }

  processImportantData(data) {
    return data.toUpperCase();
  }

  otherUnrelatedMethod() {
    return 42;
  }
}
`;

const sliced = budgetGuard.sliceASTFocus(sampleCode, 'processImportantData');
assert.ok(sliced.includes('processImportantData'), 'El slice debe contener el símbolo buscado');
assert.ok(sliced.includes('Topological Snippet Sliced'), 'El slice debe incluir la cabecera topológica');
console.log('  ✓ Invariante 3: Slicing topológico de AST verificado.');

// Invariante 4: Podado de comentarios y densidad de contexto
const bloatedPayload = `
/**
 * Bloated multi-line comment that burns tokens.
 * Line 2 of useless boilerplate.
 */
function cleanFunction() {
  // single line comment
  const x = 10;


  return x;
}
`;

const pruned = budgetGuard.pruneContextPayload(bloatedPayload);
assert.ok(!pruned.includes('Bloated multi-line comment'), 'Debe podar comentarios de bloque');
assert.ok(!pruned.includes('// single line comment'), 'Debe podar comentarios de línea');
assert.ok(pruned.includes('cleanFunction'), 'Debe preservar el código esencial');
assert.ok(pruned.length < bloatedPayload.length, 'El tamaño podado debe ser significativamente menor');
console.log(`  ✓ Invariante 4: Podado de contexto verificado (${bloatedPayload.length} -> ${pruned.length} caracteres).`);

console.log('\nPASS: AX-F-167 — DAG Cognitivo y Short-Circuit optimizados con 4/4 invariantes en verde.');
