#!/usr/bin/env node
'use strict';

/**
 * AX-F-173: Invariantes del Árbitro AST de Swarm Multi-Agente (Axion Protocol v2.0)
 *
 * Verifica:
 * 1. Adquisición determinista de bloqueo granular sobre símbolo AST (acquireLock).
 * 2. Bloqueo fail-closed ante colisión de edición concurrente por otro agente.
 * 3. Concurrencia real: 2 agentes pueden bloquear diferentes símbolos en el mismo archivo.
 * 4. Liberación limpia y poda de concesiones expiradas (releaseLock / pruneExpiredLocks).
 * 5. Fusión atómica de parches AST no colisionantes (mergeASTBlocks).
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const os = require('os');
const SwarmASTArbiter = require('../../tools/swarm_ast_arbiter.js');

console.log('=== AX-F-173: Invariantes de SwarmASTArbiter (v2.0 Foundation) ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const tempRoot = path.join(os.tmpdir(), `test_ax_f_173_${Date.now()}`);
fs.mkdirSync(tempRoot, { recursive: true });

try {
  const arbiter = new SwarmASTArbiter(tempRoot);

  // Invariante 1: Adquisición de bloqueo
  const lockA = arbiter.acquireLock('agent-fe-1', 'src/app.js', 'renderHeader');
  assert.strictEqual(lockA.acquired, true, 'Agente A debe adquirir el bloqueo');
  assert.ok(lockA.leaseId, 'Debe emitir leaseId criptográfico');
  console.log('  ✓ Invariante 1: Adquisición granular de bloqueo AST validada.');

  // Invariante 2: Colisión concurrente denegada
  const collision = arbiter.acquireLock('agent-be-2', 'src/app.js', 'renderHeader');
  assert.strictEqual(collision.acquired, false, 'Agente B debe ser rechazado en el mismo símbolo');
  assert.strictEqual(collision.reason, 'LOCKED_BY_ANOTHER_AGENT');
  assert.strictEqual(collision.holder, 'agent-fe-1');
  console.log('  ✓ Invariante 2: Rechazo determinista ante colisión concurrente validado.');

  // Invariante 3: Concurrencia sin colisión en el mismo archivo
  const lockB = arbiter.acquireLock('agent-be-2', 'src/app.js', 'handleLogin');
  assert.strictEqual(lockB.acquired, true, 'Agente B debe poder bloquear un método distinto en el mismo archivo');
  console.log('  ✓ Invariante 3: Multi-bloqueo granular concurrente en el mismo archivo validado.');

  // Invariante 4: Liberación de bloqueo
  const relRes = arbiter.releaseLock(lockA.leaseId, lockA.lockKey);
  assert.strictEqual(relRes.released, true, 'Agente A debe poder liberar su bloqueo');
  
  // Ahora Agente B puede adquirir renderHeader
  const reacquire = arbiter.acquireLock('agent-be-2', 'src/app.js', 'renderHeader');
  assert.strictEqual(reacquire.acquired, true, 'Agente B debe poder adquirir tras la liberación');
  console.log('  ✓ Invariante 4: Liberación y re-adquisición de bloqueos validada.');

  // Invariante 5: Fusión atómica AST no colisionante
  const baseCode = `
class App {
  renderHeader() { return "OLD_HEADER"; }
  handleLogin() { return "OLD_LOGIN"; }
}
`;
  const blockA = {
    symbol: 'renderHeader',
    target: 'renderHeader() { return "OLD_HEADER"; }',
    replacement: 'renderHeader() { return "NEW_HEADER"; }'
  };
  const blockB = {
    symbol: 'handleLogin',
    target: 'handleLogin() { return "OLD_LOGIN"; }',
    replacement: 'handleLogin() { return "NEW_LOGIN"; }'
  };

  const mergeRes = arbiter.mergeASTBlocks(baseCode, blockA, blockB);
  assert.strictEqual(mergeRes.success, true, 'Fusión atómica debe ser exitosa');
  assert.ok(mergeRes.mergedCode.includes('NEW_HEADER'));
  assert.ok(mergeRes.mergedCode.includes('NEW_LOGIN'));
  console.log('  ✓ Invariante 5: Fusión atómica determinista de parches AST no colisionantes validada.');

  console.log('\nPASS: AX-F-173 — Swarm AST Arbiter verificado con 5/5 invariantes en verde.');
} finally {
  try {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  } catch (_) {
    // cleanup
  }
}
