'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { getProfile, saveCustomProfile, parseAnswers, DIMENSIONES } = require('../../tools/profile_adapter.js');

console.log('=== AX-F-025 Calibración de Perfil Adaptativo y Preservación de Estado ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const scratchDir = path.join(ROOT, 'scratch', 'test_profile_target');

// Limpieza previa
if (fs.existsSync(scratchDir)) {
  fs.rmSync(scratchDir, { recursive: true, force: true });
}
fs.mkdirSync(path.join(scratchDir, '.axion'), { recursive: true });

// 1. Lectura de perfil por defecto cuando no existe archivo
const def = getProfile(scratchDir);
assert.strictEqual(def.technical_depth, 'VISIONARY', 'el perfil por defecto debe ser VISIONARY');
assert.strictEqual(def.input_mode, 'VOICE_DICTATION', 'el método de entrada por defecto debe ser VOICE_DICTATION');
console.log('✓ Lectura de perfil por defecto correcta');

// 2. Parseo de respuestas separadas y fusionadas
const p1 = parseAnswers(['1C', '2B', '3B', '4A', '5B']);
assert.strictEqual(p1.errores.length, 0, 'no debe haber errores en respuestas válidas');
assert.strictEqual(p1.cambios.technical_depth, 'ENGINEER', '1C debe mapear a ENGINEER');
assert.strictEqual(p1.cambios.creative_autonomy, 'GUIDED_DIRECTION', '5B debe mapear a GUIDED_DIRECTION');

const p2 = parseAnswers(['1A2A3A4A5A']);
assert.strictEqual(p2.errores.length, 0, 'debe parsear respuestas pegadas sin espacios');
assert.strictEqual(p2.cambios.cadence, 'COMPLETE_BLOCK', '4A debe mapear a COMPLETE_BLOCK');
console.log('✓ Parseo de respuestas separadas y fusionadas verificado');

// 3. Detección de opciones inválidas
const pInvalida = parseAnswers(['1Z', '2A', '9A']);
assert.strictEqual(pInvalida.errores.length > 0, true, 'debe reportar error ante opciones inválidas');
console.log('✓ Detección de opciones inválidas verificada');

// 4. Persistencia en disco y fusión sin pérdida
const guardado = saveCustomProfile({ technical_depth: 'BUILDER', custom_flag: true }, scratchDir);
assert.strictEqual(guardado.technical_depth, 'BUILDER');
assert.strictEqual(guardado.custom_flag, true);
assert.strictEqual(guardado.input_mode, 'VOICE_DICTATION', 'debe preservar campos no tocados');

const releido = getProfile(scratchDir);
assert.strictEqual(releido.technical_depth, 'BUILDER');
assert.strictEqual(releido.custom_flag, true);
console.log('✓ Persistencia en disco y fusión sin pérdida verificada');

// 5. Invocación de CLI con exit codes
const rOk = spawnSync(process.execPath, [path.join(ROOT, 'tools', 'profile_adapter.js'), 'set', '1B', '2A', '--target', scratchDir]);
assert.strictEqual(rOk.status, 0, 'set con argumentos válidos debe salir con 0');

const rFail = spawnSync(process.execPath, [path.join(ROOT, 'tools', 'profile_adapter.js'), 'set', '1Z', '--target', scratchDir]);
assert.strictEqual(rFail.status, 1, 'set con opción inválida debe salir con 1');

const rEmpty = spawnSync(process.execPath, [path.join(ROOT, 'tools', 'profile_adapter.js'), 'set', 'foo', '--target', scratchDir]);
assert.strictEqual(rEmpty.status, 1, 'set con texto sin formato debe salir con 1');
console.log('✓ Códigos de salida deterministas (0 / 1) verificados en CLI');

console.log('\nPASS AX-F-025 — Perfil adaptativo, parseo y persistencia verificados al 100%.\n');
