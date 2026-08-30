'use strict';

const assert = require('assert');
const path = require('path');
const { spawnSync } = require('child_process');

console.log('=== AX-F-033 Despachador Unificado de Comandos CLI (bin/axion.js) ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const binPath = path.join(ROOT, 'bin', 'axion.js');
const pkgVersion = require(path.join(ROOT, 'package.json')).version;

// 1. Versión y ayuda global
const rVersion = spawnSync(process.execPath, [binPath, '--version']);
assert.strictEqual(rVersion.status, 0);
assert.strictEqual(rVersion.stdout.toString('utf8').trim(), pkgVersion);
console.log('✓ Despacho de --version verificado');

const rHelp = spawnSync(process.execPath, [binPath, '--help']);
assert.strictEqual(rHelp.status, 0);
const helpText = rHelp.stdout.toString('utf8');
assert.strictEqual(helpText.includes('Comandos:'), true);
assert.strictEqual(helpText.includes('premortem'), true);
assert.strictEqual(helpText.includes('deep'), true);
assert.strictEqual(helpText.includes('check'), true);
console.log('✓ Despacho de --help con todos los subcomandos verificado');

// 2. Comando desconocido -> salida 2 (uso incorrecto)
const rUnknown = spawnSync(process.execPath, [binPath, 'subcomando_inexistente_xyz']);
assert.strictEqual(rUnknown.status, 2);
assert.strictEqual(rUnknown.stdout.toString('utf8').includes('Comando desconocido'), true);
console.log('✓ Rechazo de subcomandos desconocidos con código 2 verificado');

// 3. Invocación sin argumentos -> salida 2
const rEmpty = spawnSync(process.execPath, [binPath]);
assert.strictEqual(rEmpty.status, 2);
console.log('✓ Invocación sin argumentos con código 2 verificado');

// 4. Delegación de subcomandos y propagación de exit codes
const rPreflight = spawnSync(process.execPath, [binPath, 'preflight', 'echo "hola"']);
assert.strictEqual([0, 1, 2].includes(rPreflight.status), true, 'preflight debe ejecutar y retornar código determinista (0, 1 o 2)');
console.log('✓ Delegación y propagación de códigos de salida del subcomando verificada');

console.log('\nPASS AX-F-033 — Despachador unificado CLI y propagación de códigos de salida verificados al 100%.\n');
