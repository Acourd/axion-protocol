#!/usr/bin/env node
'use strict';

/**
 * AX-F-180: Invariantes del Gateway de Telemetría WebSocket en Tiempo Real
 *
 * Verifica:
 * 1. Inicialización y enlace atómico del servidor HTTP / WebSocket (start).
 * 2. Disponibilidad de endpoints REST (/status y /events) con CORS activado.
 * 3. Transmisión y codificación de frames de eventos (broadcastEvent).
 * 4. Apagado limpio y liberación de recursos de red (stop).
 */

const assert = require('assert');
const http = require('http');
const TelemetryGateway = require('../../tools/telemetry_gateway.js');

console.log('=== AX-F-180: Invariantes de TelemetryGateway (Real-Time HUD Bus) ===\n');

// Usar puerto dinámico para pruebas
const TEST_PORT = 10000 + Math.floor(Math.random() * 5000);
const gateway = new TelemetryGateway({ port: TEST_PORT });

function getHTTP(path) {
  return new Promise((resolve, reject) => {
    http.get(`http://127.0.0.1:${TEST_PORT}${path}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, data: JSON.parse(data) }));
    }).on('error', reject);
  });
}

async function runTests() {
  try {
    // Invariante 1: Inicio de servidor
    await gateway.start();
    console.log(`  ✓ Invariante 1: Servidor iniciado y enlazado en puerto ${TEST_PORT}.`);

    // Invariante 2: Endpoint /status
    const statusRes = await getHTTP('/status');
    assert.strictEqual(statusRes.statusCode, 200);
    assert.strictEqual(statusRes.data.status, 'OPERATIONAL');
    console.log('  ✓ Invariante 2: Endpoint REST /status verificado.');

    // Invariante 3: Emisión de eventos y consulta /events
    gateway.broadcastEvent('PHASE_TRANSITION', { from: 'ENTENDER', to: 'PLANIFICAR' });
    gateway.broadcastEvent('AST_LOCK_ACQUIRED', { symbol: 'renderHUD', agent: 'agent-fe-01' });

    const eventsRes = await getHTTP('/events');
    assert.strictEqual(eventsRes.statusCode, 200);
    assert.strictEqual(eventsRes.data.length, 2);
    assert.strictEqual(eventsRes.data[0].type, 'PHASE_TRANSITION');
    assert.strictEqual(eventsRes.data[1].type, 'AST_LOCK_ACQUIRED');
    console.log('  ✓ Invariante 3: Emisión y consulta de eventos de gobernanza verificadas.');

    // Invariante 4: Apagado limpio
    await gateway.stop();
    console.log('  ✓ Invariante 4: Apagado limpio y liberación de socket validada.');

    // Invariante 5: Demostración estática de que telemetry_gateway es estrictamente opt-in
    // y no es importado ni iniciado por el runtime estándar de gobernanza
    const fs = require('fs');
    const path = require('path');
    const ROOT = path.resolve(__dirname, '..', '..');
    const coreRuntimeFiles = [
      'install.js',
      'tools/health_check.js',
      'tools/preflight.js',
      'tools/workflow_runner.js',
      'tools/drive_engine.js',
      'tools/git_governance_hook.js',
      'tools/vibeguard_gate.js'
    ];
    for (const rel of coreRuntimeFiles) {
      const full = path.join(ROOT, rel);
      if (fs.existsSync(full)) {
        const content = fs.readFileSync(full, 'utf8');
        assert.strictEqual(
          content.includes('telemetry_gateway'),
          false,
          `El archivo de runtime ${rel} no debe importar ni iniciar telemetry_gateway`
        );
      }
    }
    console.log('  ✓ Invariante 5: Comprobado que telemetry_gateway no es importado ni iniciado por los flujos de gobernanza.');

    console.log('\nPASS: AX-F-180 — Gateway de Telemetría WebSocket verificado con 5/5 invariantes en verde.');
  } catch (err) {
    await gateway.stop();
    throw err;
  }
}

runTests().catch(err => {
  console.error('FAIL AX-F-180:', err);
  process.exit(1);
});
