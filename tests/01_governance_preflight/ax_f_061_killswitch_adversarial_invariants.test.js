'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const {
  HALT_STATUS,
  readHaltState,
  halt,
  clearHalt
} = require('../../tools/killswitch.js');

console.log('=== AX-F-061 Invariantes Fail-Closed y Resiliencia Adversarial del Killswitch ===\n');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'axion-killswitch-test-'));

try {
  // 1. Estado inicial sin parada (RUNNING)
  const sInicial = readHaltState({ haltDir: tempDir });
  assert.strictEqual(sInicial.status, HALT_STATUS.RUNNING);
  assert.strictEqual(sInicial.halted, false);
  assert.strictEqual(Object.isFrozen(sInicial), true);
  console.log('✓ Estado inicial RUNNING verificado');

  // 2. Parada válida y preservación de metadatos
  const sHalt = halt('Agente desbocado detectado en simulación', {
    haltDir: tempDir,
    haltedBy: 'sec-auditor-alpha'
  });
  assert.strictEqual(sHalt.status, HALT_STATUS.HALTED);
  assert.strictEqual(sHalt.reason, 'Agente desbocado detectado en simulación');
  assert.strictEqual(sHalt.haltedBy, 'sec-auditor-alpha');
  assert.strictEqual(typeof sHalt.haltedAt, 'string');
  assert.strictEqual(Number.isFinite(Date.parse(sHalt.haltedAt)), true);
  console.log('✓ Parada válida con metadatos sellada');

  // 3. Lectura de estado detenido (HALTED)
  const sLeido = readHaltState({ haltDir: tempDir });
  assert.strictEqual(sLeido.status, HALT_STATUS.HALTED);
  assert.strictEqual(sLeido.halted, true);
  assert.strictEqual(sLeido.reason, 'Agente desbocado detectado en simulación');
  assert.strictEqual(sLeido.haltedBy, 'sec-auditor-alpha');
  console.log('✓ Lectura de estado detenido HALTED verificada');

  // 4. Rechazo de parada sin motivo válido (fail-closed)
  assert.throws(() => halt('', { haltDir: tempDir }), TypeError);
  assert.throws(() => halt('   ', { haltDir: tempDir }), TypeError);
  assert.throws(() => halt(null, { haltDir: tempDir }), TypeError);
  assert.throws(() => halt(undefined, { haltDir: tempDir }), TypeError);
  console.log('✓ Rechazo por validación estricta de motivo verificado');

  // 5. Matriz de corrupción adversarial: ante cualquier defecto, el sistema se considera detenido
  const rutaHalt = path.join(tempDir, 'HALT');

  // 5a. Fichero con JSON corrupto / truncado
  fs.writeFileSync(rutaHalt, '{ "reason": "incompleto", ', 'utf8');
  const sCorrupto = readHaltState({ haltDir: tempDir });
  assert.strictEqual(sCorrupto.status, HALT_STATUS.HALT_STATE_UNREADABLE);
  assert.strictEqual(sCorrupto.halted, true);
  assert.strictEqual(sCorrupto.reason, 'El registro de parada esta corrupto.');
  console.log('✓ Fail-closed ante JSON corrupto verificado');

  // 5b. Fichero malformado: motivo vacío
  fs.writeFileSync(rutaHalt, JSON.stringify({ reason: '   ', haltedAt: new Date().toISOString() }), 'utf8');
  const sVacio = readHaltState({ haltDir: tempDir });
  assert.strictEqual(sVacio.status, HALT_STATUS.HALT_STATE_UNREADABLE);
  assert.strictEqual(sVacio.halted, true);
  console.log('✓ Fail-closed ante motivo vacío en disco verificado');

  // 5c. Fichero malformado: timestamp inválido
  fs.writeFileSync(rutaHalt, JSON.stringify({ reason: 'Motivo valido', haltedAt: 'FECHA_INVALIDA_2026' }), 'utf8');
  const sFechaInvalida = readHaltState({ haltDir: tempDir });
  assert.strictEqual(sFechaInvalida.status, HALT_STATUS.HALT_STATE_UNREADABLE);
  assert.strictEqual(sFechaInvalida.halted, true);
  console.log('✓ Fail-closed ante timestamp no parseable verificado');

  // 5d. Fichero malformado: array en vez de objeto
  fs.writeFileSync(rutaHalt, JSON.stringify(['no', 'es', 'objeto']), 'utf8');
  const sArray = readHaltState({ haltDir: tempDir });
  assert.strictEqual(sArray.status, HALT_STATUS.HALT_STATE_UNREADABLE);
  assert.strictEqual(sArray.halted, true);
  console.log('✓ Fail-closed ante payload tipo array verificado');

  // 6. Reanudación explícita (clearHalt)
  const sReanudado = clearHalt({ haltDir: tempDir });
  assert.strictEqual(sReanudado.status, HALT_STATUS.RUNNING);
  assert.strictEqual(sReanudado.halted, false);
  assert.strictEqual(fs.existsSync(rutaHalt), false);
  console.log('✓ Reanudación explícita (clearHalt) verificada');

  // 7. Idempotencia de reanudación cuando no hay fichero
  const sReanudado2 = clearHalt({ haltDir: tempDir });
  assert.strictEqual(sReanudado2.status, HALT_STATUS.RUNNING);
  assert.strictEqual(sReanudado2.halted, false);
  console.log('✓ Idempotencia de reanudación verificada');

} finally {
  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch (_) {}
}

console.log('\nPASS AX-F-061 — Invariantes Fail-Closed del Killswitch demostrados al 100%.\n');
