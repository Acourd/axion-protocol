'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const {
  crear,
  verificar,
  restaurar,
  resolver,
  listar,
  rutaContenida,
  MAX_CHECKPOINTS
} = require('../../tools/checkpoint.js');

console.log('=== AX-F-068 Invariantes Adversariales del Motor de Checkpoints y Reversión Atómica ===\n');

const testRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'axion-checkpoint-sandbox-test-'));

try {
  // 1. Resistencia adversarial de rutaContenida contra inyecciones y escapes
  const attackVectors = [
    '../fuera.js',
    '../../etc/shadow',
    '../../../Windows/System32/cmd.exe',
    '/etc/passwd',
    'C:\\boot.ini',
    'D:/virus.exe',
    '',
    '   ',
    null,
    undefined,
    123
  ];

  for (const vec of attackVectors) {
    assert.strictEqual(rutaContenida(testRoot, vec), false, `Debe bloquear ruta maliciosa: ${vec}`);
  }
  assert.strictEqual(rutaContenida(testRoot, 'archivo_seguro.txt'), true);
  assert.strictEqual(rutaContenida(testRoot, 'src/sub/app.js'), true);
  console.log(`✓ Bloqueo estricto de ${attackVectors.length} vectores de escape de sandbox en rutaContenida verificado`);

  // 2. Creación y sellado de estado inicial
  fs.writeFileSync(path.join(testRoot, 'file_1.txt'), 'version 1', 'utf8');
  fs.writeFileSync(path.join(testRoot, 'file_2.txt'), 'version 1', 'utf8');

  const cpOriginal = crear(testRoot, 'baseline-v1');
  assert.strictEqual(cpOriginal.kind, 'user');
  assert.strictEqual(cpOriginal.fileCount, 2);

  // 3. Matriz de rechazo fail-closed de verificar()
  // 3a. CHECKPOINT_MISSING
  assert.strictEqual(verificar(testRoot, null).status, 'CHECKPOINT_MISSING');
  assert.strictEqual(verificar(testRoot, { corrupto: true }).status, 'CHECKPOINT_MISSING');

  // 3b. CHECKPOINT_CONTRACT_MISMATCH
  assert.strictEqual(
    verificar(testRoot, { ...cpOriginal, contractVersion: '9.9.9' }).status,
    'CHECKPOINT_CONTRACT_MISMATCH'
  );

  // 3c. CHECKPOINT_DIGEST_MISMATCH (inyección de fichero no sellado)
  const cpTamperedFiles = {
    ...cpOriginal,
    files: [...cpOriginal.files, { path: 'injected.txt', sha256: 'a'.repeat(64) }]
  };
  assert.strictEqual(verificar(testRoot, cpTamperedFiles).status, 'CHECKPOINT_DIGEST_MISMATCH');

  // 3d. CHECKPOINT_CORRUPT (fichero modificado en el almacén de storage)
  const dirStorageFile = path.join(testRoot, '.axion', 'checkpoints', cpOriginal.checkpointId, 'files', 'file_1.txt');
  fs.writeFileSync(dirStorageFile, 'contenido corrompido externamente', 'utf8');
  const vCorrupt = verificar(testRoot, cpOriginal);
  assert.strictEqual(vCorrupt.pass, false);
  assert.strictEqual(vCorrupt.status, 'CHECKPOINT_CORRUPT');

  // Restaurar el contenido correcto en storage para continuar pruebas
  fs.writeFileSync(dirStorageFile, 'version 1', 'utf8');
  assert.strictEqual(verificar(testRoot, cpOriginal).pass, true);
  console.log('✓ Matriz de 4 estados fail-closed de verificar() demostrada al 100%');

  // 4. Modificación del árbol de trabajo y adición de ficheros posteriores
  fs.writeFileSync(path.join(testRoot, 'file_1.txt'), 'version 2 mutada', 'utf8');
  fs.writeFileSync(path.join(testRoot, 'file_posterior.txt'), 'archivo nuevo post-checkpoint', 'utf8');

  // 5. Restauración con generación automática de Safety Checkpoint y poda (--prune)
  const resRestore = restaurar(testRoot, cpOriginal.checkpointId, { prune: true });
  assert.strictEqual(resRestore.pass, true);
  assert.strictEqual(resRestore.restaurados.includes('file_1.txt'), true);
  assert.strictEqual(resRestore.intactos.includes('file_2.txt'), true);
  assert.strictEqual(resRestore.eliminados.includes('file_posterior.txt'), true);

  // Verificar que file_1 volvió a su versión original y que file_posterior fue podado
  assert.strictEqual(fs.readFileSync(path.join(testRoot, 'file_1.txt'), 'utf8'), 'version 1');
  assert.strictEqual(fs.existsSync(path.join(testRoot, 'file_posterior.txt')), false);

  // Verificar que se creó automáticamente un safety checkpoint para poder deshacer
  const todosCheckpoints = listar(testRoot);
  assert.strictEqual(todosCheckpoints.some((c) => c.kind === 'safety'), true);
  console.log('✓ Restauración atómica con safety snapshot automático y poda (--prune) verificada');

  // 6. Purga independiente de cuotas (MAX_CHECKPOINTS = 10)
  for (let i = 0; i < 14; i++) {
    crear(testRoot, `punto-extra-${i}`);
  }
  const checkpointsUser = listar(testRoot).filter((c) => (c.kind || 'user') === 'user');
  assert.strictEqual(checkpointsUser.length, MAX_CHECKPOINTS, `debe respetar el cupo de ${MAX_CHECKPOINTS} checkpoints user`);
  console.log(`✓ Límite de retención y purga independiente (${MAX_CHECKPOINTS} items) verificado`);

} finally {
  try {
    fs.rmSync(testRoot, { recursive: true, force: true });
  } catch (_) {}
}

console.log('\nPASS AX-F-068 — Invariantes del motor de checkpoints demostrados al 100%.\n');
