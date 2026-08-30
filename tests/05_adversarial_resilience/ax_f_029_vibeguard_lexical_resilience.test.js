'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { inspectFileContent, scanFile } = require('../../tools/vibeguard.js');

console.log('=== AX-F-029 Resiliencia Léxica y Códigos de Salida en VibeGuard ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const scratchDir = path.join(ROOT, 'scratch', 'test_vibeguard');
if (!fs.existsSync(scratchDir)) {
  fs.mkdirSync(scratchDir, { recursive: true });
}

// 1. Distinción entre catch documentado (correcto) y catch mudo (antipatrón)
const cleanCatchCode = `
try {
  doSomething();
} catch (e) {
  // Ignorado intencionalmente por fallback
}
`;
const rClean = inspectFileContent(cleanCatchCode, 'clean.js');
assert.strictEqual(rClean.status, 'CLEAN', 'un catch con comentario explicativo debe considerarse limpio');

const silentCatchCode = `
try {
  doSomething();
} catch (e) {}
`;
const rMute = inspectFileContent(silentCatchCode, 'mute.js');
assert.strictEqual(rMute.status, 'ANTIPATTERNS_DETECTED');
assert.strictEqual(rMute.issues[0].category, 'SILENT_EXCEPTION');
console.log('✓ Distinción entre catch documentado y catch mudo verificada');

// 2. Resiliencia léxica ante barras de regex y división
const regexCode = `
const PATTERN = /^[a-z]+$/;
const result = a / b / c;
`;
const rRegex = inspectFileContent(regexCode, 'regex.js');
assert.strictEqual(rRegex.status, 'CLEAN', 'las expresiones regulares no deben generar falsos positivos');
console.log('✓ Resiliencia ante expresiones regulares y operadores aritméticos verificada');

// 3. Códigos de salida deterministas en CLI (0, 1, 2)
const cleanFile = path.join(scratchDir, 'clean.js');
fs.writeFileSync(cleanFile, 'console.log("ok");', 'utf8');

const badFile = path.join(scratchDir, 'bad.js');
fs.writeFileSync(badFile, 'try {} catch(e) {}', 'utf8');

const rCliClean = spawnSync(process.execPath, [path.join(ROOT, 'tools', 'vibeguard.js'), cleanFile]);
assert.strictEqual(rCliClean.status, 0, 'archivo limpio debe salir con 0');

const rCliBad = spawnSync(process.execPath, [path.join(ROOT, 'tools', 'vibeguard.js'), badFile]);
assert.strictEqual(rCliBad.status, 1, 'archivo con antipatrones debe salir con 1');

const rCliHelp = spawnSync(process.execPath, [path.join(ROOT, 'tools', 'vibeguard.js'), '--help']);
assert.strictEqual(rCliHelp.status, 2, '--help debe salir con 2');

const rCliMissing = spawnSync(process.execPath, [path.join(ROOT, 'tools', 'vibeguard.js'), path.join(scratchDir, 'no_existe.js')]);
assert.strictEqual(rCliMissing.status, 1, 'archivo inexistente debe salir con 1');
console.log('✓ Códigos de salida deterministas (0 / 1 / 2) en CLI verificados');

console.log('\nPASS AX-F-029 — VibeGuard inspección léxica y códigos de salida verificados al 100%.\n');
