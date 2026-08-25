'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { runInstallation } = require('../../install.js');
const { runUpdate } = require('../../tools/updater.js');

console.log('=== AX-F-026 Preservación de Estado y Perfil en Actualizaciones (Updater) ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const scratchDir = path.join(ROOT, 'scratch', 'test_updater_target');

// Limpieza previa
if (fs.existsSync(scratchDir)) {
  fs.rmSync(scratchDir, { recursive: true, force: true });
}
fs.mkdirSync(scratchDir, { recursive: true });

// 1. Instalar versión inicial
const rInit = runInstallation(scratchDir);
assert.strictEqual(rInit.status, 'SUCCESS', 'instalación inicial debe ser SUCCESS');

// 2. Personalizar PROFILE.json y crear memoria de prueba
fs.mkdirSync(path.join(scratchDir, '.axion'), { recursive: true });
const profilePath = path.join(scratchDir, '.axion', 'PROFILE.json');
const customProfile = { technical_depth: 'BUILDER', input_mode: 'KEYBOARD_CONCISE', custom_user_flag: 42 };
fs.writeFileSync(profilePath, JSON.stringify(customProfile, null, 2), 'utf8');

const memDir = path.join(scratchDir, '.axion', 'memory');
fs.mkdirSync(memDir, { recursive: true });
const customNote = path.join(memDir, 'custom-note.md');
fs.writeFileSync(customNote, '# Mi nota personalizada', 'utf8');

// 3. Ejecutar runUpdate
const rUp = runUpdate(scratchDir);
assert.strictEqual(rUp.status, 'SUCCESS', 'actualizador debe retornar SUCCESS');

// 4. Verificar que PROFILE.json y notas de memoria siguen intactos
const profilePost = JSON.parse(fs.readFileSync(profilePath, 'utf8'));
assert.strictEqual(profilePost.custom_user_flag, 42, 'debe preservar campos personalizados del perfil');
assert.strictEqual(profilePost.technical_depth, 'BUILDER');

assert.strictEqual(fs.existsSync(customNote), true, 'debe preservar notas de memoria existentes');
assert.strictEqual(fs.readFileSync(customNote, 'utf8'), '# Mi nota personalizada');
console.log('✓ Perfil de usuario y memoria preservados intactos tras actualización');

// 5. Invocación de CLI
const rCli = spawnSync(process.execPath, [path.join(ROOT, 'tools', 'updater.js'), '--target', scratchDir]);
assert.strictEqual(rCli.status, 0, 'updater CLI debe salir con 0 en éxito');
console.log('✓ Invocación de updater vía CLI con código de salida 0 verificada');

console.log('\nPASS AX-F-026 — Actualizaciones no destructivas y preservación de estado verificadas al 100%.\n');
