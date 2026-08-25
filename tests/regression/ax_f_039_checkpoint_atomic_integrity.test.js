'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  crear,
  listar,
  verificar,
  restaurar,
  resolver,
  rutaContenida
} = require('../../tools/checkpoint.js');

console.log('=== AX-F-039 Integridad Atómica, Resistencia a Path Traversal y Verificación de Checkpoints ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const testRoot = path.join(ROOT, 'scratch', 'test_checkpoint_atomic');
if (fs.existsSync(testRoot)) fs.rmSync(testRoot, { recursive: true, force: true });
fs.mkdirSync(testRoot, { recursive: true });

// 1. Resistencia a Path Traversal (rutaContenida)
assert.strictEqual(rutaContenida(testRoot, 'src/index.js'), true);
assert.strictEqual(rutaContenida(testRoot, '../fuera.js'), false);
assert.strictEqual(rutaContenida(testRoot, '..'), false);
assert.strictEqual(rutaContenida(testRoot, '/etc/passwd'), false);
assert.strictEqual(rutaContenida(testRoot, 'C:\\Windows\\system32'), false);
console.log('✓ Protección contra escape de ruta (Path Traversal) verificada');

// 2. Creación de archivos y sellado de checkpoint
fs.writeFileSync(path.join(testRoot, 'archivo_a.txt'), 'contenido original A', 'utf8');
fs.writeFileSync(path.join(testRoot, 'archivo_b.txt'), 'contenido original B', 'utf8');

const cp1 = crear(testRoot, 'punto-inicial', 'user');
assert.strictEqual(cp1.fileCount, 2);
assert.strictEqual(typeof cp1.digest, 'string');
assert.strictEqual(cp1.digest.length, 64);
console.log('✓ Creación y sellado de checkpoint con hashes SHA-256 verificado');

// 3. Verificación de integridad del checkpoint
const v1 = verificar(testRoot, cp1);
assert.strictEqual(v1.pass, true);
assert.strictEqual(v1.status, 'CHECKPOINT_VALID');

// 4. Modificación destructiva y restauración atómica
fs.writeFileSync(path.join(testRoot, 'archivo_a.txt'), 'contenido corrompido A', 'utf8');
fs.writeFileSync(path.join(testRoot, 'archivo_nuevo.txt'), 'archivo posterior C', 'utf8');

const rRestore = restaurar(testRoot, 'punto-inicial', { prune: true });
assert.strictEqual(rRestore.pass, true);
assert.strictEqual(rRestore.restaurados.includes('archivo_a.txt'), true);
assert.strictEqual(fs.readFileSync(path.join(testRoot, 'archivo_a.txt'), 'utf8'), 'contenido original A');
assert.strictEqual(fs.existsSync(path.join(testRoot, 'archivo_nuevo.txt')), false, 'archivo posterior debe eliminarse con prune: true');
console.log('✓ Restauración atómica con verificación y poda de archivos posteriores verificada');

// 5. Detección de corrupción en almacén de checkpoint
const dirDatos = path.join(testRoot, '.axion', 'checkpoints', cp1.checkpointId, 'files');
fs.writeFileSync(path.join(dirDatos, 'archivo_a.txt'), 'tampered in storage', 'utf8');

const vCorrupto = verificar(testRoot, cp1);
assert.strictEqual(vCorrupto.pass, false);
assert.strictEqual(vCorrupto.status, 'CHECKPOINT_CORRUPT');
console.log('✓ Rechazo fail-closed ante alteración de archivos de respaldo verificado');

// Limpieza
fs.rmSync(testRoot, { recursive: true, force: true });
console.log('✓ Limpieza de entorno de pruebas completada');

console.log('\nPASS AX-F-039 — Checkpoints atómicos e integridad SHA-256 verificados al 100%.\n');
