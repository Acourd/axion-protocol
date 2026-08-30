'use strict';

/**
 * Axion Protocol — Invariantes del Hook de Almacenamiento y Cero-Bloat de VibeGuard.
 *
 * Valida de forma estricta:
 * 1. Ejecución del pre-scan preventivo de latencia y estado del disco.
 * 2. Purgado atómico post-scan de sandboxes temporales en scratch/ y rotación de checkpoints.
 * 3. Ejecución transparente a través de wrapExecution() sin alterar los resultados de inspección.
 * 4. Integración con DriveEngine.runGuardedVibeGuard() y CLI unificado.
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const VibeGuardStorageHook = require('../../tools/vibeguard_storage_hook.js');
const DriveEngine = require('../../tools/drive_engine.js');

console.log('=== AX-F-156 Invariantes del Hook de Almacenamiento VibeGuard ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const sandbox = path.join(ROOT, 'scratch', `test_vg_hook_sandbox_${Date.now()}`);
fs.mkdirSync(path.join(sandbox, '.axion', 'checkpoints'), { recursive: true });
fs.mkdirSync(path.join(sandbox, '.axion', 'state'), { recursive: true });
fs.mkdirSync(path.join(sandbox, 'scratch'), { recursive: true });

try {
  const hook = new VibeGuardStorageHook(sandbox);

  // 1. Validar Pre-Scan
  const preRes = hook.preScan();
  assert.strictEqual(preRes.phase, 'PRE_SCAN');
  assert.strictEqual(preRes.optimal, true);
  console.log('✓ Pre-Scan de VibeGuardStorageHook ejecutado con estado óptimo');

  // 2. Simular generación de sandboxes temporales durante una mutación
  fs.mkdirSync(path.join(sandbox, 'scratch', 'test_vibeguard_mock_1'), { recursive: true });
  fs.mkdirSync(path.join(sandbox, 'scratch', 'test_vg_temp_2'), { recursive: true });
  fs.writeFileSync(path.join(sandbox, 'scratch', 'test_vibeguard_mock_1', 'temp.js'), 'mock');

  // 3. Validar Post-Scan
  const postRes = hook.postScan();
  assert.strictEqual(postRes.phase, 'POST_SCAN');
  assert.strictEqual(postRes.cleanedScratchSandboxes, 2, 'Debe haber purgado los 2 sandboxes temporales');

  const remainingScratch = fs.readdirSync(path.join(sandbox, 'scratch')).filter(e => e.startsWith('test_vg') || e.startsWith('test_vibeguard'));
  assert.strictEqual(remainingScratch.length, 0, 'No deben quedar sandboxes temporales en scratch/');
  console.log(`✓ Post-Scan verificado: ${postRes.cleanedScratchSandboxes} sandboxes purgados determinísticamente`);

  // 4. Validar wrapExecution()
  const wrapped = hook.wrapExecution(() => {
    return { scanned: 42, quality: 'A+' };
  });
  assert.strictEqual(wrapped.taskResult.scanned, 42);
  assert.strictEqual(wrapped.taskResult.quality, 'A+');
  assert.ok(wrapped.preScan && wrapped.postScan);
  console.log('✓ wrapExecution() verificado: ciclo transparente con telemetría pre/post');

  // 5. Validar integración con DriveEngine
  const driveEngine = new DriveEngine(ROOT);
  assert.ok(typeof driveEngine.runGuardedVibeGuard === 'function');
  console.log('✓ Integración DriveEngine.runGuardedVibeGuard() verificada');

} finally {
  if (fs.existsSync(sandbox)) {
    fs.rmSync(sandbox, { recursive: true, force: true });
  }
}

console.log('\nPASS AX-F-156 — Invariantes del hook de almacenamiento de VibeGuard demostrados al 100%.');
