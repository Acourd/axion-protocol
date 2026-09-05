'use strict';

/**
 * AX-F-217: Invariantes del Disyuntor de Auto-Recuperación (M_RES_010)
 *
 * Valida de forma determinista:
 * 1. Estado inicial CLOSED y ejecución normal transparente.
 * 2. Transición determinista a OPEN tras 3 fallos consecutivos en un cluster de causa raíz.
 * 3. Aislamiento estricto de clusters (un fallo en cluster_A no degrada cluster_B).
 * 4. Transición temporal a HALF_OPEN y auto-sanación determinista ante probe exitoso.
 * 5. Emisión de CircuitBreakerReport_v1 sellado con SHA-256.
 * 6. Integración transparente con DriveEngine.executeWithCircuitBreaker().
 */

const assert = require('assert');
const path = require('path');
const SelfHealingCircuitBreaker = require('../../tools/self_healing_circuit_breaker.js');
const DriveEngine = require('../../tools/drive_engine.js');

console.log('=== AX-F-217 Invariantes del Disyuntor de Auto-Recuperación (M_RES_010) ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const breaker = new SelfHealingCircuitBreaker({ projectRoot: ROOT, maxFailures: 3, cooldownMs: 100 });

// Invariante 1: Estado inicial CLOSED y ejecución exitosa
assert.strictEqual(breaker.getState('cluster_auth'), 'CLOSED');
const resOk = breaker.execute('cluster_auth', () => 'TOKEN_VALID');
assert.strictEqual(resOk, 'TOKEN_VALID');
console.log('✓ Invariante 1: Estado inicial CLOSED y paso normal verificado');

// Invariante 2: Transición a OPEN tras 3 fallos consecutivos
for (let i = 1; i <= 3; i++) {
  try {
    breaker.execute('cluster_auth', () => { throw new Error('Fallo transitorio ' + i); });
  } catch (err) {
    assert.ok(err.message.includes('Fallo transitorio'));
  }
}
assert.strictEqual(breaker.getState('cluster_auth'), 'OPEN');

// En estado OPEN, la llamada debe fallar rápido o ejecutar fallback sin ejecutar la función
let probeRun = false;
const fallbackRes = breaker.execute(
  'cluster_auth',
  () => { probeRun = true; return 'SHOULD_NOT_RUN'; },
  () => 'FALLBACK_DEGRADED'
);
assert.strictEqual(probeRun, false, 'La función no debe ejecutarse cuando el circuito está OPEN');
assert.strictEqual(fallbackRes, 'FALLBACK_DEGRADED');
console.log('✓ Invariante 2: Transición determinista a OPEN y fallback fail-fast tras 3 fallos');

// Invariante 3: Aislamiento de clusters
assert.strictEqual(breaker.getState('cluster_database'), 'CLOSED');
const dbRes = breaker.execute('cluster_database', () => 'DB_CONNECTED');
assert.strictEqual(dbRes, 'DB_CONNECTED');
console.log('✓ Invariante 3: Aislamiento de clusters probado (cluster_database permanece CLOSED)');

// Invariante 4: Transición a HALF_OPEN tras cooldown y auto-sanación ante probe exitoso
const sleep = (ms) => {
  const end = Date.now() + ms;
  while (Date.now() < end) {}
};
sleep(120); // Esperar cooldown de 100ms

assert.strictEqual(breaker.getState('cluster_auth'), 'HALF_OPEN');
const recovered = breaker.execute('cluster_auth', () => 'RECOVERED_SUCCESS');
assert.strictEqual(recovered, 'RECOVERED_SUCCESS');
assert.strictEqual(breaker.getState('cluster_auth'), 'CLOSED', 'Probe exitoso debe cerrar el circuito');
console.log('✓ Invariante 4: Auto-recuperación demostrada tras HALF_OPEN con probe exitoso');

// Invariante 5: Emisión de CircuitBreakerReport_v1 sellado con SHA-256
const report = breaker.getReport();
assert.strictEqual(report.reportType, 'CircuitBreakerReport_v1');
assert.ok(report.totalClusters >= 2);
assert.strictEqual(typeof report.reportDigest, 'string');
assert.strictEqual(report.reportDigest.length, 64);
console.log('✓ Invariante 5: CircuitBreakerReport_v1 emitido con firma SHA-256: ' + report.reportDigest.slice(0, 16) + '...');

// Invariante 6: Integración con DriveEngine
const drive = new DriveEngine(ROOT);
assert.strictEqual(typeof drive.executeWithCircuitBreaker, 'function');
const driveResult = drive.executeWithCircuitBreaker('cluster_kernel', () => 'DRIVE_KERNEL_OK');
assert.strictEqual(driveResult, 'DRIVE_KERNEL_OK');
console.log('✓ Invariante 6: Integración nativa con DriveEngine verificada');

console.log('\nPASS: AX-F-217 — Invariantes de SelfHealingCircuitBreaker demostrados al 100%.');
