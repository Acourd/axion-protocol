'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { runInstallation } = require('../../install.js');
const { runUpdate } = require('../../tools/updater.js');

console.log('=== AX-F-043 Preservación de Claves Criptográficas, Políticas y Checkpoints en Updater ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const scratchDir = path.join(ROOT, 'scratch', 'test_updater_crypto_target');

if (fs.existsSync(scratchDir)) {
  fs.rmSync(scratchDir, { recursive: true, force: true });
}
fs.mkdirSync(scratchDir, { recursive: true });

// 1. Instalar versión base
const rInit = runInstallation(scratchDir);
assert.strictEqual(rInit.status, 'SUCCESS');

// 2. Crear claves criptográficas, políticas personalizadas y puntos de control del usuario
const keysDir = path.join(scratchDir, '.axion', 'keys');
fs.mkdirSync(keysDir, { recursive: true });
const keyFile = path.join(keysDir, 'authority-ed25519.pub');
fs.writeFileSync(keyFile, '-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEA999\n-----END PUBLIC KEY-----', 'utf8');

const customPolicy = path.join(scratchDir, 'policies', 'custom_security_rule.yaml');
fs.writeFileSync(customPolicy, 'version: "1.0"\ncustom_enforcement: strict\n', 'utf8');

const checkpointsDir = path.join(scratchDir, '.axion', 'checkpoints', '2026-08-24__custom');
fs.mkdirSync(checkpointsDir, { recursive: true });
fs.writeFileSync(path.join(checkpointsDir, 'manifest.json'), JSON.stringify({ custom_checkpoint: true }), 'utf8');

// 3. Ejecutar runUpdate
const rUp = runUpdate(scratchDir);
assert.strictEqual(rUp.status, 'SUCCESS');

// 4. Comprobar que los artefactos del usuario no sufrieron alteración
assert.strictEqual(fs.existsSync(keyFile), true, 'las claves criptográficas deben preservarse');
assert.strictEqual(fs.readFileSync(keyFile, 'utf8').includes('MCowBQYDK2VwAyEA999'), true);

assert.strictEqual(fs.existsSync(customPolicy), true, 'las políticas personalizadas no deben borrarse');
assert.strictEqual(fs.readFileSync(customPolicy, 'utf8').includes('custom_enforcement: strict'), true);

assert.strictEqual(fs.existsSync(path.join(checkpointsDir, 'manifest.json')), true, 'los checkpoints deben persistir');
console.log('✓ Claves criptográficas, políticas personalizadas y checkpoints preservados al 100%');

// Limpieza
fs.rmSync(scratchDir, { recursive: true, force: true });
console.log('✓ Limpieza de entorno de pruebas completada');

console.log('\nPASS AX-F-043 — Preservación de seguridad y activos de usuario en updater verificada.\n');
