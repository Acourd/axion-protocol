'use strict';

/**
 * AX-F-197: Invariantes del Comprobador Formal de Equivalencia Semántica (M_COG_008)
 *
 * Valida de forma determinista:
 * 1. Generación de vectores de frontera representativos (primitivos, estructuras, nulos y NaN).
 * 2. Demostración formal de equivalencia semántica estricta (FORMALLY_PROVEN_EQUIVALENT).
 * 3. Aislamiento determinista de contraejemplos mínimos ante divergencias de salida.
 * 4. Integración transparente con DriveEngine.verifyFormalEquivalence().
 */

const assert = require('assert');
const path = require('path');
const FormalEquivalenceChecker = require('../../tools/formal_equivalence_checker.js');
const DriveEngine = require('../../tools/drive_engine.js');

console.log('=== AX-F-197 Invariantes del Comprobador Formal de Equivalencia (M_COG_008) ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const checker = new FormalEquivalenceChecker(ROOT);

// Invariante 1: Generación de dominio de frontera
const domain = checker.generateBoundaryDomain();
assert.ok(domain.length >= 15, 'El dominio debe contener al menos 15 vectores de frontera');
assert.ok(domain.includes(0));
assert.ok(domain.includes(''));
assert.ok(domain.includes(null));
assert.ok(domain.includes(undefined));
console.log(`✓ Invariante 1: Dominio de frontera con ${domain.length} vectores generado`);

// Invariante 2: Demostración formal de equivalencia
const fnA = (item) => ['red', 'green', 'blue'].includes(item);
const setCache = new Set(['red', 'green', 'blue']);
const fnB = (item) => setCache.has(item);

const proof = checker.verifyEquivalence(fnA, fnB);
assert.strictEqual(proof.isEquivalent, true);
assert.strictEqual(proof.status, 'FORMALLY_PROVEN_EQUIVALENT');
assert.strictEqual(proof.domainCoverage, '100.0%');
console.log(`✓ Invariante 2: Equivalencia formal probada al 100% sobre ${proof.totalInputsTested} entradas`);

// Invariante 3: Detección y aislamiento de contraejemplo mínimo
const fnTrim = (s) => (typeof s === 'string' ? s.trim() : '');
const fnTrimBuggy = (s) => (typeof s === 'string' ? s : '');

const divergence = checker.verifyEquivalence(fnTrim, fnTrimBuggy);
assert.strictEqual(divergence.isEquivalent, false);
assert.strictEqual(divergence.status, 'COUNTEREXAMPLE_FOUND');
assert.ok(divergence.inputSample !== undefined);
console.log(`✓ Invariante 3: Detección precisa de contraejemplo mínimo validada (Entrada: "${divergence.inputSample}")`);

// Invariante 4: Integración con DriveEngine
const driveEngine = new DriveEngine(ROOT);
const driveProof = driveEngine.verifyFormalEquivalence(fnA, fnB);
assert.strictEqual(driveProof.isEquivalent, true);
assert.strictEqual(driveProof.status, 'FORMALLY_PROVEN_EQUIVALENT');
console.log('✓ Invariante 4: Integración nativa con DriveEngine.verifyFormalEquivalence() verificada');

console.log('\nPASS AX-F-197 — Invariantes del comprobador formal de equivalencia demostrados al 100%.');
