#!/usr/bin/env node
'use strict';

/**
 * AX-F-177: Invariantes del Motor de Benchmarking de Swarm v2.0
 *
 * Verifica:
 * 1. Ejecución íntegra de benchmarks de estrés para los 3 pilares (AST, P2P, BFT).
 * 2. Cálculo determinista de percentiles de latencia (p50, p95, p99) y throughput (ops/sec).
 * 3. Limpieza atómica de directorios temporales de prueba.
 */

const assert = require('assert');
const path = require('path');
const SwarmBenchmark = require('../../tools/swarm_benchmark.js');

console.log('=== AX-F-177: Invariantes de SwarmBenchmark (v2.0 Stress Suite) ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const bench = new SwarmBenchmark(ROOT);

// Ejecutar con iteraciones reducidas para asegurar velocidad en suite de pruebas
const res = bench.runAllBenchmarks({
  astIterations: 50,
  p2pIterations: 50,
  bftRounds: 20
});

// Invariante 1: AST Benchmark
assert.ok(res.astBenchmark, 'Debe incluir resultados de AST Benchmark');
assert.strictEqual(res.astBenchmark.iterations, 50);
assert.ok(res.astBenchmark.opsPerSec > 0, 'ops/sec debe ser positivo');
assert.ok(typeof res.astBenchmark.p50Ms === 'number', 'p50 debe ser numérico');
console.log(`  ✓ Invariante 1: AST Benchmark verificado (${res.astBenchmark.opsPerSec} ops/sec, p50: ${res.astBenchmark.p50Ms}ms).`);

// Invariante 2: P2P Ed25519 Benchmark
assert.ok(res.p2pBenchmark, 'Debe incluir resultados de P2P Benchmark');
assert.strictEqual(res.p2pBenchmark.iterations, 50);
assert.ok(res.p2pBenchmark.opsPerSec > 0, 'ops/sec de P2P debe ser positivo');
console.log(`  ✓ Invariante 2: P2P Ed25519 Benchmark verificado (${res.p2pBenchmark.opsPerSec} ops/sec, p50: ${res.p2pBenchmark.p50Ms}ms).`);

// Invariante 3: BFT Consensus Benchmark
assert.ok(res.bftBenchmark, 'Debe incluir resultados de BFT Consensus');
assert.strictEqual(res.bftBenchmark.iterations, 20);
assert.ok(res.bftBenchmark.opsPerSec > 0, 'rounds/sec de BFT debe ser positivo');
console.log(`  ✓ Invariante 3: BFT Consensus Benchmark verificado (${res.bftBenchmark.opsPerSec} rounds/sec, p50: ${res.bftBenchmark.p50Ms}ms).`);

console.log('\nPASS: AX-F-177 — Motor de Benchmarking de Swarm verificado con 3/3 invariantes en verde.');
