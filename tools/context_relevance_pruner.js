#!/usr/bin/env node
'use strict';

/**
 * Axion Protocol — Context Relevance Pruner & Causal Token Optimizer (M_TOK_010)
 *
 * Podador dinámico de contexto por umbral de relevancia causal:
 * 1. Evalúa el peso causal de cada bloque histórico respecto a los símbolos y archivos del milestone.
 * 2. Protege incondicionalmente directivas de gobernanza, contratos de intención y la ventana de recencia.
 * 3. Descarta búsquedas intermedias superadas y errores sintácticos resueltos ahorrando hasta un 60% de tokens.
 * 4. Emite un informe formal ContextPruningAuditReport sellado con SHA-256.
 *
 * Cero dependencias externas.
 */

const crypto = require('crypto');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const PROTECTED_TYPES = new Set([
  'GOVERNANCE',
  'INTENT_CONTRACT',
  'SECURITY_ASSERTION',
  'USER_DIRECTIVE'
]);

class ContextRelevancePruner {
  constructor(options = {}) {
    this.root = path.resolve(options.projectRoot || ROOT);
    this.threshold = Math.max(0.1, Math.min(options.threshold || 0.3, 0.8));
    this.recencyCount = Math.max(1, Math.min(options.recencyCount || 2, 5));
  }

  /**
   * Calcula el puntaje de relevancia causal de un bloque respecto a los símbolos objetivo.
   */
  computeRelevance(item = {}, targetSymbols = new Set()) {
    const type = String(item.type || 'STEP').toUpperCase();
    if (PROTECTED_TYPES.has(type)) return 1.0;

    if (item.isTerminalState) return 0.9;

    const symbols = Array.isArray(item.referencedSymbols) ? item.referencedSymbols : [];
    for (const sym of symbols) {
      if (targetSymbols.has(sym)) return 0.85;
    }

    if (type === 'EXPLORATORY_GREP' || type === 'SUPERSEDED_ERROR') {
      return 0.15;
    }

    return 0.50;
  }

  /**
   * Poda los bloques de contexto irrelevantes inyectando un centinela compacto.
   */
  prune(items = [], options = {}) {
    if (!Array.isArray(items) || items.length === 0) {
      return {
        status: 'EMPTY_CONTEXT',
        originalItemsCount: 0,
        retainedItemsCount: 0,
        prunedItemsCount: 0,
        tokensSaved: 0,
        reductionPercent: '0.0%',
        retainedItems: [],
        auditDigest: '0'.repeat(64)
      };
    }

    const targets = new Set(Array.isArray(options.targetSymbols) ? options.targetSymbols : []);
    const threshold = typeof options.threshold === 'number' ? options.threshold : this.threshold;

    const retained = [];
    let prunedCount = 0;
    let tokensSaved = 0;
    let originalTokens = 0;

    const totalLen = items.length;
    const recencyThresholdIdx = totalLen - this.recencyCount;

    for (let i = 0; i < totalLen; i++) {
      const item = items[i];
      const tokenEst = Math.max(1, Number(item.tokenCount) || Math.ceil(String(item.content || '').length / 4));
      originalTokens += tokenEst;

      // Inmunidad para ventana de recencia
      if (i >= recencyThresholdIdx) {
        retained.push(item);
        continue;
      }

      const rel = this.computeRelevance(item, targets);

      if (rel < threshold) {
        prunedCount++;
        tokensSaved += tokenEst;
      } else {
        retained.push(item);
      }
    }

    // Inyectar centinela si hubo poda
    if (prunedCount > 0) {
      retained.unshift({
        id: 'sentinel_pruned_context',
        type: 'PRUNING_SENTINEL',
        content: `<!-- AXION_PRUNED: ${prunedCount} bloques incidentales descartados (${tokensSaved} tokens ahorrados) -->`,
        tokenCount: 15
      });
    }

    const reductionRatio = originalTokens > 0 ? (tokensSaved / originalTokens) * 100 : 0;

    const payload = JSON.stringify({
      originalItemsCount: totalLen,
      retainedItemsCount: retained.length,
      prunedItemsCount: prunedCount,
      tokensSaved,
      timestamp: new Date().toISOString()
    });

    const auditDigest = crypto.createHash('sha256').update(payload).digest('hex');

    return {
      status: 'PRUNING_COMPLETED',
      reportType: 'ContextPruningAuditReport_v1',
      originalItemsCount: totalLen,
      retainedItemsCount: retained.length,
      prunedItemsCount: prunedCount,
      tokensSaved,
      reductionPercent: `${reductionRatio.toFixed(1)}%`,
      retainedItems: retained,
      auditDigest
    };
  }
}

if (require.main === module) {
  const pruner = new ContextRelevancePruner();

  const mockContext = [
    { id: '1', type: 'GOVERNANCE', content: 'Invariante P0', tokenCount: 50 },
    { id: '2', type: 'EXPLORATORY_GREP', content: 'Grep de 100 archivos no relacionados...', tokenCount: 600 },
    { id: '3', type: 'SUPERSEDED_ERROR', content: 'Error sintáctico resuelto en paso 2...', tokenCount: 400 },
    { id: '4', type: 'STEP', referencedSymbols: ['DriveEngine'], content: 'Mutación en DriveEngine', tokenCount: 150 },
    { id: '5', type: 'STEP', content: 'Paso reciente 1', tokenCount: 100 },
    { id: '6', type: 'STEP', content: 'Paso reciente 2', tokenCount: 100 }
  ];

  console.log('[Context Relevance Pruner] Evaluando poda de contexto:\n');
  const report = pruner.prune(mockContext, { targetSymbols: ['DriveEngine'] });
  console.log(`- Bloques Originales: ${report.originalItemsCount}`);
  console.log(`- Bloques Conservados: ${report.retainedItemsCount}`);
  console.log(`- Bloques Podados: ${report.prunedItemsCount}`);
  console.log(`- Tokens Ahorrados: ${report.tokensSaved} (${report.reductionPercent})`);
  console.log(`- Digest SHA-256: ${report.auditDigest.slice(0, 16)}...`);
}

module.exports = ContextRelevancePruner;
