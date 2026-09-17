#!/usr/bin/env node
'use strict';

/**
 * AX-F-235: Precisión del veredicto del verificador concurrente.
 *
 * El mensaje final JAMÁS puede llevar un total fijo: debe derivarse del conteo real
 * de cada corrida, y cualquier discrepancia entre corridas verdes es FAIL. Esta suite
 * falla si alguien reintroduce un total hardcodeado o si el texto no refleja lo medido.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { resumir, construirResumen } = require('../../tools/concurrent_suite_check.js');

console.log('=== AX-F-235 Precisión del veredicto concurrente (conteo derivado) ===\n');

const ROOT = path.resolve(__dirname, '..', '..');

function salidaVerde(total) {
  return [
    '=== Suites concurrentes sobre el mismo checkout (runs=2, workers/run=4) ===',
    `  run 1: exit=0 verde=${total} rojo=0 PASS`,
    '',
    '=== RESUMEN DE DOMINIOS ===',
    `  suites totales : ${total}`,
    `  en verde       : ${total}`,
    '  en rojo        : 0',
    `PASS: las ${total} suites en los 5 dominios de gobernanza están en verde.`
  ].join('\n');
}

function corrida(run, total) {
  const r = { run, code: 0, signal: null, timedOut: false, salida: salidaVerde(total), logFile: `run-${run}.log` };
  r.resumen = resumir(r);
  return r;
}

// 1. Parser: extrae los conteos reales del resumen de la corrida
const parseada = corrida(1, 243);
assert.strictEqual(parseada.resumen.verde, '243', 'resumir debe extraer el total verde real');
assert.strictEqual(parseada.resumen.rojo, '0');
assert.strictEqual(parseada.resumen.paso, true);
console.log('✓ Parser de resumen deriva el conteo real de la salida');

// 2. Veredicto con 243: el texto se deriva (y no arrastra el total viejo de 242)
const v243 = construirResumen([corrida(1, 243), corrida(2, 243)]);
assert.strictEqual(v243.ok, true);
assert.ok(v243.mensaje.includes('243/243'), `El veredicto debe contener 243/243: ${v243.mensaje}`);
assert.ok(!v243.mensaje.includes('242'), 'El veredicto no puede contener totales ajenos al conteo real');
console.log('✓ Veredicto verde con 243/243 derivado del conteo');

// 3. Veredicto con 242: el mismo código reporta el otro total (no hay valor fijo)
const v242 = construirResumen([corrida(1, 242), corrida(2, 242)]);
assert.strictEqual(v242.ok, true);
assert.ok(v242.mensaje.includes('242/242'));
console.log('✓ Veredicto verde con 242/242 derivado del conteo');

// 4. Discrepancia entre corridas verdes: FAIL por evidencia inconsistente
const discrepante = construirResumen([corrida(1, 243), corrida(2, 242)]);
assert.strictEqual(discrepante.ok, false, 'Totales distintos entre corridas verdes deben fallar');
assert.ok(discrepante.mensaje.includes('243') && discrepante.mensaje.includes('242'));
assert.ok(discrepante.mensaje.includes('FAIL'));
console.log('✓ Discrepancia de totales entre corridas: FAIL (evidencia inconsistente)');

// 5. Corrida sin resumen: FAIL con conteo derivado (1/2), sin números fijos
const sinResumen = {
  run: 2,
  code: 1,
  signal: null,
  timedOut: false,
  salida: '=== Suites concurrentes ===\n  (proceso terminado antes del resumen)',
  logFile: 'run-2.log'
};
sinResumen.resumen = resumir(sinResumen);
assert.strictEqual(sinResumen.resumen.verde, null);
const vParcial = construirResumen([corrida(1, 243), sinResumen]);
assert.strictEqual(vParcial.ok, false);
assert.ok(vParcial.mensaje.includes('1/2'), `El FAIL debe derivar 1/2 corridas verdes: ${vParcial.mensaje}`);
console.log('✓ Corrida incompleta: FAIL 1/2 derivado (sin total fijo)');

// 6. Anti-regresión estática: el verificador no puede volver a un total hardcodeado
const fuente = fs.readFileSync(path.join(ROOT, 'tools', 'concurrent_suite_check.js'), 'utf8');
assert.ok(!/242\/242/.test(fuente), 'El verificador no debe contener un total fijo 242/242');
assert.ok(!/\b2\d\d\/2\d\d\b/.test(fuente), 'El verificador no debe contener ningún total fijo tipo NNN/NNN');
console.log('✓ Anti-regresión: sin totales fijos en el verificador');

console.log('\nPASS AX-F-235 — Veredicto concurrente derivado del conteo real verificado.');
