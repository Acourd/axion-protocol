'use strict';

/**
 * Axion Protocol — Invariantes del Motor de Telemetría Forense y Detección de Regresiones.
 *
 * Valida de forma estricta:
 * 1. Captura determinista de snapshots forenses de memoria y CPU.
 * 2. Cálculo de deriva y detección de regresiones de memoria (MEMORY_LEAK_DRIFT).
 * 3. Sellado criptográfico in-toto Statement v1 en sobre DSSE con firma Ed25519 verificada.
 * 4. Integración transparente con DriveEngine.
 */

const assert = require('assert');
const { crearSandbox } = require('../../tools/test_sandbox.js');
const path = require('path');
const fs = require('fs');
const ForensicTelemetryEngine = require('../../tools/forensic_telemetry_engine.js');
const DriveEngine = require('../../tools/drive_engine.js');

console.log('=== AX-F-134 Invariantes de Telemetría Forense y Detección de Regresiones ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const sandbox = crearSandbox('test_forensic_sandbox');
fs.mkdirSync(path.join(sandbox, '.axion', 'state'), { recursive: true });

const engine = new ForensicTelemetryEngine(sandbox);

// 1. Validar captura de snapshot
const pre = engine.captureSnapshot('pre-test');
assert.ok(pre.memory.heapUsedMb > 0, 'El heap usado debe ser > 0');
assert.ok(pre.memory.heapTotalMb >= pre.memory.heapUsedMb, 'El heap total debe ser >= heap usado');
console.log(`✓ Snapshot de memoria capturado: Heap ${pre.memory.heapUsedMb} MB / RSS ${pre.memory.rssMb} MB`);

// 2. Validar cálculo de deriva limpio
const postClean = engine.captureSnapshot('post-test');
const driftClean = engine.computeDrift(pre, postClean, { maxHeapGrowthMb: 20.0 });
assert.strictEqual(driftClean.pass, true);
assert.strictEqual(driftClean.verdict, 'NO_REGRESSIONS_DETECTED');
console.log('✓ Cálculo de deriva de memoria validado (sin regresiones)');

// 3. Validar detección de anomalía de memoria
const postLeak = {
  label: 'post-leak',
  timestampMs: pre.timestampMs + 50,
  capturedAt: new Date().toISOString(),
  memory: {
    heapUsedMb: pre.memory.heapUsedMb + 30.0,
    heapTotalMb: pre.memory.heapTotalMb + 40.0,
    rssMb: pre.memory.rssMb + 50.0
  }
};
const driftLeak = engine.computeDrift(pre, postLeak, { maxHeapGrowthMb: 15.0 });
assert.strictEqual(driftLeak.pass, false);
assert.ok(driftLeak.regressions.some(r => r.type === 'MEMORY_LEAK_DRIFT'));
console.log('✓ Detección de anomalía MEMORY_LEAK_DRIFT validada');

// 4. Validar sellado criptográfico DSSE
const sealRes = engine.sealForensicReport('DeterministicTask', pre, postClean, driftClean);
assert.strictEqual(sealRes.sealed, true);
assert.strictEqual(sealRes.signatureValid, true, 'La firma Ed25519 del sobre DSSE debe ser válida');
assert.ok(fs.existsSync(sealRes.envelopePath), 'El sobre DSSE debe estar guardado en disco');
console.log(`✓ Sobre criptográfico DSSE in-toto firmado y verificado con Ed25519 (Digest: ${sealRes.payloadDigest.slice(0, 16)}...)`);

// 5. Validar integración con DriveEngine
const driveEngine = new DriveEngine(ROOT);
const drivePre = driveEngine.captureForensicSnapshot('drive-pre');
const drivePost = driveEngine.captureForensicSnapshot('drive-post');
const driveForensics = driveEngine.evaluateAndSealForensics('DriveIntegratedTask', drivePre, drivePost, { maxHeapGrowthMb: 50.0, maxRssGrowthMb: 150.0 });

if (!driveForensics.drift.pass) {
  console.error('Regresiones detectadas en deriva DriveEngine:', JSON.stringify(driveForensics.drift.regressions));
}
assert.strictEqual(driveForensics.drift.pass, true);
assert.strictEqual(driveForensics.seal.signatureValid, true);
console.log('✓ Integración DriveEngine.evaluateAndSealForensics() verificada');

// Limpiar sandbox
if (fs.existsSync(sandbox)) {
  fs.rmSync(sandbox, { recursive: true, force: true });
}

console.log('\nPASS AX-F-134 — Invariantes de telemetría forense y detección de regresiones demostrados al 100%.');
