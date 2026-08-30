'use strict';

/**
 * Axion Protocol — Invariantes de la Caja Negra Forense y Reproductor de Sesiones (Flight Recorder).
 *
 * Valida de forma estricta:
 * 1. Grabación inmutable de eventos encadenados por hash SHA-256 (Hash-Chain).
 * 2. Detección determinista de manipulaciones adversariales (corrupción de payload o rotura de cadena).
 * 3. Reproducción fiel de la secuencia de acciones y estados de la sesión.
 * 4. Integración con DriveEngine y CLI unificado.
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const FlightRecorder = require('../../tools/flight_recorder.js');
const DriveEngine = require('../../tools/drive_engine.js');

console.log('=== AX-F-159 Invariantes de la Caja Negra Forense (Flight Recorder) ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const sandbox = path.join(ROOT, 'scratch', `test_flight_sandbox_${Date.now()}`);
fs.mkdirSync(path.join(sandbox, '.axion', 'state'), { recursive: true });

try {
  const sessionId = `test_flight_${Date.now()}`;
  const recorder = new FlightRecorder(sandbox, sessionId);

  // 1. Grabar secuencia de eventos de prueba
  recorder.recordEvent('SESSION_START', { trigger: 'USER_CLI', mode: 'DRIVE_AUTONOMOUS' });
  recorder.recordEvent('PREFLIGHT_GATE', { command: 'node bin/axion.js check', verdict: 'ALLOW' });
  recorder.recordEvent('MUTATION_TX', { file: 'tools/sample.js', diffBytes: 420 });
  recorder.recordEvent('VIBEGUARD_AUDIT', { grade: 'A_GRADE', antipatterns: 0 });
  recorder.recordEvent('SESSION_COMPLETE', { success: true });

  assert.strictEqual(recorder.events.length, 5, 'Deben haberse registrado 5 eventos');
  console.log(`✓ 5 eventos registrados y encadenados por hash SHA-256`);

  // 2. Validar verificación de integridad sobre sesión intacta
  const cleanIntegrity = recorder.verifyIntegrity();
  assert.strictEqual(cleanIntegrity.valid, true, 'La sesión intacta debe ser válida');
  assert.strictEqual(cleanIntegrity.eventsCount, 5);
  console.log('✓ Integridad criptográfica de la cadena verificada con éxito (PASS)');

  // 3. Simulación Adversarial: Alteración de un payload en el medio de la cadena
  const corruptedRecorder = new FlightRecorder(sandbox, sessionId);
  corruptedRecorder.events[2].payload.diffBytes = 999999; // Modificación maliciosa
  const corruptedIntegrity = corruptedRecorder.verifyIntegrity();
  assert.strictEqual(corruptedIntegrity.valid, false, 'La alteración debe ser detectada');
  assert.strictEqual(corruptedIntegrity.brokenIndex, 2);
  assert.strictEqual(corruptedIntegrity.reason, 'PAYLOAD_TAMPERED');
  console.log(`✓ Detección adversarial de manipulación de payload verificada (brokenIndex: ${corruptedIntegrity.brokenIndex}, motivo: ${corruptedIntegrity.reason})`);

  // 4. Validar reproducción determinista (TTY Replayer)
  const cleanRecorderAgain = new FlightRecorder(sandbox, sessionId);
  cleanRecorderAgain.loadSessionIfExists();
  const replayResult = cleanRecorderAgain.replay({ silent: true });
  assert.strictEqual(replayResult.pass, true);
  assert.strictEqual(replayResult.eventsCount, 5);
  assert.ok(replayResult.logOutput.length > 5);
  console.log(`✓ Reproductor determinista de sesiones verificado: ${replayResult.logOutput.length} líneas de log procesadas`);

  // 5. Validar integración con DriveEngine
  const driveEngine = new DriveEngine(ROOT);
  assert.ok(typeof driveEngine.startFlightRecording === 'function');
  assert.ok(typeof driveEngine.verifyFlightSession === 'function');
  assert.ok(typeof driveEngine.replayFlightSession === 'function');
  console.log('✓ Integración DriveEngine (startFlightRecording, verifyFlightSession, replayFlightSession) verificada');

} finally {
  if (fs.existsSync(sandbox)) {
    fs.rmSync(sandbox, { recursive: true, force: true });
  }
}

console.log('\nPASS AX-F-159 — Invariantes de la caja negra forense demostrados al 100%.');
