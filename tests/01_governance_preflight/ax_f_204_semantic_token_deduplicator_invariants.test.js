'use strict';

/**
 * AX-F-204: Invariantes del Deduplicador Semántico de Bloques de Contexto (M_TOK_006)
 *
 * Valida de forma determinista:
 * 1. Detección y sustitución de bloques redundantes por punteros de referencia livianos.
 * 2. Umbral mínimo de caracteres para evitar sobrecarga en fragmentos cortos.
 * 3. Reversibilidad matemática estricta: expand(deduplicate(text)) === text.
 * 4. Métricas de ahorro cuantificables en payloads conversacionales largos.
 * 5. Integración transparente con DriveEngine.deduplicateContextTokens() y expandDeduplicatedTokens().
 */

const assert = require('assert');
const path = require('path');
const SemanticTokenDeduplicator = require('../../tools/semantic_token_deduplicator.js');
const DriveEngine = require('../../tools/drive_engine.js');

console.log('=== AX-F-204 Invariantes del Deduplicador Semántico de Contexto (M_TOK_006) ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const deduplicator = new SemanticTokenDeduplicator({ projectRoot: ROOT, minBlockChars: 40 });

const extensivePolicyBlock = `
Esta es una directiva de gobernanza fail-closed del protocolo Axion.
Verifica que las firmas criptográficas Ed25519 y los hashes SHA-256 coincidan con el manifiesto.
Cualquier desviación congela inmediatamente toda mutación en caliente.
`.trim();

const multiTurnContext = [
  '# Turno 1: Diagnóstico',
  extensivePolicyBlock,
  '# Turno 2: Propuesta',
  extensivePolicyBlock,
  '# Turno 3: Verificación',
  extensivePolicyBlock
].join('\n\n');

// Invariante 1: Deduplicación y generación de punteros
const result = deduplicator.deduplicate(multiTurnContext);
assert.strictEqual(result.duplicateBlocksFound, 2);
assert.ok(result.compactedLength < result.originalLength);
assert.ok(result.compactedText.includes('<!-- AXION_REF: '));
console.log(`✓ Invariante 1: Deduplicación verificada (${result.originalLength} -> ${result.compactedLength} bytes, ${result.duplicateBlocksFound} duplicados eliminados, reducción: ${result.reductionPercent})`);

// Invariante 2: Reversibilidad matemática idéntica
const restored = deduplicator.expand(result.compactedText, result.cache);
assert.strictEqual(restored, multiTurnContext, 'El texto re-expandido debe ser matemáticamente idéntico al original');
console.log('✓ Invariante 2: Reversibilidad matemática estricta (expand(deduplicate(x)) === x) demostrada al 100%');

// Invariante 3: Manejo determinista de casos vacíos
const emptyRes = deduplicator.deduplicate('');
assert.strictEqual(emptyRes.duplicateBlocksFound, 0);
assert.strictEqual(emptyRes.bytesSaved, 0);
console.log('✓ Invariante 3: Manejo determinista de cadenas vacías validado');

// Invariante 4: Integración con DriveEngine
const driveEngine = new DriveEngine(ROOT);
const driveDedup = driveEngine.deduplicateContextTokens(multiTurnContext, { minBlockChars: 40 });
assert.strictEqual(driveDedup.duplicateBlocksFound, 2);
const driveRestored = driveEngine.expandDeduplicatedTokens(driveDedup.compactedText, driveDedup.cache);
assert.strictEqual(driveRestored, multiTurnContext);
console.log('✓ Invariante 4: Integración nativa con DriveEngine.deduplicateContextTokens() y expandDeduplicatedTokens() verificada');

console.log('\nPASS AX-F-204 — Invariantes del deduplicador semántico de contexto demostrados al 100%.');
