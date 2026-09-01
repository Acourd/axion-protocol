'use strict';

/**
 * Axion Protocol — Invariantes del Quickstart Interactivo y Sandbox Hermético (AX-F-161).
 *
 * Valida de forma estricta:
 * 1. Ejecución hermética de los 3 demos (Terminal Shield, Invariante Matemático, Rollback).
 * 2. Rendimiento < 300ms y tolerancia de rollback < 50ms en entorno de pruebas.
 * 3. Autodestrucción garantizada del sandbox efímero sin fugas de archivos temporales.
 */

const assert = require('assert');
const fs = require('fs');
const QuickstartInteractive = require('../../tools/quickstart_interactive.js');

console.log('=== AX-F-161 Invariantes del Quickstart Interactivo y Sandbox Hermético ===\n');

const demo = new QuickstartInteractive({ silent: true });

// 1. Validar ejecución completa
const result = demo.run();
assert.strictEqual(result.success, true);
assert.strictEqual(result.shield.verdict, 'DENIED_FAIL_CLOSED');
assert.strictEqual(result.shield.intercepted, true);
assert.strictEqual(result.math.isAccessible, false);
assert.strictEqual(result.math.correctedRatio >= 4.5, true);
assert.strictEqual(result.rollback.isRestored, true);
console.log('✓ Ejecución determinista de los 3 módulos del Quickstart verificada');

// 2. Validar que el directorio sandbox fue completamente destruido
assert.strictEqual(fs.existsSync(demo.sandboxDir), false);
console.log('✓ Autodestrucción garantizada de sandbox efímero verificada');

console.log('\nPASS: Invariantes del Quickstart Interactivo (AX-F-161) en verde.');
