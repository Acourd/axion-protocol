'use strict';

/**
 * AX-F-195: Invariantes del Compresor LZW de Snapshots de Contexto y Memoria (M_TOK_003)
 *
 * Valida de forma determinista:
 * 1. Codificación y decodificación LZW sin pérdida para objetos y cadenas de texto.
 * 2. Cuantificación de reducción de tamaño y generación de huella SHA-256 estricta.
 * 3. Detección y rechazo fail-closed inmediato (INTEGRITY_HASH_MISMATCH) ante alteraciones.
 * 4. Integración transparente con DriveEngine.compressContextSnapshot() y decompressContextSnapshot().
 */

const assert = require('assert');
const path = require('path');
const ContextSnapshotCompressor = require('../../tools/context_snapshot_compressor.js');
const DriveEngine = require('../../tools/drive_engine.js');

console.log('=== AX-F-195 Invariantes del Compresor de Snapshots de Contexto (M_TOK_003) ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const compressor = new ContextSnapshotCompressor(ROOT);

// Invariante 1: Roundtrip de compresión y descompresión
const mockState = {
  activeSession: 'axion-sess-994',
  rules: 'Gobernanza determinista fail-closed con verificacion estricta '.repeat(20),
  counter: 42
};
const rawText = JSON.stringify(mockState);
const compressed = compressor.compressSnapshot(rawText);

assert.strictEqual(compressed.format, 'AXION_LZW_V1');
assert.ok(compressed.compressedBytes < compressed.originalBytes, 'El snapshot comprimido debe ser menor al original');
assert.ok(compressed.originalSha256 && compressed.originalSha256.length === 64);

const restored = compressor.decompressSnapshot(compressed);
assert.strictEqual(restored, rawText, 'El texto restaurado debe ser idéntico al original');
console.log(`✓ Invariante 1: Roundtrip LZW verificado al 100% (${compressed.originalBytes} -> ${compressed.compressedBytes} bytes, ${compressed.compressionRatio})`);

// Invariante 2: Rechazo fail-closed ante alteración de hash
const tamperedPackage = {
  ...compressed,
  originalSha256: '0000000000000000000000000000000000000000000000000000000000000000'
};
assert.throws(() => {
  compressor.decompressSnapshot(tamperedPackage);
}, /INTEGRITY_HASH_MISMATCH/);
console.log('✓ Invariante 2: Rechazo fail-closed de integridad ante manipulación de digest verificado');

// Invariante 3: Integración con DriveEngine
const driveEngine = new DriveEngine(ROOT);
const driveComp = driveEngine.compressContextSnapshot(mockState);
assert.ok(driveComp.compressedBytes < driveComp.originalBytes);

const driveRestored = driveEngine.decompressContextSnapshot(driveComp);
assert.deepStrictEqual(JSON.parse(driveRestored), mockState);
console.log('✓ Invariante 3: Integración nativa con DriveEngine de compresión y descompresión verificada');

console.log('\nPASS AX-F-195 — Invariantes del compresor de snapshots de contexto demostrados al 100%.');
