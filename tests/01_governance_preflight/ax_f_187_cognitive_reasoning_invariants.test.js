'use strict';

/**
 * AX-F-187: Invariantes del Motor de Razonamiento Deductivo y Monólogo Metacognitivo (Deep Thinking Protocol)
 *
 * Valida de forma determinista:
 * 1. Deducción formal de precondiciones y detección de salvaguarda fail-closed ante .axion/HALT.
 * 2. Síntesis exhaustiva del árbol de fallas en 3 escalas temporales (T0, T1, T2).
 * 3. Ejecución del ciclo de deliberación (deliberate) con métricas de densidad cognitiva.
 * 4. Integración completa con DriveEngine.
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const os = require('os');
const CognitiveReasoningEngine = require('../../tools/cognitive_reasoning_engine.js');
const DriveEngine = require('../../tools/drive_engine.js');

console.log('=== AX-F-187 Invariantes del Motor de Razonamiento Deductivo (Deep Thinking Protocol) ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const sandbox = path.join(os.tmpdir(), `test_cognitive_${Date.now()}`);
fs.mkdirSync(path.join(sandbox, '.axion'), { recursive: true });

const engine = new CognitiveReasoningEngine(sandbox);

// Invariante 1: Deducción de precondiciones
const dummyFile = path.join(sandbox, 'target.js');
fs.writeFileSync(dummyFile, 'console.log("safe");\n', 'utf8');

const pre = engine.deducePreconditions({
  targetFiles: [dummyFile]
});
assert.strictEqual(pre.allSatisfied, true, 'Todas las precondiciones deben cumplirse en sandbox limpio');
assert.ok(pre.preconditions.length >= 3, 'Debe evaluar integridad de archivo, fail-closed y AST');
console.log('✓ Invariante 1: Deducción formal de precondiciones verificada');

// Invariante 2: Salvaguarda Fail-Closed ante bandera HALT
const haltFile = path.join(sandbox, '.axion', 'HALT');
fs.writeFileSync(haltFile, 'EMERGENCY_HALT', 'utf8');

const preHalted = engine.deducePreconditions({ targetFiles: [dummyFile] });
assert.strictEqual(preHalted.allSatisfied, false, 'No debe autorizar mutación si existe HALT');
fs.unlinkSync(haltFile);
console.log('✓ Invariante 2: Detección estricta de salvaguarda fail-closed verificada');

// Invariante 3: Síntesis de árbol adversarial triádico (T0, T1, T2)
const faultTree = engine.synthesizeAdversarialFaultTree('Refactorización Crítica de Gobernanza');
assert.ok(faultTree.t0_immediate && faultTree.t0_immediate.vectors.length > 0, 'Debe contener vectores T0');
assert.ok(faultTree.t1_operational && faultTree.t1_operational.vectors.length > 0, 'Debe contener vectores T1');
assert.ok(faultTree.t2_architectural && faultTree.t2_architectural.vectors.length > 0, 'Debe contener vectores T2');
console.log('✓ Invariante 3: Árbol adversarial de 3 escalas temporales validado');

// Invariante 4: Ciclo completo de deliberación y veredicto seguro
const taskDeliberation = engine.deliberate({
  title: 'Misión Crítica TDD',
  targetFiles: [dummyFile]
});
assert.strictEqual(taskDeliberation.status, 'DELIBERATION_PROVEN_SAFE');
assert.strictEqual(taskDeliberation.isSafeToMutate, true);
assert.strictEqual(taskDeliberation.metrics.cognitiveDensity, 'HIGH_FRONTIER');
console.log('✓ Invariante 4: Deliberación metacognitiva formal verificada');

// Invariante 5: Integración con DriveEngine
const driveEngine = new DriveEngine(ROOT);
const driveDelib = driveEngine.deliberateCognitivePreconditions({
  title: 'Tarea Drive',
  targetFiles: ['tools/drive_engine.js']
});
assert.strictEqual(driveDelib.status, 'DELIBERATION_PROVEN_SAFE');
console.log('✓ Invariante 5: Integración nativa con DriveEngine.deliberateCognitivePreconditions() verificada');

// Limpieza
if (fs.existsSync(sandbox)) {
  fs.rmSync(sandbox, { recursive: true, force: true });
}

console.log('\nPASS AX-F-187 — Invariantes del motor de razonamiento deductivo verificados al 100%.');
