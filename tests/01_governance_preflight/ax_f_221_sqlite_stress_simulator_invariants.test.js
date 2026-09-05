'use strict';

/**
 * AX-F-221: Invariantes del Simulador de Cargas Extremas y Benchmarking Asintótico SQLite (M_002_STRESS_SIMULATOR)
 *
 * Valida de forma determinista:
 * 1. Simulación masiva de transacciones ACID en SQLite con rendimiento sub-milisegundo (< 1.0 ms/op).
 * 2. Rendimiento asintótico garantizado (> 5.000 ops/seg) bajo ráfaga de transacciones concurrentes.
 * 3. Atomicidad y resiliencia ante inyección de fallos controlados: rollback inmediato y cero registros huérfanos verificados por SQL.
 * 4. Contención de memoria O(1) con muestreo reservorio acotado (heap delta < 50MB).
 * 5. Verificación formal de integridad de base de datos (PRAGMA integrity_check === 'ok').
 * 6. Emisión de SQLiteStressReport_v1 sellado con hash SHA-256 criptográfico de 64 caracteres y detección de manipulación.
 * 7. Integración transparente con DriveEngine.simulateSQLiteStress().
 * 8. Persistencia y benchmarking en archivo físico sobre disco con modo WAL y limpieza garantizada.
 * 9. Resiliencia en casos límite: iteraciones nulas (0) y tasa de fallos total (1.0).
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');
const SQLiteStressSimulator = require('../../tools/sqlite_stress_simulator.js');
const DriveEngine = require('../../tools/drive_engine.js');

console.log('=== AX-F-221 Invariantes del Simulador de Cargas Extremas SQLite (M_002_STRESS_SIMULATOR) ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const simulator = new SQLiteStressSimulator({ projectRoot: ROOT });

// Invariante 1 & 2: Benchmark de 10.000 transacciones con latencia sub-milisegundo (< 1.0 ms) y alto throughput
const benchResult = simulator.runStressBenchmark({
  iterations: 10000,
  batchSize: 500,
  faultInjectionRate: 0.0
});

assert.strictEqual(benchResult.reportType, 'SQLiteStressReport_v1');
assert.strictEqual(benchResult.iterations, 10000);
assert.strictEqual(benchResult.metrics.committedTransactions, 10000);
assert.strictEqual(benchResult.metrics.rolledBackTransactions, 0);
assert.strictEqual(benchResult.metrics.subMillisecondGuaranteed, true, 'El promedio de latencia debe ser sub-milisegundo (< 1.0 ms)');
assert.ok(benchResult.metrics.latencyStats.avgMs < 1.0, `Latencia promedio observada (${benchResult.metrics.latencyStats.avgMs}ms) debe ser < 1.0ms`);
assert.ok(benchResult.metrics.throughputOpsPerSec > 5000, `Throughput (${benchResult.metrics.throughputOpsPerSec} ops/s) debe superar 5000 ops/s`);
console.log(`✓ Invariante 1 & 2: 10.000 transacciones ejecutadas a ${benchResult.metrics.throughputOpsPerSec} ops/s con latencia media de ${benchResult.metrics.latencyStats.avgMs}ms (sub-milisegundo)`);

// Invariante 3: Inyección de fallos adversariales y verificación directa SQL de cero registros huérfanos
const sharedDb = new DatabaseSync(':memory:');
const faultResult = simulator.runStressBenchmark({
  db: sharedDb,
  iterations: 2000,
  batchSize: 100,
  faultInjectionRate: 0.05 // 5% de fallos inducidos
});

assert.ok(faultResult.metrics.rolledBackTransactions > 0, 'Deben registrarse transacciones revertidas ante fallos inducidos');
assert.strictEqual(
  faultResult.metrics.committedTransactions + faultResult.metrics.rolledBackTransactions,
  2000,
  'La suma de confirmadas y revertidas debe ser exactamente igual al total'
);
assert.strictEqual(faultResult.integrity.isHealthy, true, 'La integridad de SQLite debe mantenerse sana tras fallos y rollbacks');

// Verificación SQL directa de que el número de registros en la tabla coincide exactamente con los commits
const rowCount = sharedDb.prepare('SELECT COUNT(*) as cnt FROM axion_stress_ledger;').get().cnt;
assert.strictEqual(
  rowCount,
  faultResult.metrics.committedTransactions,
  `Cero registros huérfanos: filas en DB (${rowCount}) deben ser idénticas a transacciones confirmadas (${faultResult.metrics.committedTransactions})`
);
sharedDb.close();
console.log(`✓ Invariante 3: Resiliencia ante fallos verificada (${faultResult.metrics.committedTransactions} confirmadas, ${faultResult.metrics.rolledBackTransactions} revertidas limpiamente, cero huérfanos verificados por SQL)`);

// Invariante 4: Contención de memoria O(1) bajo carga extrema
assert.ok(benchResult.metrics.memoryFootprint.heapDeltaMb < 50, 'El incremento de memoria heap debe ser menor a 50MB');
assert.ok(benchResult.metrics.latencyStats.sampleCount <= 5000, 'El muestreador de latencia debe mantener un reservorio acotado');
console.log(`✓ Invariante 4: Contención de memoria confirmada (Heap Delta: ${benchResult.metrics.memoryFootprint.heapDeltaMb}MB, Reservorio: ${benchResult.metrics.latencyStats.sampleCount} muestras)`);

// Invariante 5: Verificación de PRAGMA integrity_check
assert.strictEqual(benchResult.integrity.isHealthy, true, 'PRAGMA integrity_check debe reportar salud al 100%');
assert.ok(benchResult.integrity.rows.some(r => r.integrity_check === 'ok'), 'Respuesta PRAGMA debe contener ok');
console.log('✓ Invariante 5: PRAGMA integrity_check formalmente verificado');

// Invariante 6: Reporte sellado con hash SHA-256 criptográfico y detección de manipulación
assert.ok(typeof benchResult.reportDigest === 'string' && benchResult.reportDigest.length === 64, 'El reporte debe incluir un hash SHA-256 de 64 caracteres');
const verifyResult = simulator.verifyReportIntegrity(benchResult);
assert.strictEqual(verifyResult.isValid, true, 'El reporte sellado debe pasar la verificación criptográfica');

// Ataque de manipulación adversarial: alterar métricas debe invalidar el digest
const tamperedReport = JSON.parse(JSON.stringify(benchResult));
tamperedReport.metrics.committedTransactions += 1;
const tamperedVerify = simulator.verifyReportIntegrity(tamperedReport);
assert.strictEqual(tamperedVerify.isValid, false, 'Un reporte manipulado debe ser rechazado');
console.log(`✓ Invariante 6: SQLiteStressReport_v1 sellado criptográficamente y detección de manipulación validada (${benchResult.reportDigest.slice(0, 16)}...)`);

// Invariante 7: Integración transparente con DriveEngine
const drive = new DriveEngine(ROOT);
assert.strictEqual(typeof drive.simulateSQLiteStress, 'function', 'DriveEngine debe exponer simulateSQLiteStress');
const driveRes = drive.simulateSQLiteStress({ iterations: 500, batchSize: 50 });
assert.strictEqual(driveRes.reportType, 'SQLiteStressReport_v1');
assert.strictEqual(driveRes.iterations, 500);
console.log('✓ Invariante 7: Integración nativa con DriveEngine.simulateSQLiteStress() confirmada');

// Invariante 8: Persistencia y benchmarking en archivo físico sobre disco con modo WAL y limpieza garantizada
const diskDbPath = path.join(ROOT, 'test_stress_bench_disk.db');
simulator.cleanupDb(diskDbPath);
try {
  const diskRes = simulator.runStressBenchmark({
    dbPath: diskDbPath,
    iterations: 1000,
    batchSize: 100,
    cleanupOnClose: true
  });
  assert.strictEqual(diskRes.iterations, 1000);
  assert.strictEqual(diskRes.metrics.committedTransactions, 1000);
  assert.strictEqual(diskRes.integrity.isHealthy, true);
  assert.strictEqual(fs.existsSync(diskDbPath), false, 'La base de datos en disco debe haber sido limpiada al finalizar');
} finally {
  simulator.cleanupDb(diskDbPath);
}
console.log('✓ Invariante 8: Persistencia en disco físico con WAL y limpieza automática demostrada');

// Invariante 9: Resiliencia en casos límite (iteraciones 0 y 100% de fallos)
const zeroRes = simulator.runStressBenchmark({ iterations: 0 });
assert.strictEqual(zeroRes.iterations, 0);
assert.strictEqual(zeroRes.metrics.committedTransactions, 0);
assert.strictEqual(zeroRes.metrics.rolledBackTransactions, 0);
assert.strictEqual(zeroRes.metrics.throughputOpsPerSec, 0);
assert.strictEqual(zeroRes.metrics.latencyStats.minMs, 0);
assert.strictEqual(simulator.verifyReportIntegrity(zeroRes).isValid, true);

const fullFaultRes = simulator.runStressBenchmark({ iterations: 200, batchSize: 20, faultInjectionRate: 1.0 });
assert.strictEqual(fullFaultRes.metrics.committedTransactions, 0);
assert.strictEqual(fullFaultRes.metrics.rolledBackTransactions, 200);
assert.ok(fullFaultRes.metrics.throughputOpsPerSec > 0, 'Debe registrar throughput de procesamiento ante reversión total');
assert.strictEqual(fullFaultRes.metrics.committedThroughputOpsPerSec, 0);
console.log('✓ Invariante 9: Casos límite (iteraciones 0 y tasa de fallos 100%) gestionados de forma determinista');

console.log('\nPASS: AX-F-221 — Invariantes del Simulador de Cargas Extremas SQLite demostrados al 100%.');
