'use strict';

/**
 * Axion Protocol — Invariantes de Rendimiento, Latencia Sub-50ms y Huella de Memoria.
 *
 * Valida de forma estricta:
 * 1. Cobertura de benchmark sobre los 12 comandos esenciales del protocolo.
 * 2. Latencia promedio de despacho y clasificación léxica inferior a 50ms (SLA estricto).
 * 3. Consumo de memoria heap controlada (< 25MB de Heap Used).
 * 4. Cumplimiento determinista del SLA de rendimiento sin dependencias externas.
 */

const assert = require('assert');
const path = require('path');
const PerformanceBenchmark = require('../../tools/performance_benchmark.js');

console.log('=== AX-F-090 Invariantes de Rendimiento y Latencia Sub-50ms ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const benchmark = new PerformanceBenchmark(ROOT);

const results = benchmark.runFullBenchmark(30);

// 1. Validar cobertura de los 12 comandos
const commandKeys = Object.keys(results.commands);
assert.strictEqual(commandKeys.length, 12, `Deben medirse exactamente 12 comandos, medidos ${commandKeys.length}`);
console.log(`✓ 12 comandos auditados bajo 30 iteraciones de ráfaga continua`);

// 2. Validar latencia promedio
assert.strictEqual(results.passedSla, true, 'Todos los comandos deben cumplir el SLA de latencia < 50ms');
assert.ok(results.avgLatencyMs < 10, `La latencia promedio global debe ser < 10ms, registrada: ${results.avgLatencyMs}ms`);
for (const [cmd, data] of Object.entries(results.commands)) {
  assert.ok(data.avgLatencyMs < 50, `El comando /${cmd} superó el límite de 50ms (${data.avgLatencyMs}ms)`);
}
console.log(`✓ Latencia promedio global ultrarrápida: ${results.avgLatencyMs}ms (Límite SLA: 50ms)`);

// 3. Validar consumo de memoria determinista (Heap Used V8 < 25MB unificado con SLA de herramienta)
assert.strictEqual(results.memorySlaMet, true, 'El benchmark debe cumplir memorySlaMet (< 25MB Heap)');
assert.ok(results.memoryAfter.heapUsedMb < 25, `El heap utilizado debe ser < 25MB, actual: ${results.memoryAfter.heapUsedMb}MB`);
console.log(`✓ Huella de memoria controlada: Heap Used ${results.memoryAfter.heapUsedMb}MB (SLA < 25MB) · RSS informativa ${results.memoryAfter.rssMb}MB`);

console.log('\nPASS AX-F-090 — Invariantes de rendimiento y latencia verificados al 100%.');
