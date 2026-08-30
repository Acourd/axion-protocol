'use strict';

/**
 * Axion Protocol — Invariantes de Conservación de Entropía de Contexto y Eficiencia Offloaded O(1).
 *
 * Valida de forma estricta:
 * 1. Cálculo matemático exacto de entropía informacional de Shannon H(X).
 * 2. Garantía de compacidad O(1) en reportes ejecutivos (longitud <= 2048 bytes, <= 12 líneas).
 * 3. Detección y rechazo de inflaciones de contexto o salidas redundantes (Slop / Repetición).
 * 4. Demostración matemática de ratio de delegación a CPU local (> 99.0% offload).
 * 5. Integración transparente con DriveEngine.
 */

const assert = require('assert');
const path = require('path');
const ContextEntropyGuard = require('../../tools/context_entropy_guard.js');
const DriveEngine = require('../../tools/drive_engine.js');

console.log('=== AX-F-120 Invariantes de Conservación de Entropía de Contexto y Huella O(1) ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const guard = new ContextEntropyGuard(ROOT);

// 1. Validar cálculo de entropía de Shannon
const lowEntropy = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const normalText = 'Axion Protocol — Gobernanza determinista y soberanía criptográfica.';
const eLow = guard.computeShannonEntropy(lowEntropy);
const eNorm = guard.computeShannonEntropy(normalText);

assert.strictEqual(eLow, 0.0, 'Texto monotónico debe tener entropía 0.0 bits/char');
assert.ok(eNorm >= 3.5 && eNorm <= 5.5, `Texto natural debe tener entropía típica 3.5-5.5 (obtenido: ${eNorm})`);
console.log(`✓ Entropía de Shannon H(X) verificada: ${eLow} bits (monotónico) vs ${eNorm} bits (lenguaje natural)`);

// 2. Validar auditoría de compacidad O(1) en reporte conciso
const sampleReport = `
✓ [Acción Cumplida]: Fuzzing de Caos Extremo de 10.000 Vectores implementado.
📊 [Métricas]: 136/136 suites PASS (24.75s) · 10.000/10.000 vectores bloqueados (0% evasión) · 12/12 Health Checks en Verde · 72 archivos en VibeGuard Strict (0 antipatrones).
🧠 [Próximo Vector Metacognitivo]: El clasificador de preflight ha sido validado empíricamente frente a 10.000 vectores sintéticos.
`.trim();

const auditRes = guard.auditExecutiveSummary(sampleReport);
assert.strictEqual(auditRes.pass, true, 'El reporte de 3 líneas debe cumplir las invariantes O(1)');
assert.strictEqual(auditRes.verdict, 'O1_OPTIMAL_COMPACT');
assert.ok(auditRes.bytes <= 1024, 'El reporte debe pesar menos de 1KB');
console.log(`✓ Compacidad O(1) validada: ${auditRes.bytes} bytes · ${auditRes.linesCount} líneas · ${auditRes.entropyBitsPerChar} bits/char`);

// 3. Validar rechazo ante inflación de contexto (Oversized Slop)
const oversizedText = 'A'.repeat(4000);
const oversizedAudit = guard.auditExecutiveSummary(oversizedText);
assert.strictEqual(oversizedAudit.pass, false, 'Salidas infladas (>2KB) deben ser rechazadas');
assert.strictEqual(oversizedAudit.isBoundedO1, false);
console.log('✓ Detección y rechazo de inflación de contexto verificado');

// 4. Validar eficiencia de cómputo delegado a CPU
const offload = guard.calculateOffloadEfficiency(136, 10000, 150);
assert.strictEqual(offload.isHighlyEfficient, true, 'La eficiencia offload debe ser >= 99.0%');
assert.ok(offload.totalLocalOperations >= 50000, 'Debe ejecutar >50.000 operaciones en CPU');
console.log(`✓ Eficiencia de cómputo delegado validada: ${offload.offloadPercentage} ejecutado en CPU sin coste de tokens`);

// 5. Validar integración con DriveEngine
const driveEngine = new DriveEngine(ROOT);
const driveEntropy = driveEngine.auditContextEntropy(sampleReport);
assert.strictEqual(driveEntropy.pass, true, 'DriveEngine debe auditar la entropía de contexto');
console.log('✓ Integración DriveEngine.auditContextEntropy() verificada');

console.log('\nPASS AX-F-120 — Invariantes de conservación de contexto O(1) y eficiencia offloaded verificados al 100%.');
