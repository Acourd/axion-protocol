'use strict';

/**
 * Parada de emergencia — el cuarto control de gobernanza.
 *
 * El protocolo sabia bloquear una tarea concreta, pero no habia forma de detener el
 * sistema entero. Esta suite fija las tres propiedades que hacen util a un kill switch:
 *
 *   1. Mientras haya parada, ninguna tarea avanza. Ni siquiera la fase 1.
 *   2. Ante la duda, detenido. Un registro ilegible o corrupto NO se interpreta como
 *      "no hay parada": eso convertiria un fallo de lectura en permiso para ejecutar.
 *   3. Reanudar es un acto explicito. El orquestador nunca se reanuda solo.
 *
 * Y una cuarta, que es la que evita el autoengano: sin parada, todo sigue funcionando
 * igual. Un interruptor que deja el sistema roto cuando esta suelto no es un control.
 */

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const { executeHybridWorkflow } = require('../../tools/workflow_runner.js');
const { HALT_STATUS, readHaltState, halt, clearHalt } = require('../../tools/killswitch.js');
const { createLowRiskFixture } = require('../trust_fixture.js');

const ROOT = path.join(__dirname, '..', '..');
const DIR = path.join(ROOT, '.phase-e', 'test-runtime', `halt-${process.pid}-${Date.now()}`);
fs.mkdirSync(DIR, { recursive: true });

const nuevoDir = (nombre) => path.join(DIR, `${nombre}-${crypto.randomBytes(3).toString('hex')}`);

let n = 0;
const ok = (d) => console.log(`  [${++n}] PASS: ${d}`);

console.log('=== Parada de emergencia ===\n');

function misionLimpia(id) {
  return createLowRiskFixture({
    missionId: id,
    assertions: ['comprobacion de parada'],
    modifiedFiles: [path.join(ROOT, 'tools', 'preflight.js')],
  });
}

// --- 1. Sin parada, todo funciona igual ------------------------------------
{
  const haltDir = nuevoDir('sin-parada');
  const f = misionLimpia('AX-HALT-001');
  const r = executeHybridWorkflow(f.payload, { ...f.runtime, haltDir });
  assert.strictEqual(r.status, 'VERIFIED',
    'sin parada, una mision valida debe completarse como siempre');
  ok('sin parada, una mision valida alcanza VERIFIED');
}

// --- 2. Con parada, nada avanza --------------------------------------------
{
  const haltDir = nuevoDir('con-parada');
  halt('el agente esta tocando produccion', { haltDir, haltedBy: 'operador' });

  const f = misionLimpia('AX-HALT-002');
  const r = executeHybridWorkflow(f.payload, { ...f.runtime, haltDir });

  assert.strictEqual(r.status, 'BLOCKED_SYSTEM_HALTED',
    'con parada activa, ninguna mision puede avanzar');
  assert.match(r.log.join('\n'), /\[0\. PARADA\]/, 'el bloqueo debe declararse en fase 0');
  assert.match(r.halt.reason, /produccion/, 'el motivo de la parada debe llegar al veredicto');
  ok('con parada, la mision se bloquea en fase 0 con su motivo');
}

// --- 3. Se bloquea ANTES de analizar la tarea -------------------------------
// Una peticion ambigua bloquearia por otro motivo en fase 1. Con parada activa debe
// ganar la parada: si no, el orden de las comprobaciones estaria mal.
{
  const haltDir = nuevoDir('precedencia');
  halt('parada de prueba', { haltDir });

  const r = executeHybridWorkflow({
    missionId: 'AX-HALT-003',
    title: 'algo',
    rawUserRequest: 'haz algo',
    risk: 'LOW',
  }, { haltDir });

  assert.strictEqual(r.status, 'BLOCKED_SYSTEM_HALTED',
    'la parada debe evaluarse antes que la ambiguedad de la peticion');
  ok('la parada tiene precedencia sobre cualquier otro motivo de bloqueo');
}

// --- 4. Ante la duda, detenido ---------------------------------------------
{
  const haltDir = nuevoDir('corrupto');
  fs.mkdirSync(haltDir, { recursive: true });
  fs.writeFileSync(path.join(haltDir, 'HALT'), 'esto no es JSON {{{', 'utf8');

  const estado = readHaltState({ haltDir });
  assert.strictEqual(estado.status, HALT_STATUS.HALT_STATE_UNREADABLE);
  assert.strictEqual(estado.halted, true,
    'un registro corrupto no puede leerse como "no hay parada"');

  const f = misionLimpia('AX-HALT-004');
  const r = executeHybridWorkflow(f.payload, { ...f.runtime, haltDir });
  assert.strictEqual(r.status, 'BLOCKED_SYSTEM_HALTED',
    'un registro de parada corrupto debe bloquear la ejecucion');
  ok('un registro corrupto cuenta como parada y bloquea');
}

{
  const haltDir = nuevoDir('malformado');
  fs.mkdirSync(haltDir, { recursive: true });
  // JSON valido, pero sin los campos que hacen falta para creerselo.
  fs.writeFileSync(path.join(haltDir, 'HALT'), JSON.stringify({ algo: 'otra cosa' }), 'utf8');

  const estado = readHaltState({ haltDir });
  assert.strictEqual(estado.halted, true,
    'un registro sin motivo ni fecha no acredita nada, asi que se asume parada');
  ok('un registro malformado tambien cuenta como parada');
}

// --- 5. Reanudar es explicito ----------------------------------------------
{
  const haltDir = nuevoDir('reanudar');
  halt('parada temporal', { haltDir });
  assert.strictEqual(readHaltState({ haltDir }).halted, true);

  clearHalt({ haltDir });
  assert.strictEqual(readHaltState({ haltDir }).halted, false,
    'tras retirar la parada, el sistema vuelve a estar en marcha');

  const f = misionLimpia('AX-HALT-005');
  const r = executeHybridWorkflow(f.payload, { ...f.runtime, haltDir });
  assert.strictEqual(r.status, 'VERIFIED',
    'retirada la parada, las misiones vuelven a completarse');
  ok('retirar la parada devuelve el sistema a su estado normal');
}

// --- 6. Parar exige un motivo escrito ---------------------------------------
{
  const haltDir = nuevoDir('sin-motivo');
  assert.throws(() => halt('', { haltDir }), /motivo/i,
    'una parada sin motivo no deja rastro util para quien la encuentre despues');
  assert.throws(() => halt('   ', { haltDir }), /motivo/i);
  ok('una parada exige un motivo escrito');
}

// --- 7. Parar es idempotente ------------------------------------------------
{
  const haltDir = nuevoDir('idempotente');
  halt('primera', { haltDir });
  halt('segunda', { haltDir });
  const estado = readHaltState({ haltDir });
  assert.strictEqual(estado.halted, true);
  assert.strictEqual(estado.reason, 'segunda',
    'parar dos veces no es un error; gana el motivo mas reciente');
  ok('parar algo ya parado no es un error');
}

console.log(`\nPASS parada de emergencia - ${n} comprobaciones`);
