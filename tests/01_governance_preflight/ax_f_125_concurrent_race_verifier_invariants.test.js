'use strict';

/**
 * Axion Protocol — Invariantes del Verificador de Exclusión Mutua y Ausencia de Data Races.
 *
 * Valida de forma estricta:
 * 1. Exclusión mutua (Mutual Exclusion) en memoria compartida (SharedArrayBuffer + Atomics).
 * 2. Cero actualizaciones perdidas (Zero Lost Updates) en 1.000 operaciones concurrentes en 4 workers.
 * 3. Jerarquía de adquisición de locks monotónica (Deadlock-Free Lock Hierarchy).
 * 4. Integración transparente con DriveEngine.
 */

const assert = require('assert');
const path = require('path');
const ConcurrentRaceVerifier = require('../../tools/concurrent_race_verifier.js');
const DriveEngine = require('../../tools/drive_engine.js');

console.log('=== AX-F-125 Invariantes de Exclusión Mutua y Ausencia de Data Races en Workers ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const verifier = new ConcurrentRaceVerifier(ROOT);

(async () => {
  // 1. Validar concurrencia atómica con workers reales
  const atomicRes = await verifier.verifyAtomicExclusion(4, 250);

  assert.strictEqual(atomicRes.pass, true, 'La prueba concurrente debe pasar sin fallos');
  assert.strictEqual(atomicRes.totalExpected, 1000, 'El total esperado debe ser 1.000');
  assert.strictEqual(atomicRes.finalCount, 1000, 'El total obtenido debe ser exactamente 1.000');
  assert.strictEqual(atomicRes.lostUpdates, 0, 'No deben existir actualizaciones perdidas (0 lost updates)');
  assert.strictEqual(atomicRes.verdict, 'ZERO_DATA_RACES_PROVEN');
  console.log(`✓ Exclusión mutua atómica validada: 4 workers x 250 iteraciones = ${atomicRes.finalCount} (0 lost updates)`);

  // 2. Validar jerarquía de locks anti-deadlock
  const lockRes = verifier.verifyLockOrderingHierarchy();
  assert.strictEqual(lockRes.isDeadlockFree, true, 'La jerarquía de locks debe ser libre de deadlocks');
  assert.strictEqual(lockRes.verdict, 'STRICT_MONOTONIC_DEADLOCK_FREE');
  console.log('✓ Jerarquía monotónica de locks validada (STRICT_MONOTONIC_DEADLOCK_FREE)');

  // 3. Validar integración con DriveEngine
  const driveEngine = new DriveEngine(ROOT);
  const driveRes = await driveEngine.verifyConcurrentRaceFreedom(2, 100);
  assert.strictEqual(driveRes.pass, true, 'DriveEngine debe ejecutar la verificación concurrente');
  assert.strictEqual(driveRes.finalCount, 200);
  console.log('✓ Integración DriveEngine.verifyConcurrentRaceFreedom() verificada');

  console.log('\nPASS AX-F-125 — Invariantes de concurrencia y ausencia de data races demostrados al 100%.');
})();
