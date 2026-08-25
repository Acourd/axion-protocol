'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  hashFile,
  hashString,
  createEvidenceManifest,
  createBoundEvidenceManifest
} = require('../../tools/evidence_hasher.js');

console.log('=== AX-F-041 Enlace Criptográfico de Manifiesto de Evidencias (tools/evidence_hasher.js) ===\n');

const ROOT = path.resolve(__dirname, '..', '..');

// 1. Hashes deterministas de cadena y archivo en minúscula hexadecimal
const hStr = hashString('test content');
assert.strictEqual(typeof hStr, 'string');
assert.strictEqual(/^[a-f0-9]{64}$/.test(hStr), true);
assert.strictEqual(hStr, hStr.toLowerCase(), 'los hashes deben estar en minúscula');

const hFile = hashFile(path.join(ROOT, 'package.json'));
assert.notStrictEqual(hFile, null);
assert.strictEqual(/^[a-f0-9]{64}$/.test(hFile), true);
console.log('✓ Emisión de hashes SHA-256 en formato canónico minúscula verificada');

// 2. Creación de manifiesto estándar con deduplicación y estado de presencia
const manifest = createEvidenceManifest({
  taskId: 'AX-TASK-041',
  subject: 'Test Manifiesto',
  files: [
    path.join(ROOT, 'package.json'),
    path.join(ROOT, 'package.json'), // duplicado
    path.join(ROOT, 'fichero_inexistente_123.tmp') // ausente
  ],
  logs: ['Paso 1 completado', 'Paso 2 completado']
});

assert.strictEqual(manifest.evidence.files.length, 2, 'debe deduplicar rutas idénticas');
assert.strictEqual(manifest.evidence.files[0].status, 'PRESENT');
assert.strictEqual(manifest.evidence.files[1].status, 'MISSING');
assert.strictEqual(manifest.status, 'INCOMPLETE');
assert.strictEqual(manifest.evidence.complete, false);
console.log('✓ Deduplicación y reporte honesto de completitud verificados');

// 3. Enlace estricto de misión en createBoundEvidenceManifest
const digestDummy = 'a'.repeat(64);
const bindingValido = {
  missionId: 'MISSION-999',
  risk: 'HIGH',
  status: 'PENDING',
  command: { executable: 'node', args: ['index.js'] },
  scope: ['src/'],
  approval: { digest: digestDummy },
  rollback: { digest: digestDummy },
  check: { digest: digestDummy },
  evidence: { digest: digestDummy }
};

const boundManifest = createBoundEvidenceManifest({
  taskId: 'AX-TASK-BOUND',
  files: [path.join(ROOT, 'package.json')],
  binding: bindingValido
});

assert.strictEqual(typeof boundManifest.binding_hash, 'string');
assert.strictEqual(boundManifest.binding_hash.length, 64);
assert.strictEqual(boundManifest.evidence.binding.missionId, 'MISSION-999');
console.log('✓ Enlace criptográfico de misión y sellado de digest verificados');

// 4. Rechazo fail-closed ante binding incompleto
assert.throws(() => {
  createBoundEvidenceManifest({
    taskId: 'AX-TASK-FAIL',
    files: [],
    binding: { missionId: 'INCOMPLETO' } // Faltan campos requeridos
  });
}, /El binding de evidencia es incompleto o inválido/);
console.log('✓ Rechazo fail-closed de bindings incompletos verificado');

console.log('\nPASS AX-F-041 — Manifiesto de evidencias y enlace criptográfico verificados al 100%.\n');
