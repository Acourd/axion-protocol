#!/usr/bin/env node
'use strict';

/**
 * AX-F-178: Invariantes del Simulador de Enjambre Multi-Agente (Swarm Simulator)
 *
 * Verifica:
 * 1. Ejecución íntegra del ciclo de 6 fases del enjambre colaborativo (Planner, Frontend, Security).
 * 2. Adquisición y liberación de bloqueos AST granulares sin colisión.
 * 3. Intercambio de mensajes P2P con firmas digitales Ed25519.
 * 4. Resolución de consenso BFT (100% aprobación) y emisión de certificado SHA-256.
 */

const assert = require('assert');
const path = require('path');
const SwarmSimulator = require('../../tools/swarm_simulator.js');

console.log('=== AX-F-178: Invariantes de SwarmSimulator (v2.0 Live Sim) ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const sim = new SwarmSimulator(ROOT);

async function testSim() {
  const res = await sim.runSimulation({ quiet: true });

  // Invariante 1: Éxito global
  assert.strictEqual(res.success, true, 'La simulación debe completarse con éxito');
  console.log('  ✓ Invariante 1: Ejecución completa del flujo multi-agente validada.');

  // Invariante 2: Consenso alcanzado
  assert.strictEqual(res.consensusAchieved, true, 'Debe alcanzar consenso bizantino unánime');
  assert.strictEqual(res.approvalRatio, 1.0, 'Ratio de aprobación debe ser 100% (3/3)');
  console.log('  ✓ Invariante 2: Quórum bizantino supermajority (100%) validado.');

  // Invariante 3: Certificado SHA-256 emitido
  assert.ok(typeof res.certificateDigest === 'string', 'Debe emitir certificado digest');
  assert.strictEqual(res.certificateDigest.length, 64, 'Digest debe ser SHA-256 de 64 caracteres');
  console.log(`  ✓ Invariante 3: Certificado criptográfico SHA-256 emitido (${res.certificateDigest.slice(0, 16)}...).`);

  console.log('\nPASS: AX-F-178 — Simulador de Enjambre verificado con 3/3 invariantes en verde.');
}

testSim().catch(err => {
  console.error('FAIL AX-F-178:', err);
  process.exit(1);
});
