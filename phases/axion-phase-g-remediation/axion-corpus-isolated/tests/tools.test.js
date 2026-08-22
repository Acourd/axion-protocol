const assert = require('assert');
const path = require('path');
const fs = require('fs');
const { runPreflight } = require('../tools/preflight.js');
const { hashString, createEvidenceManifest } = require('../tools/evidence_hasher.js');

console.log('=== Pruebas de Herramientas de Axion Protocol (ZetProG Migrated Safe Tools) ===\n');

// Pruebas para preflight.js
console.log('--- Pruebas de preflight.js ---');

const passTest1 = runPreflight({ executable: 'git', args: ['status'], cwd: __dirname, shell: false });
assert.strictEqual(passTest1.status, 'ALLOW', 'Comando git estructurado y de solo lectura debe permitirse');
console.log('✓ Comando git limpio pasó correctamente (PASS)');

const passTest2 = runPreflight({ executable: 'node', args: ['--version'], cwd: __dirname, shell: false });
assert.strictEqual(passTest2.status, 'ALLOW', 'Comando Node estructurado permitido debe pasar');
console.log('✓ Comando con comillas balanceadas pasó correctamente (PASS)');

const failTest1 = runPreflight('git commit -m "Unclosed quotes');
assert.strictEqual(failTest1.status, 'NEEDS_HUMAN_REVIEW', 'Shell crudo ambiguo requiere revisiÃ³n');
console.log('✓ Comillas desbalanceadas bloqueadas correctamente (STOP)');

const failTest2 = runPreflight('rm -rf /');
assert.strictEqual(failTest2.status, 'DENY', 'Comando destructivo rm -rf / debe ser bloqueado');
console.log('✓ Comando destructivo bloqueado correctamente (STOP)');

// Pruebas para evidence_hasher.js
console.log('\n--- Pruebas de evidence_hasher.js ---');

const testString = 'Axion Protocol Evidence Verification';
const hash = hashString(testString);
assert.strictEqual(typeof hash, 'string');
assert.strictEqual(hash.length, 64); // SHA-256 hex tiene 64 caracteres
console.log('✓ Generación de SHA-256 para string válida (64 caracteres hex)');

const manifest = createEvidenceManifest({
  taskId: 'AX-TASK-TEST',
  subject: 'Test de evidencia',
  files: [path.join(__dirname, '..', 'README.md')],
  logs: ['Log output 1', 'Log output 2']
});

assert.strictEqual(manifest.evidence.files.length, 1);
assert.strictEqual(manifest.evidence.logs.length, 2);
assert.strictEqual(manifest.evidence.files[0].sha256.length, 64);
assert.strictEqual(manifest.evidence.complete, true);
assert.strictEqual(manifest.approval.state, 'WAITING', 'el generador no puede autoaprobar su propia evidencia');
console.log('✓ Manifiesto de evidencia de archivo y logs generado con éxito');

console.log('\n=== TODAS LAS PRUEBAS PASARON EXITOSAMENTE (PASS) ===');
