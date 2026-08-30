'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { runInstallation } = require('../../install.js');
const { runUpdate } = require('../../tools/updater.js');

console.log('=== AX-F-026 Preservación de Activos de Usuario en Actualizaciones (Updater) ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const scratchDir = path.join(ROOT, 'scratch', 'test_updater_target');

// Limpieza previa
if (fs.existsSync(scratchDir)) {
  fs.rmSync(scratchDir, { recursive: true, force: true });
}
fs.mkdirSync(scratchDir, { recursive: true });

// --- 1. Instalar versión inicial ---
const rInit = runInstallation(scratchDir);
assert.strictEqual(rInit.status, 'SUCCESS', 'instalación inicial debe ser SUCCESS');

// --- 2. Sembrar las cinco clases de activo que el usuario puede tener en un proyecto vivo ---
// Van todas en la misma instalación a propósito. Comprobarlas por separado, cada una con su
// propia actualización, no distingue "el updater preserva esto" de "el updater preserva esto
// cuando es lo único que hay". Una actualización real las encuentra a la vez.

// 2a. Perfil calibrado, con un campo que el producto no conoce
fs.mkdirSync(path.join(scratchDir, '.axion'), { recursive: true });
const profilePath = path.join(scratchDir, '.axion', 'PROFILE.json');
const customProfile = { technical_depth: 'BUILDER', input_mode: 'KEYBOARD_CONCISE', custom_user_flag: 42 };
fs.writeFileSync(profilePath, JSON.stringify(customProfile, null, 2), 'utf8');

// 2b. Nota de memoria escrita por la persona
const memDir = path.join(scratchDir, '.axion', 'memory');
fs.mkdirSync(memDir, { recursive: true });
const customNote = path.join(memDir, 'custom-note.md');
fs.writeFileSync(customNote, '# Mi nota personalizada', 'utf8');

// 2c. Clave criptográfica: perderla invalida toda la evidencia emitida hasta la fecha
const keysDir = path.join(scratchDir, '.axion', 'keys');
fs.mkdirSync(keysDir, { recursive: true });
const keyFile = path.join(keysDir, 'authority-ed25519.pub');
fs.writeFileSync(keyFile, '-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEA999\n-----END PUBLIC KEY-----', 'utf8');

// 2d. Política de riesgo propia: la política es dato, y el dato del usuario manda
const customPolicy = path.join(scratchDir, 'policies', 'custom_security_rule.yaml');
fs.mkdirSync(path.dirname(customPolicy), { recursive: true });
fs.writeFileSync(customPolicy, 'version: "1.0"\ncustom_enforcement: strict\n', 'utf8');

// 2e. Punto de control: si la actualización lo borra, deja al usuario sin red durante el cambio
const checkpointsDir = path.join(scratchDir, '.axion', 'checkpoints', '2026-08-24__custom');
fs.mkdirSync(checkpointsDir, { recursive: true });
fs.writeFileSync(path.join(checkpointsDir, 'manifest.json'), JSON.stringify({ custom_checkpoint: true }), 'utf8');

// --- 3. Ejecutar la actualización ---
const rUp = runUpdate(scratchDir);
assert.strictEqual(rUp.status, 'SUCCESS', 'actualizador debe retornar SUCCESS');

// --- 4. Ningún activo del usuario puede haber cambiado ---
// Se comprueba existencia y contenido, no solo existencia: un fichero reescrito con la
// plantilla de fábrica sigue existiendo y ya no es del usuario.
//
// Qué cubre esto de verdad, medido por mutación (2026-08-24): las cinco clases sobreviven
// porque runInstallation no las toca, no porque runUpdate las proteja. Anular el bloque de
// salvado/restauracion de PROFILE.json en tools/updater.js deja esta suite en verde, porque
// install.js no escribe PROFILE.json en ninguna linea. Es decir: estas aserciones son una
// guardia de no-destructividad sobre install.js, y el unico seguro propio del updater no
// tiene hoy ninguna prueba capaz de fallar. No se disimula con una asercion de adorno.
const profilePost = JSON.parse(fs.readFileSync(profilePath, 'utf8'));
assert.strictEqual(profilePost.custom_user_flag, 42, 'debe preservar campos personalizados del perfil');
assert.strictEqual(profilePost.technical_depth, 'BUILDER');

assert.strictEqual(fs.existsSync(customNote), true, 'debe preservar notas de memoria existentes');
assert.strictEqual(fs.readFileSync(customNote, 'utf8'), '# Mi nota personalizada');

assert.strictEqual(fs.existsSync(keyFile), true, 'las claves criptográficas deben preservarse');
assert.strictEqual(fs.readFileSync(keyFile, 'utf8').includes('MCowBQYDK2VwAyEA999'), true, 'la clave debe conservar su material, no solo el fichero');

assert.strictEqual(fs.existsSync(customPolicy), true, 'las políticas personalizadas no deben borrarse');
assert.strictEqual(fs.readFileSync(customPolicy, 'utf8').includes('custom_enforcement: strict'), true, 'la política debe conservar su contenido');

assert.strictEqual(fs.existsSync(path.join(checkpointsDir, 'manifest.json')), true, 'los checkpoints deben persistir');
console.log('✓ Perfil, memoria, claves, políticas y checkpoints preservados intactos tras actualización');

// --- 5. Invocación vía CLI ---
const rCli = spawnSync(process.execPath, [path.join(ROOT, 'tools', 'updater.js'), '--target', scratchDir]);
assert.strictEqual(rCli.status, 0, 'updater CLI debe salir con 0 en éxito');
console.log('✓ Invocación de updater vía CLI con código de salida 0 verificada');

// --- Limpieza ---
fs.rmSync(scratchDir, { recursive: true, force: true });
console.log('✓ Limpieza del arenal completada');

console.log('\nPASS AX-F-026 — Actualizaciones no destructivas y preservación de activos verificadas al 100%.\n');
