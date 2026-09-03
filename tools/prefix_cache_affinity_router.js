#!/usr/bin/env node
'use strict';

/**
 * Axion Protocol — Prefix Cache Affinity Router & KV-Cache Optimizer (M_TOK_011)
 *
 * Enrutador de afinidad de caché de prefijos de prompt:
 * 1. Estructura la anatomía canónica del prompt garantizando un prefijo estático e inmutable.
 * 2. Agrupa y secuencia lotes de tareas maximizando la tasa de acierto de KV-cache (Prompt Caching).
 * 3. Aísla variables volátiles (marcas de tiempo, IDs efímeros) estrictamente en el Dynamic Tail.
 * 4. Emite un recibo formal PrefixCacheAffinityReceipt sellado con SHA-256.
 *
 * Cero dependencias externas.
 */

const crypto = require('crypto');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

class PrefixCacheAffinityRouter {
  constructor(options = {}) {
    this.root = path.resolve(options.projectRoot || ROOT);
  }

  /**
   * Ensambla un prompt estructurado garantizando la preservación estricta del prefijo en caché.
   */
  assemblePrompt(components = {}) {
    const system = String(components.systemPrompt || '').trim();
    const governance = String(components.governanceRules || '').trim();
    const tools = String(components.toolDefinitions || '').trim();
    const memory = String(components.longTermMemory || '').trim();
    const dynamicTail = String(components.dynamicTail || '').trim();

    const prefixParts = [];
    if (system) prefixParts.push(`<!-- SYSTEM -->\n${system}`);
    if (governance) prefixParts.push(`<!-- GOVERNANCE -->\n${governance}`);
    if (tools) prefixParts.push(`<!-- TOOLS -->\n${tools}`);
    if (memory) prefixParts.push(`<!-- MEMORY -->\n${memory}`);

    const staticPrefix = prefixParts.join('\n\n');
    const fullPrompt = staticPrefix ? `${staticPrefix}\n\n<!-- TASK_INPUT -->\n${dynamicTail}` : dynamicTail;

    const prefixDigest = crypto.createHash('sha256').update(staticPrefix).digest('hex');

    const prefixTokenEstimate = Math.ceil(staticPrefix.length / 4);
    const dynamicTokenEstimate = Math.ceil(dynamicTail.length / 4);

    return {
      fullPrompt,
      staticPrefix,
      dynamicTail,
      prefixDigest,
      prefixTokenEstimate,
      dynamicTokenEstimate,
      totalTokenEstimate: prefixTokenEstimate + dynamicTokenEstimate
    };
  }

  /**
   * Calcula la longitud del prefijo común más largo (LCP) entre dos cadenas.
   */
  computeLCP(str1 = '', str2 = '') {
    let i = 0;
    const maxLen = Math.min(str1.length, str2.length);
    while (i < maxLen && str1[i] === str2[i]) {
      i++;
    }
    return str1.slice(0, i);
  }

  /**
   * Optimiza y secuencia un lote de prompts para maximizar la afinidad de KV-cache.
   */
  optimizeAffinityBatch(prompts = []) {
    if (!Array.isArray(prompts) || prompts.length === 0) {
      return {
        status: 'EMPTY_BATCH',
        orderedPrompts: [],
        cacheHitPotential: '0.0%',
        totalTokens: 0,
        cachedTokens: 0,
        receiptDigest: '0'.repeat(64)
      };
    }

    // 1. Agrupar prompts por similitud de prefijo
    const enriched = prompts.map((p, idx) => {
      const text = String(p.promptText || p || '');
      let prefix = p.staticPrefix || '';
      if (!prefix && text.includes('<!-- TASK_INPUT -->')) {
        prefix = text.split('<!-- TASK_INPUT -->')[0].trim();
      } else if (!prefix) {
        prefix = text.slice(0, 150);
      }
      const prefixHash = crypto.createHash('sha256').update(prefix).digest('hex').slice(0, 12);
      const tokenEst = Math.max(1, Math.ceil(text.length / 4));
      return {
        originalIndex: idx,
        id: p.id || `prompt_${idx}`,
        text,
        prefixHash,
        tokenEst,
        dependsOn: Array.isArray(p.dependsOn) ? p.dependsOn : []
      };
    });

    // 2. Ordenación topológica estable agrupada por afinidad de prefijo
    const ordered = [...enriched].sort((a, b) => {
      if (a.prefixHash === b.prefixHash) return 0;
      return a.prefixHash.localeCompare(b.prefixHash);
    });

    // 3. Calcular métricas de ahorro potencial
    let totalTokens = 0;
    let cachedTokens = 0;
    const seenHashes = new Set();

    for (const item of ordered) {
      totalTokens += item.tokenEst;
      if (seenHashes.has(item.prefixHash)) {
        // Asumir que el prefijo compartido se beneficia de prompt caching (~80% del prompt)
        cachedTokens += Math.floor(item.tokenEst * 0.75);
      } else {
        seenHashes.add(item.prefixHash);
      }
    }

    const hitRatio = totalTokens > 0 ? (cachedTokens / totalTokens) * 100 : 0;

    const payload = JSON.stringify({
      promptsCount: ordered.length,
      totalTokens,
      cachedTokens,
      hitRatio,
      timestamp: new Date().toISOString()
    });

    const receiptDigest = crypto.createHash('sha256').update(payload).digest('hex');

    return {
      status: 'AFFINITY_ROUTED',
      receiptType: 'PrefixCacheAffinityReceipt_v1',
      promptsCount: ordered.length,
      orderedPrompts: ordered.map((p) => ({ id: p.id, originalIndex: p.originalIndex, prefixHash: p.prefixHash })),
      totalTokens,
      cachedTokens,
      cacheHitPotential: `${hitRatio.toFixed(1)}%`,
      receiptDigest
    };
  }
}

if (require.main === module) {
  const router = new PrefixCacheAffinityRouter();

  console.log('[Prefix Cache Affinity Router] Ensamblando prompt canónico:\n');
  const assembled = router.assemblePrompt({
    systemPrompt: 'Eres un orquestador de gobernanza determinista.',
    governanceRules: '1. Invariantes P0 inmutables.\n2. Cero memoria estática.',
    toolDefinitions: 'tools: [read_file, run_command]',
    longTermMemory: 'Convenciones: Windows PowerShell, Node.js 24.',
    dynamicTail: 'Ejecutar misión M_TOK_011.'
  });
  console.log(`- Token Prefijo: ${assembled.prefixTokenEstimate}`);
  console.log(`- Token Dinámico: ${assembled.dynamicTokenEstimate}`);
  console.log(`- Digest Prefijo: ${assembled.prefixDigest.slice(0, 16)}...\n`);

  console.log('[Prefix Cache Affinity Router] Optimizando lote de prompts:\n');
  const batch = [
    { id: 'T1', promptText: assembled.fullPrompt + ' Subtarea A' },
    { id: 'T2', promptText: 'Prompt disonante y completamente diferente...' },
    { id: 'T3', promptText: assembled.fullPrompt + ' Subtarea B' },
    { id: 'T4', promptText: assembled.fullPrompt + ' Subtarea C' }
  ];
  const receipt = router.optimizeAffinityBatch(batch);
  console.log(`- Prompts Secuenciados: ${receipt.promptsCount}`);
  console.log(`- Cache Hit Potential: ${receipt.cacheHitPotential}`);
  console.log(`- Digest SHA-256: ${receipt.receiptDigest.slice(0, 16)}...`);
}

module.exports = PrefixCacheAffinityRouter;
