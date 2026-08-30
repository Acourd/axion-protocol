'use strict';

/**
 * Axion Protocol — Invariantes del Cuantificador de Radio de Explosión (Blast Radius Boundary).
 *
 * Valida de forma estricta:
 * 1. Cuantificación matemática de 4 dimensiones ortogonales: Alcance en Disco, Privilegios, Red y Reversibilidad.
 * 2. Comandos inocuos clasificados como CONTAINED (score <= 3.0).
 * 3. Comandos con impacto moderado clasificados como ELEVATED_SUPERVISION (score 4.0 - 6.5).
 * 4. Comandos catastróficos o destructivos clasificados como CRITICAL_INTERCEPTION (score >= 7.0).
 */

const assert = require('assert');
const path = require('path');
const BlastRadiusEstimator = require('../../tools/blast_radius_estimator.js');

console.log('=== AX-F-105 Invariantes del Cuantificador de Radio de Explosión (Blast Radius) ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const estimator = new BlastRadiusEstimator(ROOT);

// 1. Validar manejo seguro de entradas vacías
const emptyEst = estimator.estimate('');
assert.strictEqual(emptyEst.score, 0.0, 'Entrada vacía debe tener score 0.0');
assert.strictEqual(emptyEst.verdict, 'CONTAINED', 'Entrada vacía debe ser CONTAINED');
console.log('✓ Manejo determinista de comandos nulos y vacíos');

// 2. Validar comandos inocuos (CONTAINED)
const containedSamples = [
  'node -v',
  'git status',
  'echo "hello"',
  'node tests/run_all.js'
];

for (const cmd of containedSamples) {
  const res = estimator.estimate(cmd);
  assert.ok(res.score <= 3.5, `Comando inocuo "${cmd}" debe tener score <= 3.5 (obtenido: ${res.score})`);
  assert.strictEqual(res.verdict, 'CONTAINED', `Comando inocuo "${cmd}" debe ser CONTAINED`);
}
console.log(`✓ ${containedSamples.length} comandos inocuos validados como CONTAINED`);

// 3. Validar comandos con impacto moderado (ELEVATED_SUPERVISION)
const elevatedSamples = [
  'rm ./temp.txt',
  'git reset --hard HEAD~1',
  'powershell -enc JABjAG0AZAAgAD0AIAAnAHIAbQAgAC0AcgBmACAAKgAnAA=='
];

for (const cmd of elevatedSamples) {
  const res = estimator.estimate(cmd);
  assert.ok(res.score >= 4.0 && res.score <= 6.5, `Comando moderado "${cmd}" debe tener score 4.0-6.5 (obtenido: ${res.score})`);
  assert.strictEqual(res.verdict, 'ELEVATED_SUPERVISION', `Comando moderado "${cmd}" debe ser ELEVATED_SUPERVISION`);
}
console.log(`✓ ${elevatedSamples.length} comandos moderados validados como ELEVATED_SUPERVISION`);

// 4. Validar comandos catastróficos (CRITICAL_INTERCEPTION)
const criticalSamples = [
  'sudo rm -rf --no-preserve-root /',
  'format c: /fs:ntfs /q /y',
  'dd if=/dev/zero of=/dev/sda bs=1M'
];

for (const cmd of criticalSamples) {
  const res = estimator.estimate(cmd);
  assert.ok(res.score >= 7.0, `Comando catastrófico "${cmd}" debe tener score >= 7.0 (obtenido: ${res.score})`);
  assert.strictEqual(res.verdict, 'CRITICAL_INTERCEPTION', `Comando catastrófico "${cmd}" debe ser CRITICAL_INTERCEPTION`);
}
console.log(`✓ ${criticalSamples.length} comandos catastróficos validados como CRITICAL_INTERCEPTION`);

console.log('\nPASS AX-F-105 — Invariantes del cuantificador de radio de explosión verificados al 100%.');
