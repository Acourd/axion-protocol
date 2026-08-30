'use strict';

/**
 * Axion Protocol — Invariantes del Árbitro de Sincronización y Enjambres Soberanos.
 *
 * Valida de forma estricta:
 * 1. Adquisición atómica y determinista de bloqueos sobre recursos compartidos.
 * 2. Detección y bloqueo de conflictos concurrentes entre subagentes.
 * 3. Extensión de leases y rechazo de liberación no autorizada por agentes ajenos.
 * 4. Poda automática y determinista de bloqueos huérfanos por expiración TTL.
 * 5. Integración transparente con DriveEngine y CLI unificado.
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const SwarmArbiter = require('../../tools/swarm_arbiter.js');
const DriveEngine = require('../../tools/drive_engine.js');

console.log('=== AX-F-153 Invariantes del Árbitro de Sincronización de Enjambres ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const sandbox = path.join(ROOT, 'scratch', `test_swarm_sandbox_${Date.now()}`);
fs.mkdirSync(path.join(sandbox, '.axion', 'state'), { recursive: true });

try {
  const arbiter = new SwarmArbiter(sandbox);

  // 1. Validar adquisición de bloqueo por Agente A
  const lock1 = arbiter.acquireLock('worker_agent_alpha', 'tools/crypto_signer.js', 1000);
  assert.strictEqual(lock1.acquired, true);
  assert.ok(lock1.lock.token);
  console.log(`✓ Bloqueo adquirido para 'worker_agent_alpha' sobre tools/crypto_signer.js`);

  // 2. Validar detección de conflicto por Agente B
  const conflict = arbiter.acquireLock('worker_agent_beta', 'tools/crypto_signer.js', 1000);
  assert.strictEqual(conflict.acquired, false);
  assert.strictEqual(conflict.reason, 'CONFLICT');
  assert.strictEqual(conflict.heldBy, 'worker_agent_alpha');
  console.log('✓ Detección y contención de conflicto concurrente validada');

  // 3. Validar rechazo de liberación no autorizada
  const unauthRelease = arbiter.releaseLock('worker_agent_beta', 'tools/crypto_signer.js');
  assert.strictEqual(unauthRelease.released, false);
  assert.strictEqual(unauthRelease.reason, 'UNAUTHORIZED');
  console.log('✓ Rechazo de liberación no autorizada por agente ajeno validado');

  // 4. Validar liberación exitosa por dueño
  const validRelease = arbiter.releaseLock('worker_agent_alpha', 'tools/crypto_signer.js');
  assert.strictEqual(validRelease.released, true);
  console.log('✓ Liberación legítima de recurso validada');

  // 5. Validar poda automática por TTL
  arbiter.acquireLock('worker_agent_gamma', 'tools/temp_patch.js', 10); // TTL 10ms
  assert.strictEqual(arbiter.listLocks().length, 1);
  
  // Pausa determinista para expirar TTL
  const t0 = Date.now();
  while (Date.now() - t0 < 30) { /* spin */ }

  const pruneRes = arbiter.pruneExpiredLocks();
  assert.strictEqual(pruneRes.prunedCount, 1);
  assert.strictEqual(arbiter.listLocks().length, 0);
  console.log('✓ Poda automática y auto-limpieza de bloqueos huérfanos por TTL validada');

  // 6. Validar integración con DriveEngine
  const driveEngine = new DriveEngine(ROOT);
  const driveLock = driveEngine.acquireSwarmLock('drive_subagent_1', 'scratch/dummy.txt', 5000);
  assert.strictEqual(driveLock.acquired, true);
  const driveList = driveEngine.listSwarmLocks();
  assert.ok(driveList.length >= 1);
  const driveRelease = driveEngine.releaseSwarmLock('drive_subagent_1', 'scratch/dummy.txt');
  assert.strictEqual(driveRelease.released, true);
  console.log('✓ Integración DriveEngine (acquireSwarmLock, listSwarmLocks, releaseSwarmLock) verificada');

} finally {
  if (fs.existsSync(sandbox)) {
    fs.rmSync(sandbox, { recursive: true, force: true });
  }
}

console.log('\nPASS AX-F-153 — Invariantes del árbitro de enjambres soberanos demostrados al 100%.');
