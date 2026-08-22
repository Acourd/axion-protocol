#!/usr/bin/env node
'use strict';

/**
 * Axion Protocol - Parada de emergencia (kill switch).
 *
 * El cuarto control de gobernanza, junto a permiso, aprobacion y evidencia: poder
 * detener el sistema. Hasta ahora el protocolo sabia bloquear una tarea concreta,
 * pero no habia forma de decir "para todo, ahora, y no sigas hasta que yo vuelva".
 *
 * Diseno, y su asimetria deliberada:
 *
 *   - Parar es facil. Escribir el fichero de parada basta, y no exige firma. Ante la
 *     duda, detener siempre debe ser mas barato que continuar.
 *   - Reanudar es un acto humano explicito, fuera del runtime: hay que borrar el
 *     fichero a mano. El orquestador nunca se reanuda solo.
 *   - Ante la duda, se considera detenido. Un fichero ilegible o corrupto NO se
 *     interpreta como "no hay parada": se interpreta como parada, porque no se puede
 *     demostrar lo contrario.
 *
 * LIMITE DECLARADO, y conviene no exagerarlo:
 *
 *   Esto detiene automatismos, no adversarios. Quien tenga permiso de escritura sobre
 *   el directorio de parada puede borrar el fichero. Contra un ejecutor hostil con
 *   acceso al disco, este control no es una garantia. Protege del caso real y frecuente
 *   —un agente que se desboca y hay que frenar— no del caso adversario.
 *
 *   Elevarlo exigiria que la reanudacion llevara firma Ed25519 de una autoridad humana,
 *   y que el estado viviera fuera del alcance del ejecutor. Queda fuera del alcance de
 *   esta version y esta declarado como tal.
 */

const fs = require('fs');
const path = require('path');

const HALT_STATUS = Object.freeze({
  RUNNING: 'RUNNING',
  HALTED: 'HALTED',
  HALT_STATE_UNREADABLE: 'HALT_STATE_UNREADABLE',
});

const NOMBRE_FICHERO = 'HALT';
const DIR_POR_DEFECTO = path.resolve(__dirname, '..', '.axion');

function directorio(opciones = {}) {
  return opciones.haltDir ? path.resolve(opciones.haltDir) : DIR_POR_DEFECTO;
}

function rutaFichero(opciones = {}) {
  return path.join(directorio(opciones), NOMBRE_FICHERO);
}

/**
 * Lee el estado de parada. Nunca lanza: devuelve siempre un veredicto, porque un
 * fallo al leerlo tiene que traducirse en bloqueo, no en una excepcion que alguien
 * pueda capturar y seguir adelante.
 */
function readHaltState(opciones = {}) {
  const fichero = rutaFichero(opciones);

  let bruto;
  try {
    if (!fs.existsSync(fichero)) {
      return Object.freeze({ status: HALT_STATUS.RUNNING, halted: false });
    }
    bruto = fs.readFileSync(fichero, 'utf8');
  } catch (_) {
    // Existe pero no se puede leer: no se puede demostrar que no haya parada.
    return Object.freeze({
      status: HALT_STATUS.HALT_STATE_UNREADABLE,
      halted: true,
      reason: 'El registro de parada existe pero no se puede leer.',
    });
  }

  let registro;
  try {
    registro = JSON.parse(bruto);
  } catch (_) {
    return Object.freeze({
      status: HALT_STATUS.HALT_STATE_UNREADABLE,
      halted: true,
      reason: 'El registro de parada esta corrupto.',
    });
  }

  if (!registro || typeof registro !== 'object' || Array.isArray(registro)
      || typeof registro.reason !== 'string' || registro.reason.trim() === ''
      || typeof registro.haltedAt !== 'string' || !Number.isFinite(Date.parse(registro.haltedAt))) {
    return Object.freeze({
      status: HALT_STATUS.HALT_STATE_UNREADABLE,
      halted: true,
      reason: 'El registro de parada esta malformado.',
    });
  }

  return Object.freeze({
    status: HALT_STATUS.HALTED,
    halted: true,
    reason: registro.reason,
    haltedAt: registro.haltedAt,
    haltedBy: typeof registro.haltedBy === 'string' ? registro.haltedBy : null,
  });
}

/**
 * Detiene el sistema. Idempotente: parar algo ya parado no es un error.
 */
function halt(reason, opciones = {}) {
  if (typeof reason !== 'string' || reason.trim() === '') {
    throw new TypeError('Una parada exige un motivo escrito.');
  }
  const dir = directorio(opciones);
  fs.mkdirSync(dir, { recursive: true });
  const registro = {
    reason: reason.trim(),
    haltedAt: (opciones.now instanceof Date ? opciones.now : new Date()).toISOString(),
    haltedBy: typeof opciones.haltedBy === 'string' ? opciones.haltedBy : null,
  };
  fs.writeFileSync(path.join(dir, NOMBRE_FICHERO), JSON.stringify(registro, null, 2) + '\n', 'utf8');
  return Object.freeze({ status: HALT_STATUS.HALTED, ...registro });
}

/**
 * Reanuda. Existe para la CLI y para las pruebas; el orquestador nunca la invoca,
 * porque reanudar no puede ser una decision del propio runtime.
 */
function clearHalt(opciones = {}) {
  const fichero = rutaFichero(opciones);
  try {
    if (fs.existsSync(fichero)) fs.unlinkSync(fichero);
    return Object.freeze({ status: HALT_STATUS.RUNNING, halted: false });
  } catch (error) {
    return Object.freeze({
      status: HALT_STATUS.HALT_STATE_UNREADABLE,
      halted: true,
      reason: `No se pudo retirar la parada: ${error.message}`,
    });
  }
}

const USO = [
  'Uso:',
  '  node tools/killswitch.js status              consulta el estado',
  '  node tools/killswitch.js halt "<motivo>"     detiene el sistema',
  '  node tools/killswitch.js resume              retira la parada',
  '',
  'Mientras haya parada, executeHybridWorkflow bloquea toda tarea antes de la fase 1.',
  'Un registro de parada ilegible cuenta como parada: ante la duda, no se ejecuta.',
  '',
  'Codigos de salida: 0 en marcha, 1 detenido, 2 uso incorrecto.',
].join('\n');

function main() {
  const [accion, ...resto] = process.argv.slice(2);

  if (accion === 'status' || accion === undefined) {
    const estado = readHaltState();
    console.log(JSON.stringify(estado, null, 2));
    process.exit(estado.halted ? 1 : 0);
  }

  if (accion === 'halt') {
    const motivo = resto.join(' ').trim();
    if (motivo === '') {
      console.log('Una parada exige un motivo escrito. Ejemplo:');
      console.log('  node tools/killswitch.js halt "el agente esta tocando produccion"');
      process.exit(2);
    }
    console.log(JSON.stringify(halt(motivo), null, 2));
    process.exit(1);
  }

  if (accion === 'resume') {
    console.log(JSON.stringify(clearHalt(), null, 2));
    process.exit(0);
  }

  console.log(USO);
  process.exit(2);
}

if (require.main === module) main();

module.exports = { HALT_STATUS, readHaltState, halt, clearHalt, USO };
