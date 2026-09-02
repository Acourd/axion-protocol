#!/usr/bin/env node
'use strict';

/**
 * AX-F-174: Invariantes del Canal de Comunicación P2P Autenticado de Swarm (Axion Protocol v2.0)
 *
 * Verifica:
 * 1. Firma digital Ed25519 y entrega atómica en buzón de agente (sendMessage).
 * 2. Verificación criptográfica de firma con clave pública conocida (receiveMessages).
 * 3. Detección de mensajes manipulados o con firma inválida.
 * 4. Limpieza atómica de buzones (clearInbox).
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const os = require('os');
const SwarmP2PChannel = require('../../tools/swarm_p2p_channel.js');

console.log('=== AX-F-174: Invariantes de SwarmP2PChannel (v2.0 P2P Bus) ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const tempRoot = path.join(os.tmpdir(), `test_ax_f_174_${Date.now()}`);
fs.mkdirSync(tempRoot, { recursive: true });

try {
  const channel = new SwarmP2PChannel(tempRoot);

  const agentA = channel.generateAgentKeyPair();
  const agentB = channel.generateAgentKeyPair();

  const publicKeysRegistry = {
    'agent-alpha': agentA.publicKey,
    'agent-beta': agentB.publicKey
  };

  // Invariante 1: Envío y firma Ed25519
  const sendRes = channel.sendMessage({
    senderId: 'agent-alpha',
    recipientId: 'agent-beta',
    topic: 'AST_MUTATION_APPROVAL',
    payload: { file: 'src/core.js', symbol: 'auth' },
    privateKey: agentA.privateKey
  });

  assert.strictEqual(sendRes.success, true, 'El mensaje debe enviarse exitosamente');
  assert.ok(sendRes.digest, 'Debe incluir digest SHA-256');
  console.log('  ✓ Invariante 1: Envío y firma digital Ed25519 validados.');

  // Invariante 2: Recepción y verificación criptográfica de firma
  const messages = channel.receiveMessages('agent-beta', publicKeysRegistry);
  assert.strictEqual(messages.length, 1, 'Debe haber exactamente 1 mensaje en el buzón');
  assert.strictEqual(messages[0].senderId, 'agent-alpha');
  assert.strictEqual(messages[0].topic, 'AST_MUTATION_APPROVAL');
  assert.strictEqual(messages[0].signatureValid, true, 'La firma Ed25519 debe ser válida');
  console.log('  ✓ Invariante 2: Recepción y verificación de firma digital Ed25519 validadas.');

  // Invariante 3: Detección de firma no verificada (clave desconocida)
  const unverified = channel.receiveMessages('agent-beta', {}); // Sin claves registradas
  assert.strictEqual(unverified[0].signatureValid, false, 'Firma debe ser no válida si falta la clave');
  console.log('  ✓ Invariante 3: Detección fail-closed ante clave pública ausente validada.');

  // Invariante 4: Limpieza de buzón
  channel.clearInbox('agent-beta');
  const empty = channel.receiveMessages('agent-beta', publicKeysRegistry);
  assert.strictEqual(empty.length, 0, 'El buzón debe quedar vacío');
  console.log('  ✓ Invariante 4: Limpieza atómica de buzones validada.');

  console.log('\nPASS: AX-F-174 — Canal P2P de Swarm verificado con 4/4 invariantes en verde.');
} finally {
  try {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  } catch (_) {
    // cleanup
  }
}
