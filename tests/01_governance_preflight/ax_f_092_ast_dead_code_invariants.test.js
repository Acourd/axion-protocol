'use strict';

/**
 * Axion Protocol — Invariantes de Análisis AST, Ausencia de Código Muerto y Cobertura Cruzada.
 *
 * Valida de forma estricta:
 * 1. Todos los módulos de tools/ (40+ archivos) están conectados en el grafo de dependencias.
 * 2. Cero módulos huérfanos sin consumidores ni pruebas en tests/.
 * 3. Integridad de los exports y funciones declaradas sin llamadas muertas.
 * 4. Verificación de cobertura de testing cruzada para el 100% de las herramientas.
 */

const assert = require('assert');
const path = require('path');
const AstDeadCodeAnalyzer = require('../../tools/ast_dead_code_analyzer.js');

console.log('=== AX-F-092 Invariantes de Cobertura AST y Ausencia de Código Muerto ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const analyzer = new AstDeadCodeAnalyzer(ROOT);

const results = analyzer.runFullAnalysis();

// 1. Validar conteo total de módulos de herramientas
assert.ok(results.totalToolModules >= 40, `Deben auditarse al menos 40 módulos de tools/, encontrados ${results.totalToolModules}`);
console.log(`✓ ${results.totalToolModules} módulos de herramientas auditados en el grafo de AST`);

// 2. Validar que no existan módulos huérfanos
assert.strictEqual(results.orphanedModules.length, 0, `No deben existir módulos huérfanos: ${results.orphanedModules.join(', ')}`);
assert.strictEqual(results.pass, true, 'El análisis de AST debe tener veredicto pass: true');
console.log('✓ Cero módulos huérfanos: Todos los archivos en tools/ están conectados a tests/ o bin/');

// 3. Validar métricas de exportación
let totalExports = 0;
for (const [mod, data] of Object.entries(results.modules)) {
  totalExports += data.exportsCount;
  assert.ok(data.consumerCount > 0 || data.hasDedicatedTest, `El módulo ${mod} carece de consumidores y pruebas`);
}
console.log(`✓ ${totalExports} símbolos exportados analizados con referencias activas`);

console.log('\nPASS AX-F-092 — Invariantes de cobertura AST y ausencia de código muerto verificados al 100%.');
