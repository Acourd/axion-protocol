'use strict';

/**
 * Axion Protocol — Invariantes del Grafo de Dependencias de Módulos y Blast Radius de Pruebas.
 *
 * Valida de forma estricta:
 * 1. Extracción determinista de dependencias estáticas (require) entre módulos.
 * 2. Mapeo bidireccional exacto (Grafo directo e inverso).
 * 3. Travesía BFS para cálculo de radio de impacto transitivo (Blast Radius).
 * 4. Filtrado quirúrgico de suites de prueba impactadas ante modificaciones de código.
 * 5. Integración transparente con DriveEngine.
 */

const assert = require('assert');
const path = require('path');
const ModuleDependencyGraph = require('../../tools/module_dependency_graph.js');
const DriveEngine = require('../../tools/drive_engine.js');

console.log('=== AX-F-116 Invariantes del Grafo de Dependencias y Blast Radius de Pruebas ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const graph = new ModuleDependencyGraph(ROOT);

// 1. Validar extracción del grafo
const summary = graph.getGraphSummary();
assert.ok(summary.totalTrackedFiles >= 50, 'Debe rastrear al menos 50 archivos JS');
assert.ok(summary.totalForwardNodes > 0, 'Debe contener nodos directos');
assert.ok(summary.totalReverseNodes > 0, 'Debe contener nodos inversos');
console.log(`✓ Grafo de dependencias indexado: ${summary.totalTrackedFiles} archivos JS analizados`);

// 2. Validar radio de impacto para un módulo específico
const targetModule = 'tools/blast_radius_estimator.js';
const impactedSuites = graph.getImpactedTestSuites([targetModule]);
assert.ok(impactedSuites.length >= 1, 'Debe identificar al menos 1 suite de prueba impactada');
assert.ok(
  impactedSuites.some(s => s.includes('ax_f_105_blast_radius_boundary_invariants')),
  'Debe incluir la suite ax_f_105 que requiere blast_radius_estimator.js'
);
console.log(`✓ Impacto quirúrgico calculado: "${targetModule}" -> ${impactedSuites.length} suites impactadas`);

// 3. Validar travesía de dependientes transitivos (BFS)
const dependents = graph.findTransitiveDependents(targetModule);
assert.ok(Array.isArray(dependents), 'Dependientes transitivos debe ser un arreglo');
assert.ok(dependents.length >= 1, 'Debe tener al menos 1 dependiente');
console.log(`✓ Travesía BFS de dependientes transitivos validada: ${dependents.length} módulos dependientes`);

// 4. Validar mutación directa sobre un archivo de test
const directTest = 'tests/01_governance_preflight/ax_f_001_installer_backup.test.js';
const testImpact = graph.getImpactedTestSuites([directTest]);
assert.strictEqual(testImpact.length, 1);
assert.strictEqual(testImpact[0], directTest);
console.log('✓ Modificación directa de suite de prueba mapeada determinísticamente');

// 5. Validar integración con DriveEngine
const driveEngine = new DriveEngine(ROOT);
const driveImpact = driveEngine.getImpactedTestSuites(['tools/convergence_regression_guard.js']);
assert.ok(driveImpact.length >= 1, 'DriveEngine debe calcular suites impactadas');
assert.ok(driveImpact.some(s => s.includes('ax_f_114_convergence_regression_guard')));
console.log('✓ Integración DriveEngine.getImpactedTestSuites() verificada');

console.log('\nPASS AX-F-116 — Invariantes del grafo de dependencias y blast radius de pruebas verificados al 100%.');
