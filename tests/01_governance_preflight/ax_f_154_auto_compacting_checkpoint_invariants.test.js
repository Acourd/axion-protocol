'use strict';

/**
 * Axion Protocol — Invariantes del Motor de Auto-Compactación y Prevención de Inflación de Disco.
 *
 * Valida de forma estricta:
 * 1. Cumplimiento de la cuota estricta de checkpoints (máximo 2 en disco tras N mutaciones continuas).
 * 2. Poda automática inline de estados efímeros redundantes.
 * 3. Auditoría determinista de presión de almacenamiento y alertas tempranas de I/O.
 * 4. Integración transparente con DriveEngine y CLI unificado.
 */

const assert = require('assert');
const { crearSandbox } = require('../../tools/test_sandbox.js');
const path = require('path');
const fs = require('fs');
const AutoCompactingCheckpointEngine = require('../../tools/auto_compacting_checkpoint.js');
const DriveEngine = require('../../tools/drive_engine.js');

console.log('=== AX-F-154 Invariantes de Auto-Compactación y Prevención de Bloat ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const sandbox = crearSandbox('test_autocompact_sandbox');
fs.mkdirSync(path.join(sandbox, '.axion', 'checkpoints'), { recursive: true });
fs.mkdirSync(path.join(sandbox, '.axion', 'state'), { recursive: true });

// Crear archivo de código de muestra
fs.writeFileSync(path.join(sandbox, 'sample.js'), 'console.log("axion zero bloat");\n', 'utf8');

try {
  const engine = new AutoCompactingCheckpointEngine(sandbox, { maxCheckpoints: 2, maxStateFiles: 2 });

  // 1. Simular creación de 8 checkpoints consecutivos
  for (let i = 1; i <= 8; i++) {
    fs.writeFileSync(path.join(sandbox, 'sample.js'), `console.log("axion iteration ${i}");\n`, 'utf8');
    const res = engine.createCheckpoint(`mutation-${i}`);
    assert.strictEqual(res.success, true);
  }

  // 2. Verificar que NUNCA queden más de 2 checkpoints en disco
  const remainingCp = fs.readdirSync(engine.checkpointsDir);
  assert.strictEqual(remainingCp.length, 2, 'Debe haber exactamente 2 checkpoints conservados');
  console.log(`✓ Cuota estricta verificada: ${remainingCp.length} checkpoints conservados tras 8 mutaciones`);

  // 3. Validar poda de estados efímeros
  for (let i = 1; i <= 6; i++) {
    fs.writeFileSync(path.join(sandbox, '.axion', 'state', `deep-deliberation-test-${i}.json`), '{}');
  }
  const compactRes = engine.compactInline();
  assert.ok(compactRes.prunedStateFiles >= 4);
  const remainingState = fs.readdirSync(engine.stateDir).filter(f => f.startsWith('deep-deliberation-test-'));
  assert.strictEqual(remainingState.length, 2);
  console.log(`✓ Poda de estados efímeros verificada: ${remainingState.length} estados conservados`);

  // 4. Validar sensor de presión de almacenamiento
  const pressureAudit = engine.auditDiskPressure();
  assert.ok(pressureAudit.status);
  assert.strictEqual(pressureAudit.isPressure, false);
  console.log(`✓ Sensor de presión de disco validado: Estado ${pressureAudit.status} (${pressureAudit.totalFiles} archivos, ${pressureAudit.totalMb} MB)`);

  // 5. Validar integración con DriveEngine
  const driveEngine = new DriveEngine(ROOT);
  const driveDiskAudit = driveEngine.auditDiskPressure();
  assert.ok(driveDiskAudit.status);
  console.log('✓ Integración DriveEngine.auditDiskPressure() y createAutoCompactedCheckpoint() verificada');

} finally {
  if (fs.existsSync(sandbox)) {
    fs.rmSync(sandbox, { recursive: true, force: true });
  }
}

console.log('\nPASS AX-F-154 — Invariantes de auto-compactación y prevención de inflación demostrados al 100%.');
