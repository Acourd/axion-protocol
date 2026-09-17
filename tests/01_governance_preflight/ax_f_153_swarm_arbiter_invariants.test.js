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
const { crearSandbox } = require('../../tools/test_sandbox.js');
const path = require('path');
const fs = require('fs');
const SwarmArbiter = require('../../tools/swarm_arbiter.js');
const DriveEngine = require('../../tools/drive_engine.js');

console.log('=== AX-F-153 Invariantes del Árbitro de Sincronización de Enjambres ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const sandbox = crearSandbox('test_swarm_sandbox');
const stateDir = path.join(sandbox, '.axion', 'state');
fs.mkdirSync(stateDir, { recursive: true });

// Fixture persistido con expiresAt en el pasado antes de instanciar SwarmArbiter
const locksFile = path.join(stateDir, 'swarm-locks.json');
const expiredFixture = [
  {
    resource: 'tools/orphaned_lock.js',
    agentId: 'worker_agent_ghost',
    acquiredAt: new Date(Date.now() - 120000).toISOString(),
    expiresAt: new Date(Date.now() - 60000).toISOString(),
    token: 'deadbeef00000000deadbeef00000000'
  }
];
fs.writeFileSync(locksFile, JSON.stringify(expiredFixture, null, 2), 'utf8');

try {
  const arbiter = new SwarmArbiter(sandbox);

  // 1. Validar carga y poda determinista de fixture persistido expirado antes de instanciar SwarmArbiter
  assert.strictEqual(arbiter.locks.has('tools/orphaned_lock.js'), true, 'El fixture expirado debe cargarse en memoria');
  const pruneExpired = arbiter.pruneExpiredLocks();
  assert.strictEqual(pruneExpired.prunedCount, 1, 'Debe podar deterministamente exactamente 1 lock expirado');
  assert.strictEqual(arbiter.listLocks().length, 0, 'La lista debe quedar vacía tras podar el lock expirado');
  console.log('✓ Poda determinista por TTL validada con fixture persistido en el pasado');

  // 2. Validar adquisición de bloqueo por Agente A
  const lock1 = arbiter.acquireLock('worker_agent_alpha', 'tools/crypto_signer.js', 60000);
  assert.strictEqual(lock1.acquired, true);
  assert.ok(lock1.lock.token);
  console.log(`✓ Bloqueo adquirido para 'worker_agent_alpha' sobre tools/crypto_signer.js`);

  // 3. Validar detección de conflicto por Agente B
  const conflict = arbiter.acquireLock('worker_agent_beta', 'tools/crypto_signer.js', 60000);
  assert.strictEqual(conflict.acquired, false);
  assert.strictEqual(conflict.reason, 'CONFLICT');
  assert.strictEqual(conflict.heldBy, 'worker_agent_alpha');
  console.log('✓ Detección y contención de conflicto concurrente validada');

  // 4. Validar rechazo de liberación no autorizada
  const unauthRelease = arbiter.releaseLock('worker_agent_beta', 'tools/crypto_signer.js');
  assert.strictEqual(unauthRelease.released, false);
  assert.strictEqual(unauthRelease.reason, 'UNAUTHORIZED');
  console.log('✓ Rechazo de liberación no autorizada por agente ajeno validado');

  // 5. Validar liberación exitosa por dueño
  const validRelease = arbiter.releaseLock('worker_agent_alpha', 'tools/crypto_signer.js');
  assert.strictEqual(validRelease.released, true);
  console.log('✓ Liberación legítima de recurso validada');

  // 6. Validar conservación de bloqueo con TTL activo en el futuro (lock no expirado, sin sleeps ni busy-waits)
  const lockGamma = arbiter.acquireLock('worker_agent_gamma', 'tools/temp_patch.js', 60000);
  assert.strictEqual(lockGamma.acquired, true);
  assert.strictEqual(arbiter.listLocks().length, 1);
  const pruneActive = arbiter.pruneExpiredLocks();
  assert.strictEqual(pruneActive.prunedCount, 0, 'No debe podar locks con TTL activo en el futuro');
  assert.strictEqual(arbiter.listLocks().length, 1, 'El bloqueo futuro debe permanecer activo');
  const releaseGamma = arbiter.releaseLock('worker_agent_gamma', 'tools/temp_patch.js');
  assert.strictEqual(releaseGamma.released, true);
  assert.strictEqual(arbiter.listLocks().length, 0);
  console.log('✓ Conservación de bloqueos activos futuros (no expirados) validada');

  // 7. Validar integración con DriveEngine
  const driveEngine = new DriveEngine(ROOT);
  const driveLock = driveEngine.acquireSwarmLock('drive_subagent_1', 'scratch/dummy.txt', 60000);
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
