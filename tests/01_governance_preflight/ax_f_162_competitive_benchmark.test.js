'use strict';

/**
 * Axion Protocol — Invariantes del Motor de Benchmarks y Métricas Competitivas (AX-F-162).
 *
 * Valida de forma estricta:
 * 1. 0.0% de tasa de evasión terminal bajo fuzzing de 1,000 vectores adversariales.
 * 2. Cumplimiento estricto del SLA de Rollback (< 5ms media).
 * 3. Rendimiento de evaluación determinista (> 5,000 ops/seg).
 * 4. Generación de informe comparativo en Markdown con matriz estructurada.
 */

const assert = require('assert');
const CompetitiveBenchmarkEngine = require('../../tools/competitive_benchmark.js');

console.log('=== AX-F-162 Invariantes del Motor de Benchmarks Competitivos ===\n');

const engine = new CompetitiveBenchmarkEngine({ silent: true });

// 1. Validar ejecución del arnés de benchmarking
const report = engine.run();
assert.strictEqual(typeof report, 'object');
assert.strictEqual(report.safety.evasionRatePercent, 0);
assert.strictEqual(report.safety.interceptedVectors, 1000);
assert.strictEqual(report.rollback.meets5msSla, true);
assert.ok(report.rollback.avgLatencyMs < 5.0, 'El rollback debe ser < 5ms');
assert.ok(report.invariant.throughputOpsSec > 5000, 'El rendimiento debe superar 5k ops/seg');
console.log('✓ Ejecución de métricas competitivas (0.0% evasión, < 5ms rollback) verificada');

// 2. Validar generación de reporte Markdown
const md = engine.generateMarkdownReport(report);
assert.ok(md.includes('# 📊 Competitive Benchmark'), 'Debe incluir encabezado');
assert.ok(md.includes('0.0% Evasion'), 'Debe certificar 0.0% de evasión');
assert.ok(md.includes('Ed25519 in-toto DSSE Envelopes'), 'Debe incluir firma Ed25519');
console.log('✓ Generación de informe Markdown de benchmarking verificada');

console.log('\nPASS: Invariantes del Motor de Benchmarks Competitivos (AX-F-162) en verde.');
