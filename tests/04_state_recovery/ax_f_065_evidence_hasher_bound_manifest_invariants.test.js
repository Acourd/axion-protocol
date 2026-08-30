'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const {
  hashFile,
  hashString,
  createEvidenceManifest,
  createBoundEvidenceManifest
} = require('../../tools/evidence_hasher.js');
const { hashCanonical } = require('../../tools/canonical_json.js');

console.log('=== AX-F-065 Invariantes Criptográficos de Manifiestos de Evidencia Vinculada ===\n');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'axion-evidence-test-'));

try {
  // 1. Invocación limpia con opciones vacías o por defecto
  const mDefault = createEvidenceManifest();
  assert.strictEqual(mDefault.version, '0.2.0');
  assert.strictEqual(mDefault.status, 'COMPLETE');
  assert.strictEqual(mDefault.evidence.files.length, 0);
  assert.strictEqual(typeof mDefault.hash, 'string');
  assert.strictEqual(mDefault.hash.length, 64);
  console.log('✓ Invocación por defecto sin argumentos verificada');

  // 2. Matriz de clasificación de archivos (PRESENT, MISSING, NOT_A_FILE)
  const fileOk = path.join(tempDir, 'valid_file.txt');
  fs.writeFileSync(fileOk, 'Contenido verificado de prueba', 'utf8');
  const subDir = path.join(tempDir, 'directorio_prueba');
  fs.mkdirSync(subDir, { recursive: true });
  const missingFile = path.join(tempDir, 'archivo_inexistente.txt');

  const mFiles = createEvidenceManifest({
    files: [fileOk, fileOk, subDir, missingFile],
    logs: ['Log de prueba número 1', 'Log de prueba número 2']
  });

  // Deduplicación: fileOk aparece dos veces en input pero solo 1 vez en manifest
  assert.strictEqual(mFiles.evidence.files.length, 3);
  assert.strictEqual(mFiles.status, 'INCOMPLETE');
  assert.strictEqual(mFiles.evidence.complete, false);

  const okEntry = mFiles.evidence.files.find((f) => f.path.endsWith('valid_file.txt'));
  assert.strictEqual(okEntry.status, 'PRESENT');
  assert.strictEqual(okEntry.sha256, hashString('Contenido verificado de prueba'));

  const dirEntry = mFiles.evidence.files.find((f) => f.path.endsWith('directorio_prueba'));
  assert.strictEqual(dirEntry.status, 'NOT_A_FILE');
  assert.strictEqual(dirEntry.sha256, null);

  const missEntry = mFiles.evidence.files.find((f) => f.path.endsWith('archivo_inexistente.txt'));
  assert.strictEqual(missEntry.status, 'MISSING');
  assert.strictEqual(missEntry.sha256, null);

  assert.strictEqual(mFiles.evidence.logs.length, 2);
  assert.strictEqual(mFiles.evidence.logs[0].log_index, 1);
  console.log('✓ Matriz de estados de archivos, deduplicación y logs verificada');

  // 3. Validación de manifiesto vinculado (createBoundEvidenceManifest)
  const validHex64 = 'a'.repeat(64);
  const baseBinding = {
    missionId: 'AX-MISSION-9900',
    risk: 'LOW',
    status: 'PASS',
    command: { executable: 'node', args: ['-v'] },
    scope: ['src/'],
    approval: { digest: validHex64 },
    rollback: { digest: validHex64 },
    check: { digest: validHex64 },
    evidence: { digest: validHex64 }
  };

  const mBound = createBoundEvidenceManifest({
    taskId: 'TASK-BOUND-01',
    files: [fileOk],
    binding: baseBinding
  });

  assert.strictEqual(Object.isFrozen(mBound), true);
  assert.strictEqual(mBound.status, 'COMPLETE');
  assert.strictEqual(mBound.binding_hash, hashCanonical(baseBinding));
  assert.strictEqual(mBound.hash, hashCanonical(mBound.evidence));
  console.log('✓ Manifiesto de evidencia vinculado e inmutabilidad Object.freeze verificados');

  // 4. Rechazo estricto (TypeError) ante bindings malformados o digests inválidos
  const invalidBindings = [
    null,
    undefined,
    'cadena',
    { ...baseBinding, missionId: '' },
    { ...baseBinding, risk: '   ' },
    { ...baseBinding, command: null },
    { ...baseBinding, scope: 'no-es-array' },
    { ...baseBinding, approval: { digest: 'A'.repeat(64) } }, // mayúscula no permitida
    { ...baseBinding, rollback: { digest: 'a'.repeat(63) } }, // 63 caracteres
    { ...baseBinding, check: { digest: 'g'.repeat(64) } },    // no es hex
    { ...baseBinding, evidence: null }
  ];

  for (const inv of invalidBindings) {
    assert.throws(
      () => createBoundEvidenceManifest({ binding: inv }),
      TypeError,
      'Debe lanzar TypeError ante binding malformado'
    );
  }
  console.log(`✓ Rechazo estricto de ${invalidBindings.length} vectores de bindings malformados verificado`);

} finally {
  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch (_) {}
}

console.log('\nPASS AX-F-065 — Invariantes criptográficos de evidencia demostrados al 100%.\n');
