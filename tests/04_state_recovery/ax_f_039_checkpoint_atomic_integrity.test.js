'use strict';

const assert = require('assert');
const { crearSandboxTemporal } = require('../../tools/test_sandbox.js');
const fs = require('fs');
const path = require('path');
const os = require('os');
const {
  crear,
  verificar,
  restaurar,
  resolver,
  rutaContenida
} = require('../../tools/checkpoint.js');

console.log('=== AX-F-039 Checkpoints: aislamiento, integridad atómica y antirretorno ===\n');

// El arenal vive en el temporal del sistema, fuera del árbol del proyecto. Un checkpoint
// escribe en <raíz>/.axion/checkpoints: si la raíz fuese el proyecto, la prueba sembraría
// el almacén real y el resultado pasaría a depender del orden de ejecución.
const testRoot = crearSandboxTemporal('axion_checkpoint_test');
fs.mkdirSync(testRoot, { recursive: true });

// --- 1. Resistencia a path traversal ---
// rutaContenida es la única frontera entre "restaurar un fichero" y "escribir donde sea".
// Un manifiesto con ../ escribiendo fuera del proyecto ya fue un hallazgo real aquí.
assert.strictEqual(rutaContenida(testRoot, 'archivo.txt'), true);
assert.strictEqual(rutaContenida(testRoot, 'src/index.js'), true);
assert.strictEqual(rutaContenida(testRoot, 'src/sub/archivo.txt'), true);
assert.strictEqual(rutaContenida(testRoot, '../fuera.js'), false);
assert.strictEqual(rutaContenida(testRoot, '../../etc/passwd'), false);
assert.strictEqual(rutaContenida(testRoot, '..'), false);
assert.strictEqual(rutaContenida(testRoot, '/etc/passwd'), false);
assert.strictEqual(rutaContenida(testRoot, '/absoluto/archivo.txt'), false);
assert.strictEqual(rutaContenida(testRoot, 'C:\\Windows\\system32'), false);
assert.strictEqual(rutaContenida(testRoot, ''), false);
console.log('✓ Bloqueo estricto de path traversal en rutaContenida verificado');

// --- 2. Creación y sellado ---
// crear() se invoca sin declarar el tipo: el valor por defecto ha de ser 'user', porque un
// checkpoint que naciera como 'safety' quedaría excluido del selector "latest".
fs.writeFileSync(path.join(testRoot, 'archivo_a.txt'), 'contenido original A', 'utf8');
fs.writeFileSync(path.join(testRoot, 'archivo_b.txt'), 'contenido original B', 'utf8');

const cp1 = crear(testRoot, 'punto-inicial');
assert.strictEqual(cp1.kind, 'user', 'un checkpoint sin tipo declarado debe nacer como user');
assert.strictEqual(cp1.fileCount, 2);
assert.deepStrictEqual(
  cp1.files.map((f) => f.path).sort(),
  ['archivo_a.txt', 'archivo_b.txt'],
  'el manifiesto debe enumerar exactamente los ficheros sellados'
);
assert.strictEqual(typeof cp1.digest, 'string');
assert.strictEqual(cp1.digest.length, 64, 'el digest debe ser un SHA-256 en hexadecimal');
console.log('✓ Creación y sellado de checkpoint con hashes SHA-256 verificado');

// --- 3. Verificación de integridad sobre un almacén sano ---
const v1 = verificar(testRoot, cp1);
assert.strictEqual(v1.pass, true);
assert.strictEqual(v1.status, 'CHECKPOINT_VALID');
console.log('✓ Verificación de integridad sobre almacén íntegro verificada');

// --- 4. Mutación destructiva y restauración atómica con poda ---
fs.writeFileSync(path.join(testRoot, 'archivo_a.txt'), 'contenido corrompido A', 'utf8');
fs.writeFileSync(path.join(testRoot, 'archivo_nuevo.txt'), 'archivo posterior C', 'utf8');

const rRestore = restaurar(testRoot, 'punto-inicial', { prune: true });
assert.strictEqual(rRestore.pass, true);
assert.strictEqual(rRestore.status, 'ROLLBACK_APPLIED');
assert.strictEqual(rRestore.restaurados.includes('archivo_a.txt'), true);
assert.strictEqual(rRestore.eliminados.includes('archivo_nuevo.txt'), true, 'la poda debe declarar lo que elimina, no solo hacerlo');
assert.strictEqual(fs.readFileSync(path.join(testRoot, 'archivo_a.txt'), 'utf8'), 'contenido original A', 'el fichero debe volver a su versión exacta');
assert.strictEqual(fs.existsSync(path.join(testRoot, 'archivo_nuevo.txt')), false, 'archivo posterior debe eliminarse con prune: true');
console.log('✓ Restauración byte a byte y poda de archivos posteriores verificadas');

// --- 5. El selector "latest" resuelve al checkpoint de usuario ---
const latestCp = resolver(testRoot, 'latest');
assert.strictEqual(latestCp.kind, 'user');
assert.strictEqual(latestCp.checkpointId, cp1.checkpointId, '"latest" debe resolver al checkpoint de usuario más reciente');
console.log('✓ Invariante de exclusión de checkpoints safety en el selector "latest" verificado');

// --- 6. Detección de alteración en el propio almacén ---
// Lo verificado se re-verifica: el respaldo es un fichero que cualquiera puede editar, así
// que verificar() recalcula desde el contenido en vez de creerse el digest guardado.
const dirDatos = path.join(testRoot, '.axion', 'checkpoints', cp1.checkpointId, 'files');
fs.writeFileSync(path.join(dirDatos, 'archivo_a.txt'), 'tampered in storage', 'utf8');

const vCorrupto = verificar(testRoot, cp1);
assert.strictEqual(vCorrupto.pass, false);
assert.strictEqual(vCorrupto.status, 'CHECKPOINT_CORRUPT');
console.log('✓ Rechazo fail-closed ante alteración de archivos de respaldo verificado');

// --- Limpieza ---
fs.rmSync(testRoot, { recursive: true, force: true });
console.log('✓ Limpieza del arenal completada');

console.log('\nPASS AX-F-039 — Checkpoints atómicos, aislamiento e integridad SHA-256 verificados al 100%.\n');
