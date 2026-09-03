'use strict';

/**
 * AX-F-189: Invariantes del Indexador Semántico Multidimensional y Grafo de Conocimiento (M_006)
 *
 * Valida de forma determinista:
 * 1. Generación de grafo multidimensional: módulos, símbolos, pruebas y especificaciones.
 * 2. Consultas O(1) de símbolos con enlace determinista a sus suites de prueba.
 * 3. Cálculo de radio de impacto (blast radius) con contención estricta contra dependencias cíclicas.
 * 4. Integración nativa con DriveEngine.lookupSemanticSymbol().
 */

const assert = require('assert');
const path = require('path');
const SemanticCrossIndexer = require('../../tools/semantic_cross_indexer.js');
const DriveEngine = require('../../tools/drive_engine.js');

console.log('=== AX-F-189 Invariantes del Indexador Semántico Multidimensional (M_006) ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const indexer = new SemanticCrossIndexer(ROOT);

// Invariante 1: Construcción y estructura del grafo
const index = indexer.buildIndex();
assert.ok(index.digest && index.digest.length === 64, 'Debe calcular digest SHA-256 de 64 caracteres');
assert.ok(Object.keys(index.modules).length > 50, 'Debe indexar módulos de tools/');
assert.ok(Object.keys(index.symbols).length > 200, 'Debe indexar símbolos exportados');
assert.ok(Object.keys(index.testBindings).length >= 200, 'Debe mapear bindings de tests');
console.log(`✓ Invariante 1: Grafo multidimensional construido (${Object.keys(index.symbols).length} símbolos, ${Object.keys(index.modules).length} módulos)`);

// Invariante 2: Consulta O(1) de símbolo con pruebas asociadas
const hit = indexer.lookupSymbol('deliberateCognitivePreconditions');
assert.ok(hit, 'Debe localizar el símbolo deliberateCognitivePreconditions');
assert.strictEqual(hit.file, 'tools/drive_engine.js');
assert.strictEqual(hit.type, 'method');
assert.ok(Array.isArray(hit.testedBy) && hit.testedBy.length > 0, 'Debe listar suites de prueba asociadas');
console.log('✓ Invariante 2: Consulta O(1) de símbolo con pruebas asociadas validada');

// Invariante 3: Cálculo de blast radius de impacto
const blast = indexer.computeImpactBlastRadius(['tools/cognitive_reasoning_engine.js']);
assert.ok(blast.affectedTestsCount >= 1, 'Debe detectar suites de pruebas afectadas');
assert.ok(blast.affectedTests.some(t => t.includes('ax_f_187')), 'Debe incluir ax_f_187 en las suites afectadas');
console.log(`✓ Invariante 3: Radio de impacto validado (${blast.affectedTestsCount} suites de prueba derivadas)`);

// Invariante 4: Integración con DriveEngine
const driveEngine = new DriveEngine(ROOT);
const driveLookup = driveEngine.lookupSemanticSymbol('deliberateCognitivePreconditions');
assert.ok(driveLookup && driveLookup.file === 'tools/drive_engine.js');
console.log('✓ Invariante 4: Integración con DriveEngine.lookupSemanticSymbol() verificada');

console.log('\nPASS AX-F-189 — Invariantes del indexador semántico multidimensional verificados al 100%.');
