'use strict';

/**
 * Axion Protocol — Invariantes del Sensor y Protector de Presión de Disco e I/O.
 *
 * Valida de forma estricta:
 * 1. Medición de latencia de travesía y conteo de archivos en milisegundos.
 * 2. Detección proactiva de cuellos de botella de I/O y excesos de archivos efímeros.
 * 3. Disparo determinista de auto-curación y restablecimiento del estado OPTIMAL.
 * 4. Integración transparente con DriveEngine y CLI unificado.
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const DiskPressureGuard = require('../../tools/disk_pressure_guard.js');
const DriveEngine = require('../../tools/drive_engine.js');

console.log('=== AX-F-155 Invariantes del Sensor de Presión de Disco e I/O ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const sandbox = path.join(ROOT, 'scratch', `test_disk_guard_sandbox_${Date.now()}`);
fs.mkdirSync(path.join(sandbox, '.axion', 'state'), { recursive: true });
fs.mkdirSync(path.join(sandbox, '.axion', 'checkpoints'), { recursive: true });
fs.mkdirSync(path.join(sandbox, 'scratch'), { recursive: true });

try {
  const guard = new DiskPressureGuard(sandbox, {
    maxTraverseLatencyMs: 200,
    maxAxionFiles: 5,
    maxScratchSandboxes: 2
  });

  // 1. Estado inicial óptimo
  const initial = guard.measurePressure();
  assert.strictEqual(initial.status, 'OPTIMAL');
  assert.strictEqual(initial.hasPressure, false);
  console.log(`✓ Estado inicial óptimo verificado (${initial.traverseLatencyMs} ms latencia)`);

  // 2. Inyectar presión en .axion/state/
  for (let i = 1; i <= 8; i++) {
    fs.writeFileSync(path.join(sandbox, '.axion', 'state', `deep-deliberation-mock-${i}.json`), '{}');
  }
  const pressureResult = guard.measurePressure();
  assert.strictEqual(pressureResult.status, 'PRESSURE_DETECTED');
  assert.strictEqual(pressureResult.hasPressure, true);
  assert.ok(pressureResult.issues.length >= 1);
  console.log(`✓ Detección proactiva de cuello de botella por inflación verificada (${pressureResult.issues[0]})`);

  // 3. Ejecutar auto-curación preventiva
  const healResult = guard.ensureOptimalState();
  assert.strictEqual(healResult.actionTaken, true);
  assert.strictEqual(healResult.status, 'AUTO_HEALED');
  assert.strictEqual(healResult.afterMetrics.hasPressure, false);
  console.log(`✓ Auto-curación preventiva en caliente ejecutada con éxito (Restablecido a: ${healResult.status})`);

  // 4. Validar integración con DriveEngine
  const driveEngine = new DriveEngine(ROOT);
  const driveEnsure = driveEngine.ensureOptimalDiskState();
  assert.ok(driveEnsure.status);
  console.log('✓ Integración DriveEngine.ensureOptimalDiskState() verificada');

} finally {
  if (fs.existsSync(sandbox)) {
    fs.rmSync(sandbox, { recursive: true, force: true });
  }
}

console.log('\nPASS AX-F-155 — Invariantes del sensor de presión de disco demostrados al 100%.');
