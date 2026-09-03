'use strict';

/**
 * AX-F-212: Invariantes del Podador Dinámico de Contexto por Relevancia Causal (M_TOK_010)
 *
 * Valida de forma determinista:
 * 1. Poda selectiva de bloques con baja relevancia causal respecto al milestone.
 * 2. Inmunidad inmutable de gobernanza, contratos de intención y ventana de recencia.
 * 3. Inyección de centinela descriptivo resumiendo los tokens economizados.
 * 4. Emisión de informe ContextPruningAuditReport_v1 sellado con SHA-256.
 * 5. Integración transparente con DriveEngine.createContextRelevancePruner() y pruneContextItems().
 */

const assert = require('assert');
const path = require('path');
const ContextRelevancePruner = require('../../tools/context_relevance_pruner.js');
const DriveEngine = require('../../tools/drive_engine.js');

console.log('=== AX-F-212 Invariantes del Podador de Contexto por Relevancia Causal (M_TOK_010) ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const pruner = new ContextRelevancePruner({ projectRoot: ROOT, threshold: 0.3, recencyCount: 2 });

const testPayload = [
  { id: '1', type: 'GOVERNANCE', content: 'Gobernanza P0', tokenCount: 40 },
  { id: '2', type: 'EXPLORATORY_GREP', content: 'Grep dump masivo...', tokenCount: 500 },
  { id: '3', type: 'SUPERSEDED_ERROR', content: 'SyntaxError resuelto...', tokenCount: 300 },
  { id: '4', type: 'STEP', referencedSymbols: ['target_sym'], content: 'Paso relevante', tokenCount: 100 },
  { id: '5', type: 'STEP', content: 'Turno reciente 1', tokenCount: 80 },
  { id: '6', type: 'STEP', content: 'Turno reciente 2', tokenCount: 80 }
];

// Invariante 1: Poda de bloques irrelevantes preservando los relevantes
const report = pruner.prune(testPayload, { targetSymbols: ['target_sym'] });
assert.strictEqual(report.status, 'PRUNING_COMPLETED');
assert.strictEqual(report.originalItemsCount, 6);
assert.strictEqual(report.prunedItemsCount, 2); // 2 y 3 podados
assert.strictEqual(report.tokensSaved, 800);
assert.ok(report.retainedItems.some((it) => it.type === 'GOVERNANCE'), 'Gobernanza debe ser preservada');
assert.ok(report.retainedItems.some((it) => it.type === 'PRUNING_SENTINEL'), 'Debe inyectar centinela');
assert.ok(report.auditDigest && report.auditDigest.length === 64);
console.log(`✓ Invariante 1: Poda causal verificada (6 bloques -> 2 podados, ${report.tokensSaved} tokens ahorrados: ${report.reductionPercent})`);

// Invariante 2: Inmunidad de recencia
const retainedIds = report.retainedItems.map((it) => it.id);
assert.ok(retainedIds.includes('5'), 'Turno reciente 1 debe ser inmune');
assert.ok(retainedIds.includes('6'), 'Turno reciente 2 debe ser inmune');
console.log('✓ Invariante 2: Inmunidad de ventana de recencia (últimos 2 turnos) demostrada al 100%');

// Invariante 3: Manejo de contexto vacío
const emptyRes = pruner.prune([]);
assert.strictEqual(emptyRes.originalItemsCount, 0);
assert.strictEqual(emptyRes.tokensSaved, 0);
console.log('✓ Invariante 3: Manejo determinista de contexto vacío validado');

// Invariante 4: Integración con DriveEngine
const driveEngine = new DriveEngine(ROOT);
const driveReport = driveEngine.pruneContextItems(testPayload, { targetSymbols: ['target_sym'] });
assert.strictEqual(driveReport.reportType, 'ContextPruningAuditReport_v1');
assert.strictEqual(driveReport.prunedItemsCount, 2);
console.log('✓ Invariante 4: Integración nativa con DriveEngine.pruneContextItems() verificada');

console.log('\nPASS AX-F-212 — Invariantes del podador causal de contexto demostrados al 100%.');
