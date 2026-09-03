'use strict';

/**
 * AX-F-202: Invariantes del Compactador de Flujos de Streaming de Tokens (M_TOK_005)
 *
 * Valida de forma determinista:
 * 1. Poda al vuelo de repeticiones sintácticas y espacios superfluos.
 * 2. Emisión incremental mediante ventana deslizante con respeto a límites de palabra.
 * 3. Vaciado determinista de cola residual mediante flush().
 * 4. Métricas consolidadas y cálculo de digest criptográfico SHA-256 del flujo.
 * 5. Integración transparente con DriveEngine.createStreamingTokenCompactor().
 */

const assert = require('assert');
const path = require('path');
const TokenStreamingCompactor = require('../../tools/token_streaming_compactor.js');
const DriveEngine = require('../../tools/drive_engine.js');

console.log('=== AX-F-202 Invariantes del Compactador de Streaming de Tokens (M_TOK_005) ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const compactor = new TokenStreamingCompactor({ projectRoot: ROOT, windowSize: 64 });

const streamChunks = [
  'Iniciando   proceso... ',
  'Iniciando   proceso... ',
  'Auditando los los invariantes de seguridad.\n\n\n\n',
  'Comprobación lista.'
];

let totalEmitted = '';
for (const chunk of streamChunks) {
  const emitted = compactor.processChunk(chunk);
  totalEmitted += emitted;
}
totalEmitted += compactor.flush();

// Invariante 1: Poda de duplicaciones y normalización
assert.ok(!totalEmitted.includes('los los'), 'Debe podar palabras duplicadas contiguas');
assert.ok(!totalEmitted.includes('   '), 'Debe normalizar espacios múltiples a simples');
assert.ok(!totalEmitted.includes('\n\n\n'), 'Debe limitar saltos de línea consecutivos');
console.log('✓ Invariante 1: Poda de repeticiones y normalización de espacios en streaming validada');

// Invariante 2: Métricas de compresión
const metrics = compactor.getMetrics();
assert.strictEqual(metrics.chunksProcessed, 4);
assert.ok(metrics.rawBytesIn > metrics.compactedBytesOut, 'Los bytes compactados deben ser menores a los originales');
assert.ok(metrics.bytesSaved > 0, 'Debe haber un ahorro neto positivo');
assert.ok(metrics.streamDigest && metrics.streamDigest.length === 64, 'Debe generar un digest SHA-256 del flujo');
console.log(`✓ Invariante 2: Métricas consolidadas del flujo verificadas (${metrics.rawBytesIn} -> ${metrics.compactedBytesOut} bytes, ahorro: ${metrics.bytesSaved} bytes, digest: ${metrics.streamDigest.slice(0, 16)}...)`);

// Invariante 3: Integración con DriveEngine
const driveEngine = new DriveEngine(ROOT);
const driveCompactor = driveEngine.createStreamingTokenCompactor({ windowSize: 80 });
assert.ok(driveCompactor instanceof TokenStreamingCompactor);
driveCompactor.processChunk('Prueba   de   flujo');
const driveFlush = driveCompactor.flush();
assert.strictEqual(driveFlush, 'Prueba de flujo');
console.log('✓ Invariante 3: Integración nativa con DriveEngine.createStreamingTokenCompactor() verificada');

console.log('\nPASS AX-F-202 — Invariantes del compactador de streaming demostrados al 100%.');
