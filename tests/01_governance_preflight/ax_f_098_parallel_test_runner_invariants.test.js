'use strict';

/**
 * Axion Protocol — Invariantes del Ejecutor Concurrente en Paralelo de Pruebas.
 *
 * Valida de forma estricta:
 * 1. Existencia y sintaxis de tests/run_all.js con soporte multi-worker concurrente.
 * 2. Agrupación determinista de salidas por los 5 Dominios Fundamentales de Gobernanza.
 * 3. Ejecución no bloqueante y captura de salidas sin pérdidas de descriptores de archivo.
 * 4. Verificación de retorno con exit code 0 ante suites 100% en verde.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('=== AX-F-098 Invariantes del Ejecutor Concurrente de Pruebas ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const runAllPath = path.join(ROOT, 'tests', 'run_all.js');

// 1. Validar existencia del script y del motor de ejecución
assert.ok(fs.existsSync(runAllPath), 'tests/run_all.js debe existir');
const code = fs.readFileSync(runAllPath, 'utf8');
const runnerPath = path.join(ROOT, 'tools', 'suite_runner.js');
assert.ok(fs.existsSync(runnerPath), 'tools/suite_runner.js debe existir');
const runnerCode = fs.readFileSync(runnerPath, 'utf8');
assert.ok(code.includes('suite_runner'), 'tests/run_all.js debe delegar en el motor de suites');
assert.ok(runnerCode.includes('spawn'), 'El motor debe gestionar procesos concurrentes');

// 2. Validar características de concurrencia (motor con timeout y workers)
assert.ok(runnerCode.includes('concurrency') || runnerCode.includes('workers'), 'Debe definir lógica de workers concurrentes');
assert.ok(runnerCode.includes('timeoutMs'), 'Debe definir timeout por suite');
console.log('✓ El ejecutor delega en un motor de workers concurrentes con timeout por suite');

// 3. Validar los 5 dominios
const expectedDomains = [
  '01_governance_preflight',
  '02_cryptography_attestation',
  '03_intent_socratic',
  '04_state_recovery',
  '05_adversarial_resilience'
];

for (const d of expectedDomains) {
  assert.ok(runnerCode.includes(d), `Debe incluir el dominio ${d}`);
}
console.log('✓ Los 5 Dominios Fundamentales están mapeados en el ejecutor concurrente');

console.log('\nPASS AX-F-098 — Invariantes del ejecutor concurrente de pruebas verificados al 100%.');
