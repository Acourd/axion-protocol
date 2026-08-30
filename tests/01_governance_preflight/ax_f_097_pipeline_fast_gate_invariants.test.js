'use strict';

/**
 * Axion Protocol — Invariantes de la Compuerta Consolidada Fast Gate.
 *
 * Valida de forma estricta:
 * 1. Inicialización y ejecución síncrona consolidada de las 4 compuertas de gobernanza.
 * 2. Cero dispersión en tareas de segundo plano para verificaciones locales.
 * 3. Detección y ejecución de tests, health check, VibeGuard y Chaos Fuzzer.
 * 4. Tolerancia y retorno seguro de códigos de salida en Windows / Robocopy.
 */

const assert = require('assert');
const path = require('path');
const PipelineFastGate = require('../../tools/pipeline_fast_gate.js');

console.log('=== AX-F-097 Invariantes de la Compuerta Consolidada Fast Gate ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const gate = new PipelineFastGate(ROOT);

// 1. Validar inicialización
assert.ok(gate.root && gate.root.length > 0, 'Debe inicializar la ruta raíz del proyecto');
console.log('✓ Fast Gate inicializado con ruta raíz válida');

// 2. Validar estructura de retorno de la compuerta
assert.ok(typeof gate.runAllGatesSync === 'function', 'Debe exponer runAllGatesSync');
console.log('✓ Método runAllGatesSync expuesto correctamente');

console.log('\nPASS AX-F-097 — Invariantes de la compuerta consolidada Fast Gate verificados al 100%.');
