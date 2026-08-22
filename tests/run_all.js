#!/usr/bin/env node
'use strict';

/**
 * Ejecuta las tres tandas de pruebas y devuelve un codigo de salida agregado.
 *
 * Sin dependencias ni runner de terceros: cada suite es un proceso hijo, igual que
 * cuando se lanzan a mano. Existe porque ejecutarlas una a una son mas de treinta
 * comandos, y esa friccion basto para que la suite completa pasara mucho tiempo sin
 * ejecutarse entera.
 *
 *   node tests/run_all.js            todas
 *   node tests/run_all.js phase_e    solo una tanda
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const TESTS = __dirname;
const TANDAS = [
  { nombre: 'funcional', dir: TESTS },
  { nombre: 'regresion', dir: path.join(TESTS, 'regression') },
  { nombre: 'phase_e', dir: path.join(TESTS, 'phase_e') },
];

const filtro = process.argv[2];
const seleccion = filtro ? TANDAS.filter((t) => t.nombre === filtro) : TANDAS;
if (seleccion.length === 0) {
  console.error(`Tanda desconocida: ${filtro}. Opciones: ${TANDAS.map((t) => t.nombre).join(', ')}.`);
  process.exit(2);
}

const suites = (dir) => (fs.existsSync(dir)
  ? fs.readdirSync(dir).filter((f) => f.endsWith('.test.js')).sort()
  : []);

const fallos = [];
let total = 0;

for (const tanda of seleccion) {
  const ficheros = suites(tanda.dir);
  console.log(`\n=== ${tanda.nombre} (${ficheros.length}) ===`);
  for (const fichero of ficheros) {
    total += 1;
    const abs = path.join(tanda.dir, fichero);
    const r = spawnSync(process.execPath, [abs], { encoding: 'utf8' });
    const nombre = fichero.replace('.test.js', '');
    if (r.status === 0) {
      console.log(`  PASS  ${nombre}`);
    } else {
      console.log(`  FAIL  ${nombre}  (salida ${r.status})`);
      fallos.push({ tanda: tanda.nombre, nombre, salida: (r.stdout || '') + (r.stderr || '') });
    }
  }
}

console.log(`\n=== RESUMEN ===`);
console.log(`  suites   ${total}`);
console.log(`  en verde ${total - fallos.length}`);
console.log(`  en rojo  ${fallos.length}`);

if (fallos.length > 0) {
  for (const f of fallos) {
    console.log(`\n--- ${f.tanda}/${f.nombre} ---`);
    // Solo la cola: lo que interesa de una suite en rojo es donde revento.
    console.log(f.salida.split('\n').slice(-18).join('\n').trimEnd());
  }
  console.log(`\nFAIL: ${fallos.length} de ${total} suites en rojo.`);
  process.exit(1);
}

console.log(`\nPASS: las ${total} suites estan en verde.`);
process.exit(0);
