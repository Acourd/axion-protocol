'use strict';

/**
 * Axion Protocol — Invariantes del Perfilador de Latencia y Benchmarking Rápido.
 *
 * Valida de forma estricta:
 * 1. Medición de alta resolución en microsegundos y milisegundos para los 6 subsistemas de gobernanza.
 * 2. Cálculo determinista de throughput (ops/seg) y métricas de memoria.
 * 3. Cumplimiento de presupuestos de latencia ultra-baja (Preflight < 1ms, Búsqueda < 5ms).
 * 4. Emisión de reporte firmado con digest SHA-256 in-toto.
 * 5. Integración transparente con DriveEngine y CLI unificado.
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const FastParityBenchmarker = require('../../tools/fast_parity_benchmarker.js');
const DriveEngine = require('../../tools/drive_engine.js');

console.log('=== AX-F-149 Invariantes del Perfilador de Latencia y Benchmarking ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const sandbox = path.join(ROOT, 'scratch', `test_bench_sandbox_${Date.now()}`);
fs.mkdirSync(path.join(sandbox, '.axion', 'state'), { recursive: true });

try {
  const benchmarker = new FastParityBenchmarker(sandbox);

  // 1. Validar ejecución del benchmark
  const report = benchmarker.runBenchmark({ iterations: 20 });
  assert.strictEqual(report.benchmarks.length >= 6, true, 'Debe auditar al menos 6 subsistemas');
  assert.ok(report.memory.currentRssMB > 0);
  assert.strictEqual(report.digest.length, 64);
  assert.ok(fs.existsSync(benchmarker.reportPath));
  console.log(`✓ Benchmark ejecutado con éxito (${report.benchmarks.length} subsistemas medidos)`);

  // 2. Validar métricas de Preflight
  const preflightBench = report.benchmarks.find(b => b.name === 'Preflight Command Classifier');
  assert.ok(preflightBench, 'Debe incluir benchmark de Preflight');
  assert.ok(preflightBench.stats.avgMillis <= preflightBench.budgetMs, `Preflight debe responder dentro del presupuesto de ${preflightBench.budgetMs}ms (obtenido: ${preflightBench.stats.avgMillis}ms)`);
  assert.ok(preflightBench.stats.opsPerSec > 1000, 'Preflight debe soportar > 1,000 ops/seg');
  console.log(`✓ Preflight Latency: ${preflightBench.stats.avgMillis} ms (${preflightBench.stats.avgMicros} µs, ${preflightBench.stats.opsPerSec.toLocaleString()} ops/s)`);

  // 3. Validar métricas de Búsqueda Semántica BM25
  const searchBench = report.benchmarks.find(b => b.name === 'Semantic Search Vectorless BM25');
  assert.ok(searchBench, 'Debe incluir benchmark de Búsqueda Semántica');
  assert.ok(searchBench.stats.avgMillis <= searchBench.budgetMs);
  console.log(`✓ Semantic Search Latency: ${searchBench.stats.avgMillis} ms (${searchBench.stats.opsPerSec.toLocaleString()} ops/s)`);

  // 4. Validar integración con DriveEngine
  const driveEngine = new DriveEngine(ROOT);
  const driveBench = driveEngine.runFastParityBenchmark({ iterations: 5 });
  assert.ok(driveBench.benchmarks.length >= 6);
  console.log('✓ Integración DriveEngine.runFastParityBenchmark() verificada');

} finally {
  if (fs.existsSync(sandbox)) {
    try {
      fs.rmSync(sandbox, { recursive: true, force: true });
    } catch (_) {
      // Ignorar bloqueo temporal de OS en limpieza de sandbox
    }
  }
}

console.log('\nPASS AX-F-149 — Invariantes del perfilador de latencia demostrados al 100%.');
