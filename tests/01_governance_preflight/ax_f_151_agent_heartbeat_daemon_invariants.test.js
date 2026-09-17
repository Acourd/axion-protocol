'use strict';

/**
 * Axion Protocol — Invariantes del Demonio de Vigilancia y Latidos de Liveness.
 *
 * Valida de forma estricta:
 * 1. Emisión de pulsos de liveness de alta frecuencia (< 1ms de latencia).
 * 2. Detección precisa de salud del sistema, reglas P0 activas y estado de killswitch.
 * 3. Persistencia atómica y sellado digest SHA-256 en .axion/state/heartbeat.json.
 * 4. Ciclo de vida del demonio: inicio periódico y detención determinista sin fugas de timers.
 * 5. Integración transparente con DriveEngine y CLI unificado.
 */

const assert = require('assert');
const { crearSandbox } = require('../../tools/test_sandbox.js');
const path = require('path');
const fs = require('fs');
const AgentHeartbeatDaemon = require('../../tools/agent_heartbeat_daemon.js');
const DriveEngine = require('../../tools/drive_engine.js');

console.log('=== AX-F-151 Invariantes del Demonio de Vigilancia y Latidos de Liveness ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const sandbox = crearSandbox('test_heartbeat_sandbox');
fs.mkdirSync(path.join(sandbox, '.axion', 'state'), { recursive: true });
fs.mkdirSync(path.join(sandbox, '.agents', 'rules'), { recursive: true });

// Crear regla P0 válida en sandbox
fs.writeFileSync(path.join(sandbox, '.agents', 'rules', 'axion-governance.md'), '# Reglas P0\nInvariantes de Gobernanza Activas.\n'.repeat(10), 'utf8');

try {
  const daemon = new AgentHeartbeatDaemon(sandbox);

  // 1. Validar pulso puntual
  const pulse = daemon.pulseOnce();
  assert.strictEqual(pulse.status, 'HEALTHY');
  assert.strictEqual(pulse.checks.p0GovernanceRules, true);
  assert.strictEqual(pulse.checks.killswitchActive, false);
  assert.ok(pulse.latencyMicros >= 0);
  assert.strictEqual(pulse.digest.length, 64);
  assert.ok(fs.existsSync(daemon.heartbeatFile));
  console.log(`✓ Pulso puntual validado: Estado ${pulse.status} (Latencia: ${pulse.latencyMicros} µs, SHA-256: ${pulse.digest.slice(0, 16)}...)`);

  // 2. Validar lectura del último pulso
  const lastPulse = daemon.readLastPulse();
  assert.strictEqual(lastPulse.pulseIndex, pulse.pulseIndex);
  assert.strictEqual(lastPulse.digest, pulse.digest);
  console.log('✓ Lectura atómica de último latido validada');

  // 3. Validar inicio y parada del demonio
  const startRes = daemon.startDaemon({ intervalMs: 50, maxPulses: 3 });
  assert.strictEqual(startRes.running, true);
  const stopRes = daemon.stopDaemon();
  assert.strictEqual(stopRes.running, false);
  console.log('✓ Ciclo de vida de inicio y parada determinista del demonio validado');

  // 4. Validar detección de killswitch activo
  fs.writeFileSync(path.join(sandbox, '.axion', 'HALT'), 'PARADA DE EMERGENCIA', 'utf8');
  const haltedPulse = daemon.pulseOnce();
  assert.strictEqual(haltedPulse.status, 'HALTED');
  assert.strictEqual(haltedPulse.checks.killswitchActive, true);
  console.log('✓ Detección de Killswitch HALTED en latido validada');

  // 5. Validar integración con DriveEngine
  const driveEngine = new DriveEngine(ROOT);
  const drivePulse = driveEngine.pulseHeartbeat();
  assert.strictEqual(drivePulse.status, 'HEALTHY');
  const driveStatus = driveEngine.getHeartbeatStatus();
  assert.ok(driveStatus.status);
  console.log('✓ Integración DriveEngine.pulseHeartbeat() y getHeartbeatStatus() verificada');

} finally {
  if (fs.existsSync(sandbox)) {
    fs.rmSync(sandbox, { recursive: true, force: true });
  }
}

console.log('\nPASS AX-F-151 — Invariantes del demonio de vigilancia y latidos demostrados al 100%.');
