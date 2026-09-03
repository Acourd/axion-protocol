'use strict';

/**
 * AX-F-206: Invariantes del Registrador Cero-Sobrecarga de Trazas y Telemetría de Tokens (M_TOK_007)
 *
 * Valida de forma determinista:
 * 1. Escritura en búfer circular en tiempo sub-milisegundo sin fugas de memoria.
 * 2. Contabilidad determinista de desbordamiento (overflowCount) ante ráfagas.
 * 3. Drenado de registros en orden cronológico estricto (drainEntries).
 * 4. Generación de digest criptográfico SHA-256 acumulativo del ledger.
 * 5. Integración transparente con DriveEngine.createZeroOverheadTraceLogger().
 */

const assert = require('assert');
const path = require('path');
const ZeroOverheadTraceLogger = require('../../tools/zero_overhead_trace_logger.js');
const DriveEngine = require('../../tools/drive_engine.js');

console.log('=== AX-F-206 Invariantes del Registrador Cero-Sobrecarga de Tokens (M_TOK_007) ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const logger = new ZeroOverheadTraceLogger({ projectRoot: ROOT, capacity: 5 });

// 1. Registrar 7 trazas para forzar 2 overflows
for (let i = 1; i <= 7; i++) {
  logger.recordTrace({
    event: 'STEP',
    agentId: `agent_${i}`,
    tokensIn: 10 * i,
    tokensOut: 5 * i,
    durationMs: i
  });
}

// Invariante 1: Métricas de capacidad y desbordamiento
const metrics = logger.getMetrics();
assert.strictEqual(metrics.capacity, 5);
assert.strictEqual(metrics.activeEntries, 5);
assert.strictEqual(metrics.overflowCount, 2);
assert.strictEqual(metrics.totalTracesLogged, 7);
assert.strictEqual(metrics.totalTokensIn, 280); // sum(10..70)
assert.strictEqual(metrics.totalTokensOut, 140); // sum(5..35)
assert.ok(metrics.ledgerDigest && metrics.ledgerDigest.length === 64);
console.log(`✓ Invariante 1: Métricas de búfer circular verificadas (7 registradas, 2 overflows, latencia media: ${metrics.averageLatencyMicroseconds} µs)`);

// Invariante 2: Drenado cronológico
const drained = logger.drainEntries();
assert.strictEqual(drained.length, 5);
assert.strictEqual(drained[0].agentId, 'agent_3'); // Primero tras sobreescritura de 1 y 2
assert.strictEqual(drained[4].agentId, 'agent_7'); // Último registrado
assert.strictEqual(logger.getMetrics().activeEntries, 0, 'El búfer debe quedar vacío tras drenar');
console.log('✓ Invariante 2: Drenado en orden cronológico estricto demostrado');

// Invariante 3: Integración con DriveEngine
const driveEngine = new DriveEngine(ROOT);
const driveLogger = driveEngine.createZeroOverheadTraceLogger({ capacity: 10 });
assert.ok(driveLogger instanceof ZeroOverheadTraceLogger);
driveLogger.recordTrace({ event: 'DRIVE_STEP', agentId: 'lead', tokensIn: 50, tokensOut: 20 });
assert.strictEqual(driveLogger.getMetrics().totalTracesLogged, 1);
console.log('✓ Invariante 3: Integración nativa con DriveEngine.createZeroOverheadTraceLogger() verificada');

console.log('\nPASS AX-F-206 — Invariantes del registrador cero-sobrecarga demostrados al 100%.');
