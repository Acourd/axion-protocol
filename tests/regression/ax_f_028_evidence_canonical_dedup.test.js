'use strict';

const assert = require('assert');
const path = require('path');
const { spawnSync } = require('child_process');
const { createEvidenceManifest, hashFile, hashString } = require('../../tools/evidence_hasher.js');

console.log('=== AX-F-028 Deduplicación Canónica de Archivos y Hasheo Determinista (SHA-256) ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const readmePath = path.join(ROOT, 'README.md');
const relativeReadme = 'README.md';
const redundantReadme = './README.md';

// 1. Hasheo determinista de cadenas y archivos
const hStr = hashString('test-string');
assert.strictEqual(/^[a-f0-9]{64}$/.test(hStr), true, 'el hash de cadena debe ser un hex sha256 de 64 caracteres en minúscula');

const hFile = hashFile(readmePath);
assert.strictEqual(/^[a-f0-9]{64}$/.test(hFile), true, 'el hash de archivo debe ser un hex sha256 de 64 caracteres en minúscula');
console.log('✓ Hashes SHA-256 en minúscula verificados');

// 2. Deduplicación canónica de rutas redundantes
const manifest = createEvidenceManifest({
  taskId: 'AX-TASK-DEDUP-001',
  subject: 'Test de deduplicación de rutas',
  files: [relativeReadme, redundantReadme, readmePath]
});

assert.strictEqual(manifest.evidence.files.length, 1, 'rutas equivalentes deben colapsar en una sola entrada canónica');
assert.strictEqual(manifest.evidence.files[0].status, 'PRESENT');
assert.strictEqual(manifest.evidence.complete, true);
console.log('✓ Deduplicación canónica de rutas equivalentes verificada');

// 3. Invocación de CLI con exit code 0
const rCli = spawnSync(process.execPath, [path.join(ROOT, 'tools', 'evidence_hasher.js'), 'README.md']);
assert.strictEqual(rCli.status, 0, 'CLI de evidence_hasher debe salir con 0');
const parsed = JSON.parse(rCli.stdout.toString('utf8'));
assert.strictEqual(parsed.evidence_type, 'MANIFEST');
console.log('✓ Invocación de CLI y salida JSON verificada');

console.log('\nPASS AX-F-028 — Deduplicación canónica de evidencia y SHA-256 verificados al 100%.\n');
