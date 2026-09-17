'use strict';

const assert = require('assert');
const { crearSandbox } = require('../../tools/test_sandbox.js');
const fs = require('fs');
const path = require('path');
const { compactSessionContext, digestGobernanza } = require('../../tools/context_shield.js');

console.log('=== AX-F-037 Escudo de Contexto, Anclaje de Invariantes y Purgado de Snapshots ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const scratchDir = crearSandbox('test_context_shield');
if (!fs.existsSync(scratchDir)) {
  fs.mkdirSync(scratchDir, { recursive: true });
}

// 1. Digest de Gobernanza sobre ficheros normativos
const { digest, cubiertos } = digestGobernanza(ROOT);
assert.strictEqual(typeof digest, 'string');
assert.strictEqual(digest.length, 64, 'debe ser un hash SHA-256 hexadecimal de 64 caracteres');
assert.strictEqual(cubiertos.length > 0, true, 'debe cubrir los ficheros normativos existentes');
console.log('✓ Digest de gobernanza SHA-256 verificado');

// 2. Compactación de contexto y emisión de ANCHOR.md
const r = compactSessionContext(scratchDir);
assert.strictEqual(r.pass, true);
assert.strictEqual(fs.existsSync(r.anchor), true, 'el archivo ANCHOR.md debe existir');
assert.strictEqual(fs.existsSync(r.file), true, 'el snapshot JSON debe existir');

const anchorText = fs.readFileSync(r.anchor, 'utf8');
assert.strictEqual(anchorText.includes('# Ancla de estado - Axion Protocol'), true);
assert.strictEqual(anchorText.includes('Invariantes P0 que siguen vigentes'), true);
assert.strictEqual(anchorText.includes('PreToolUse: preflight lexico'), true);
console.log('✓ Emisión de ANCHOR.md con invariantes P0 intactos verificada');

// 3. Verificación de estructura del Snapshot
const snapshot = JSON.parse(fs.readFileSync(r.file, 'utf8'));
assert.strictEqual(Array.isArray(snapshot.active_invariants), true);
assert.strictEqual(snapshot.active_invariants.length >= 4, true);
assert.strictEqual(snapshot.governance_status === 'FAIL_CLOSED' || snapshot.governance_status === 'HALTED', true);
console.log('✓ Estructura de Snapshot e invariantes activos verificada');

// 4. Limpieza del directorio de pruebas
fs.rmSync(scratchDir, { recursive: true, force: true });
console.log('✓ Limpieza de snapshots de prueba completada');

console.log('\nPASS AX-F-037 — Context Shield y anclaje de gobernanza verificados al 100%.\n');
