'use strict';

/**
 * AX-F-214: Invariantes del Enrutador de Afinidad de Caché de Prefijos (M_TOK_011)
 *
 * Valida de forma determinista:
 * 1. Ensamblado canónico de prompts con prefijo inmutable y digest SHA-256.
 * 2. Agrupamiento por afinidad de prefijo para maximizar reutilización de KV-cache.
 * 3. Estimación precisa de tokens y cacheHitPotential.
 * 4. Emisión de PrefixCacheAffinityReceipt_v1 sellado con SHA-256.
 * 5. Integración transparente con DriveEngine.createPrefixCacheRouter() y routePromptAffinityBatch().
 */

const assert = require('assert');
const path = require('path');
const PrefixCacheAffinityRouter = require('../../tools/prefix_cache_affinity_router.js');
const DriveEngine = require('../../tools/drive_engine.js');

console.log('=== AX-F-214 Invariantes del Enrutador de Afinidad de Caché de Prefijos (M_TOK_011) ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const router = new PrefixCacheAffinityRouter({ projectRoot: ROOT });

// Invariante 1: Ensamblaje canónico con digest inmutable
const promptComponents = {
  systemPrompt: 'Agente de gobernanza Axion Protocol.',
  governanceRules: 'Invariantes P0 fail-closed.',
  toolDefinitions: 'tools: [read_file, run_command]',
  longTermMemory: 'Contexto de plataforma Windows.',
  dynamicTail: 'Ejecutar prueba de afinidad.'
};
const assembled = router.assemblePrompt(promptComponents);
assert.ok(assembled.fullPrompt.includes('<!-- SYSTEM -->'));
assert.ok(assembled.fullPrompt.includes('<!-- TASK_INPUT -->'));
assert.ok(assembled.prefixDigest && assembled.prefixDigest.length === 64);
assert.ok(assembled.prefixTokenEstimate > 0);
assert.ok(assembled.dynamicTokenEstimate > 0);
console.log(`✓ Invariante 1: Ensamblado canónico de prompt verificado (Tokens Prefijo: ${assembled.prefixTokenEstimate}, Digest: ${assembled.prefixDigest.slice(0, 12)})`);

// Invariante 2: Optimización de lotes y afinidad de prefijos
const testBatch = [
  { id: 'Task_A', promptText: assembled.fullPrompt + ' Variante 1' },
  { id: 'Task_Diff', promptText: '<!-- SYSTEM -->\nPrompt completamente disonante' },
  { id: 'Task_B', promptText: assembled.fullPrompt + ' Variante 2' },
  { id: 'Task_C', promptText: assembled.fullPrompt + ' Variante 3' }
];

const affinityReceipt = router.optimizeAffinityBatch(testBatch);
assert.strictEqual(affinityReceipt.status, 'AFFINITY_ROUTED');
assert.strictEqual(affinityReceipt.promptsCount, 4);
assert.ok(affinityReceipt.cachedTokens > 0);
assert.ok(parseFloat(affinityReceipt.cacheHitPotential) > 40.0);
assert.ok(affinityReceipt.receiptDigest && affinityReceipt.receiptDigest.length === 64);
console.log(`✓ Invariante 2: Enrutamiento por afinidad demostrado (Cache Hit: ${affinityReceipt.cacheHitPotential}, Tokens Reutilizados: ${affinityReceipt.cachedTokens})`);

// Invariante 3: Manejo de lote vacío
const emptyReceipt = router.optimizeAffinityBatch([]);
assert.strictEqual(emptyReceipt.status, 'EMPTY_BATCH');
assert.strictEqual(emptyReceipt.totalTokens, 0);
console.log('✓ Invariante 3: Manejo determinista de lotes vacíos validado');

// Invariante 4: Integración con DriveEngine
const driveEngine = new DriveEngine(ROOT);
const driveReport = driveEngine.routePromptAffinityBatch(testBatch);
assert.strictEqual(driveReport.receiptType, 'PrefixCacheAffinityReceipt_v1');
assert.strictEqual(driveReport.promptsCount, 4);
console.log('✓ Invariante 4: Integración nativa con DriveEngine.routePromptAffinityBatch() verificada');

console.log('\nPASS AX-F-214 — Invariantes del enrutador de afinidad de prefijos demostrados al 100%.');
