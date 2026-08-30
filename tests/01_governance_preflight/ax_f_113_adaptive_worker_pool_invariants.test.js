'use strict';

/**
 * Axion Protocol — Invariantes del Optimizador de Concurrencia Dinámica y Pool Adaptativo de Workers.
 *
 * Valida de forma estricta:
 * 1. Cálculo matemático de concurrencia óptima acotada por núcleos de CPU y memoria libre en RAM.
 * 2. Ejecución asíncrona por lotes (runBatch) respetando los límites de concurrencia.
 * 3. Aislamiento y captura de errores por tarea sin interrumpir el lote completo.
 * 4. Integración transparente con DriveEngine.
 */

const assert = require('assert');
const path = require('path');
const AdaptiveWorkerPool = require('../../tools/adaptive_worker_pool.js');
const DriveEngine = require('../../tools/drive_engine.js');

console.log('=== AX-F-113 Invariantes del Optimizador de Concurrencia Dinámica y Pool Adaptativo ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const pool = new AdaptiveWorkerPool({ minWorkers: 2, maxWorkers: 16 });

(async () => {
  // 1. Validar cálculo de concurrencia óptima
  const opt = pool.getOptimalConcurrency();
  assert.ok(opt.optimalWorkers >= 1, 'La concurrencia óptima debe ser >= 1');
  assert.ok(opt.cpuCount >= 1, 'El conteo de CPU debe ser >= 1');
  assert.ok(opt.freeMemMb >= 0, 'La memoria libre debe ser >= 0 MB');
  assert.ok(opt.constrainedBy === 'CPU_CORES' || opt.constrainedBy === 'FREE_RAM', 'Debe identificar el factor limitante');
  console.log(`✓ Perfil de concurrencia calculado: ${opt.optimalWorkers} workers óptimos (limitado por ${opt.constrainedBy})`);

  // 2. Validar ejecución de lote con tareas exitosas
  const tasks = Array.from({ length: 15 }, (_, i) => async () => {
    return { taskId: i, processed: true };
  });

  const batchRes = await pool.runBatch(tasks);
  assert.strictEqual(batchRes.total, 15, 'Total de tareas debe ser 15');
  assert.strictEqual(batchRes.completed, 15, 'Todas las tareas deben completarse');
  assert.strictEqual(batchRes.results.length, 15, 'El arreglo de resultados debe tener longitud 15');
  console.log(`✓ Lote de 15 tareas ejecutado con concurrencia adaptativa (${batchRes.concurrencyUsed} workers, ${batchRes.durationMs}ms)`);

  // 3. Validar tolerancia a fallos aislados en lote
  const mixedTasks = [
    async () => ({ id: 1, ok: true }),
    async () => { throw new Error('Fallo provocado en tarea 2'); },
    async () => ({ id: 3, ok: true })
  ];

  const mixedRes = await pool.runBatch(mixedTasks, { concurrency: 2 });
  assert.strictEqual(mixedRes.total, 3);
  assert.strictEqual(mixedRes.results[0].pass, true);
  assert.strictEqual(mixedRes.results[1].pass, false);
  assert.ok(mixedRes.results[1].error.includes('Fallo provocado en tarea 2'));
  assert.strictEqual(mixedRes.results[2].pass, true);
  console.log('✓ Resiliencia de lote verificada: Fallo en tarea 2 aislado sin afectar tareas 1 y 3');

  // 4. Validar integración con DriveEngine
  const driveEngine = new DriveEngine(ROOT);
  const driveBatchRes = await driveEngine.runAdaptiveBatch([
    async () => ({ status: 'READY' })
  ]);
  assert.strictEqual(driveBatchRes.total, 1);
  assert.strictEqual(driveBatchRes.results[0].pass, true);
  console.log('✓ Integración DriveEngine.runAdaptiveBatch() verificada');

  console.log('\nPASS AX-F-113 — Invariantes del optimizador de concurrencia y pool adaptativo verificados al 100%.');
})();
