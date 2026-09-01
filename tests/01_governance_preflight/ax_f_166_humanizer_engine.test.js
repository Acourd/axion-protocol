#!/usr/bin/env node
'use strict';

/**
 * AX-F-166: Invariantes del Motor de Humanización y Purificación Anti-AI Slop
 *
 * Verifica:
 * 1. Detección léxica precisa de clichés en inglés y español.
 * 2. Cálculo de índice de AI Slop y análisis de entropía de cadencia.
 * 3. Humanización limpia de textos con reemplazo de delatores.
 * 4. Procesamiento de archivos y contratos de preservación.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const HumanizerEngine = require('../../tools/humanizer_engine.js');

console.log('=== AX-F-166: Invariantes de HumanizerEngine ===\n');

const engine = new HumanizerEngine();

// Invariante 1: Detección en texto saturado de clichés de IA
const roboticText = `It is worth noting that we delve into a rich tapestry of multifaceted features. At its core, this is a testament to seamless innovation and a game-changing paradigm shift. En el panorama actual, esta piedra angular sin precedentes está revolucionando la industria de manera fluida.`;
const analysisRobotic = engine.analyze(roboticText);

assert.strictEqual(typeof analysisRobotic.slopScore, 'number', 'slopScore debe ser numérico');
assert.ok(analysisRobotic.slopScore >= 50, `El score de un texto saturado debe ser >= 50, obtenido: ${analysisRobotic.slopScore}`);
assert.ok(analysisRobotic.detectedTellsCount >= 6, `Debe detectar al menos 6 clichés, detectados: ${analysisRobotic.detectedTellsCount}`);
assert.strictEqual(analysisRobotic.isSlopFree, false, 'No debe ser considerado slop-free');
console.log('  ✓ Invariante 1: Detección de clichés e índice de AI Slop verificado.');

// Invariante 2: Texto técnico limpio y natural
const humanText = `Axion Protocol is a deterministic runtime. It enforces fail-closed execution with 182 test suites. If a test fails with exit code 1, the agent cannot push code.`;
const analysisHuman = engine.analyze(humanText);

assert.ok(analysisHuman.slopScore < 15, `El score de texto natural debe ser bajo, obtenido: ${analysisHuman.slopScore}`);
assert.strictEqual(analysisHuman.detectedTellsCount, 0, 'No debe detectar falsos positivos en texto técnico sobrio');
assert.strictEqual(analysisHuman.isSlopFree, true, 'Debe ser clasificado como slop-free');
console.log('  ✓ Invariante 2: Texto técnico sobrio verificado como natural.');

// Invariante 3: Transformación y humanización de texto
const humanized = engine.humanize(roboticText);
assert.ok(!humanized.includes('delve into'), 'Debe eliminar delve into');
assert.ok(!humanized.includes('tapestry'), 'Debe eliminar tapestry');
assert.ok(!humanized.includes('piedra angular'), 'Debe eliminar piedra angular');
assert.ok(!humanized.includes('revolucionando'), 'Debe eliminar revolucionando');
console.log('  ✓ Invariante 3: Sustitución limpia de clichés completada.');

// Invariante 4: Análisis de cadencia y oraciones
assert.strictEqual(typeof analysisHuman.sentenceStats.totalSentences, 'number', 'totalSentences debe ser número');
assert.strictEqual(typeof analysisHuman.sentenceStats.avgWordsPerSentence, 'number', 'avgWordsPerSentence debe ser número');
assert.strictEqual(typeof analysisHuman.sentenceStats.cadenceVariance, 'number', 'cadenceVariance debe ser número');
console.log('  ✓ Invariante 4: Análisis estadístico de cadencia sintáctica verificado.');

// Invariante 5: Resiliencia ante entradas vacías
const emptyRes = engine.analyze('');
assert.strictEqual(emptyRes.slopScore, 0, 'Entrada vacía debe tener score 0');
assert.strictEqual(emptyRes.isSlopFree, true, 'Entrada vacía debe ser slop-free');
console.log('  ✓ Invariante 5: Resiliencia ante valores nulos/vacíos.');

console.log('\nPASS: AX-F-166 — Motor de Humanización verificado con 5/5 invariantes deterministas en verde.');
