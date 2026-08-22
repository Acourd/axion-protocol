const assert = require('assert');
const path = require('path');
const fs = require('fs');
const { runPreflight } = require('../tools/preflight.js');
const { hashString, createEvidenceManifest } = require('../tools/evidence_hasher.js');

console.log('=== Pruebas de Herramientas de Axion Protocol (ZetProG Migrated Safe Tools) ===\n');

// Pruebas para preflight.js
console.log('--- Pruebas de preflight.js ---');

const passTest1 = runPreflight('git commit -m "Update docs"');
assert.strictEqual(passTest1.status, 'PASS', 'Comando git limpio debe pasar preflight');
console.log('✓ Comando git limpio pasó correctamente (PASS)');

const passTest2 = runPreflight('node scripts/test.js --option "value"');
assert.strictEqual(passTest2.status, 'PASS', 'Comando con comillas dobles balanceadas debe pasar');
console.log('✓ Comando con comillas balanceadas pasó correctamente (PASS)');

const failTest1 = runPreflight('git commit -m "Unclosed quotes');
assert.strictEqual(failTest1.status, 'STOP', 'Comillas desbalanceadas deben ser bloqueadas');
console.log('✓ Comillas desbalanceadas bloqueadas correctamente (STOP)');

const failTest2 = runPreflight('rm -rf /');
assert.strictEqual(failTest2.status, 'STOP', 'Comando destructivo rm -rf / debe ser bloqueado');
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
