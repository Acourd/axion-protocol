#!/usr/bin/env node
'use strict';

/**
 * AX-F-182: Invariantes del Conector de Telemetría en Vivo (Live HUD Connector)
 *
 * Verifica:
 * 1. Handshake y conexión WebSocket cliente-servidor nativo (connect).
 * 2. Recepción y deserialización de frames de eventos de gobernanza.
 * 3. Despacho de eventos tipados hacia escuchadores registrados.
 * 4. Desconexión limpia sin sockets huérfanos (disconnect).
 */

const assert = require('assert');
const TelemetryGateway = require('../../tools/telemetry_gateway.js');
const LiveHUDConnector = require('../../tools/live_hud_connector.js');

console.log('=== AX-F-182: Invariantes de LiveHUDConnector (HUD Bus Client) ===\n');

const TEST_PORT = 15000 + Math.floor(Math.random() * 5000);
const gateway = new TelemetryGateway({ port: TEST_PORT });
const connector = new LiveHUDConnector({ port: TEST_PORT });

async function runTests() {
  try {
    // Iniciar servidor de prueba
    await gateway.start();

    // Invariante 1: Conexión WebSocket
    const connected = await connector.connect();
    assert.strictEqual(connected, true, 'Debe conectarse al servidor WebSocket');
    assert.strictEqual(connector.connected, true);
    console.log(`  ✓ Invariante 1: Conexión WebSocket cliente-servidor exitosa en puerto ${TEST_PORT}.`);

    // Invariante 2: Recepción y despacho de eventos en tiempo real
    const receivedEvents = [];
    connector.on('event', (evt) => {
      receivedEvents.push(evt);
    });

    gateway.broadcastEvent('BFT_VOTE_CAST', { voter: 'agent-security-03', verdict: 'APPROVE' });
    gateway.broadcastEvent('PHASE_TRANSITION', { from: 'TEST', to: 'CONSTRUIR' });

    // Esperar brevemente a la entrega de frames
    await new Promise(r => setTimeout(r, 100));

    assert.strictEqual(receivedEvents.length, 2, 'Debe recibir exactamente 2 eventos');
    assert.strictEqual(receivedEvents[0].type, 'BFT_VOTE_CAST');
    assert.strictEqual(receivedEvents[1].type, 'PHASE_TRANSITION');
    console.log('  ✓ Invariante 2: Recepción y deserialización de eventos en tiempo real validada.');

    // Invariante 3: Desconexión limpia
    connector.disconnect();
    assert.strictEqual(connector.connected, false);
    console.log('  ✓ Invariante 3: Desconexión limpia validada.');

    await gateway.stop();
    console.log('\nPASS: AX-F-182 — Conector Live HUD verificado con 3/3 invariantes en verde.');
  } catch (err) {
    connector.disconnect();
    await gateway.stop();
    throw err;
  }
}

runTests().catch(err => {
  console.error('FAIL AX-F-182:', err);
  process.exit(1);
});
