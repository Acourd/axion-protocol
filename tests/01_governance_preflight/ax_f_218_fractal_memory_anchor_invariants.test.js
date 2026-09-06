'use strict';

/**
 * AX-F-218: Invariantes del Anclaje Fractal de Memoria Anti-Deriva (M_MEM_005)
 *
 * Valida de forma determinista:
 * 1. Arquitectura de 4 Tiers: Raw Entries -> Semantic Clusters -> MicroAnchor -> MerkleDigest.
 * 2. Cota estricta del MicroAnchor: < 150 tokens (<= 600 caracteres) listo para inyección de prompt.
 * 3. Enlace criptográfico: merkleDigest derivado canónicamente de las entradas activas.
 * 4. Resiliencia ante memoria vacía o corrupta (fallback determinista).
 * 5. Emisión de FractalMemoryReport_v1 sellado con SHA-256.
 * 6. Integración transparente con DriveEngine.getFractalMemoryAnchor().
 */

const assert = require('assert');
const path = require('path');
const FractalMemoryAnchor = require('../../tools/fractal_memory_anchor.js');
const DriveEngine = require('../../tools/drive_engine.js');

console.log('=== AX-F-218 Invariantes del Anclaje Fractal de Memoria Anti-Deriva (M_MEM_005) ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const anchor = new FractalMemoryAnchor({ projectRoot: ROOT });

// Invariante 1: Generación de 4 Tiers a partir de entradas de prueba
const sampleEntries = [
  { tipo: 'decision', texto: 'Migrar a spawnSync con shell false para eliminar inyecciones de terminal', id: 'd01' },
  { tipo: 'convencion', texto: 'Todas las pruebas deben ser deterministas y terminar con exit code 0', id: 'c01' },
  { tipo: 'limite', texto: 'Prohibido usar paquetes npm externos; zero external dependencies', id: 'l01' },
  { tipo: 'correccion', texto: 'No asumir presencia de tools sin sondear preflight primero', id: 'x01' }
];

const tiers = anchor.synthesizeTiers(sampleEntries);
assert.ok(tiers.tier0_raw && tiers.tier0_raw.length === 4, 'Tier 0 debe contener las entradas crudas');
assert.ok(tiers.tier1_clusters && typeof tiers.tier1_clusters === 'object', 'Tier 1 debe agrupar por tipo');
assert.ok(typeof tiers.tier2_microAnchor === 'string', 'Tier 2 debe ser string conciso');
assert.ok(typeof tiers.tier3_merkleDigest === 'string' && tiers.tier3_merkleDigest.length === 64, 'Tier 3 debe ser SHA-256');
console.log('✓ Invariante 1: Arquitectura de 4 Tiers sintetizada deterministamente');

// Invariante 2: Cota estricta del MicroAnchor (< 150 tokens / <= 600 caracteres)
const tokenEstimate = anchor.estimateTokens(tiers.tier2_microAnchor);
assert.ok(tokenEstimate < 150, `El micro-anchor debe tener < 150 tokens, estimado: ${tokenEstimate}`);
assert.ok(tiers.tier2_microAnchor.length <= 600, 'El micro-anchor no debe exceder los 600 caracteres');
assert.ok(tiers.tier2_microAnchor.includes('[AXION_MEMORY_ANCHOR]'), 'Debe incluir cabecera de anclaje');
console.log(`✓ Invariante 2: MicroAnchor acotado estrictamente (${tokenEstimate} tokens, ${tiers.tier2_microAnchor.length} caracteres)`);

// Invariante 3: Enlace criptográfico determinista
const digestRecalculated = anchor.computeEntriesDigest(sampleEntries);
assert.strictEqual(tiers.tier3_merkleDigest, digestRecalculated, 'El MerkleDigest debe coincidir con la huella canónica de entradas');
console.log('✓ Invariante 3: Enlace criptográfico Merkle verificado: ' + tiers.tier3_merkleDigest.slice(0, 16) + '...');

// Invariante 4: Resiliencia ante entradas vacías
const emptyTiers = anchor.synthesizeTiers([]);
assert.ok(emptyTiers.tier2_microAnchor.includes('EMPTY_ANCHOR'));
assert.strictEqual(emptyTiers.tier0_raw.length, 0);
console.log('✓ Invariante 4: Resiliencia ante memoria vacía probada con fallback');

// Invariante 5: Emisión de FractalMemoryReport_v1
const report = anchor.buildReport(sampleEntries);
assert.strictEqual(report.reportType, 'FractalMemoryReport_v1');
assert.strictEqual(typeof report.reportDigest, 'string');
assert.strictEqual(report.reportDigest.length, 64);
assert.strictEqual(report.entriesCount, 4);
console.log('✓ Invariante 5: FractalMemoryReport_v1 emitido y sellado con SHA-256');

// Invariante 6: Integración con DriveEngine
const drive = new DriveEngine(ROOT);
assert.strictEqual(typeof drive.getFractalMemoryAnchor, 'function');
const driveAnchor = drive.getFractalMemoryAnchor(sampleEntries);
assert.ok(typeof driveAnchor === 'string');
assert.ok(driveAnchor.includes('[AXION_MEMORY_ANCHOR]'));
console.log('✓ Invariante 6: Integración nativa con DriveEngine verificada');

console.log('\nPASS: AX-F-218 — Invariantes de FractalMemoryAnchor demostrados al 100%.');
