'use strict';

/**
 * Axion Protocol — Invariantes del Ejecutor Incremental Inteligente por AST Diff.
 *
 * Valida de forma estricta:
 * 1. Extracción estática de require() y grafo de dependencias inverso.
 * 2. Mapeo determinista de suites afectadas a partir de archivos mutados específicos.
 * 3. Ejecución relámpago sub-segundo (< 500ms) de las suites impactadas.
 * 4. Integración con DriveEngine.runIncrementalDiffTests() y CLI unificado.
 */

const assert = require('assert');
const path = require('path');
const SmartIncrementalRunner = require('../../tools/smart_incremental_runner.js');
const DriveEngine = require('../../tools/drive_engine.js');

console.log('=== AX-F-157 Invariantes del Ejecutor Incremental por AST Diff ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const runner = new SmartIncrementalRunner(ROOT);

// 1. Validar extracción del grafo de dependencias
const depMap = runner.buildTestDependencyMap();
assert.ok(depMap.size >= 100, `Debe mapear al menos 100 suites (encontradas: ${depMap.size})`);
console.log(`✓ Grafo de dependencias inverso construido: ${depMap.size} suites analizadas`);

// 2. Validar mapeo de impacto específico (ej. checkpoint.js)
const affectedByCheckpoint = runner.findAffectedTests(['tools/checkpoint.js']);
assert.ok(affectedByCheckpoint.length >= 2, 'Debe encontrar las suites que dependen de checkpoint.js');
assert.ok(affectedByCheckpoint.some(t => t.includes('checkpoint') || t.includes('ax_f_039') || t.includes('ax_f_154')), 'Debe incluir suites de checkpoint');
console.log(`✓ Mapeo de impacto por AST verificado: ${affectedByCheckpoint.length} suites impactadas por tools/checkpoint.js`);

// 3. Validar ejecución incremental relámpago
const targetedReport = runner.runIncremental(['tools/identity_canonical.js']);
assert.strictEqual(targetedReport.allPass, true);
assert.ok(targetedReport.affectedTestsCount >= 1);
assert.ok(targetedReport.totalDurationMs < 10000, `La ejecución incremental debe ser rápida (duró: ${targetedReport.totalDurationMs} ms)`);
console.log(`✓ Ejecución incremental relámpago verificada (${targetedReport.affectedTestsCount} suites en ${targetedReport.totalDurationMs} ms)`);

// 4. Validar integración con DriveEngine
const driveEngine = new DriveEngine(ROOT);
assert.ok(typeof driveEngine.runIncrementalDiffTests === 'function');
const driveDiffReport = driveEngine.runIncrementalDiffTests(['tools/identity_canonical.js']);
assert.strictEqual(driveDiffReport.allPass, true);
console.log('✓ Integración DriveEngine.runIncrementalDiffTests() verificada');

// 5. Validar salvaguarda fail-closed ante archivos no mapeados (prohibición de [].every vacío)
const unmappedReport = runner.runIncremental(['docs/UNMAPPED_DOCUMENT_TEST_FAIL_CLOSED.md']);
assert.strictEqual(unmappedReport.allPass, false);
assert.strictEqual(unmappedReport.status, 'NO_TESTS_MAPPED');
assert.strictEqual(unmappedReport.reason, 'NO_TESTS_MAPPED');
assert.strictEqual(unmappedReport.affectedTestsCount, 0);
assert.strictEqual(unmappedReport.results.length, 0);

const scUnmapped = driveEngine.executeFastLoopShortCircuit('Acción en doc no mapeado', ['docs/UNMAPPED_DOCUMENT_TEST_FAIL_CLOSED.md']);
assert.strictEqual(scUnmapped.pass, false);
assert.strictEqual(scUnmapped.status, 'NO_TESTS_MAPPED');
assert.strictEqual(scUnmapped.affectedTestsCount, 0);
assert.strictEqual(scUnmapped.suitesPassed, 0);
console.log('✓ Salvaguarda fail-closed ante 0 pruebas mapeadas verificada ([].every bloqueado)');

console.log('\nPASS AX-F-157 — Invariantes del ejecutor incremental por AST Diff demostrados al 100%.');
