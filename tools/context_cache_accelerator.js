#!/usr/bin/env node
'use strict';

/**
 * Axion Protocol — Context Cache Accelerator & Prompt Deduplicator (M_TOK_002)
 *
 * Acelerador de caché KV y optimizador de prefijos inmutables para bucles agénticos:
 * 1. Particiona payloads en prefijos inmutables canónicos (gobernanza, herramientas, memoria).
 * 2. Valida umbrales de elegibilidad de caché KV (>= 1024 tokens) y computa huellas SHA-256 estables.
 * 3. Deduplica salidas de herramientas y lecturas de archivos redundantes en el historial de turnos.
 * 4. Cuantifica el ahorro de tokens y reducción de latencia en proveedores de LLM de frontera.
 *
 * Cero dependencias externas.
 */

const crypto = require('crypto');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

class ContextCacheAccelerator {
  constructor(projectRoot = ROOT) {
    this.root = path.resolve(projectRoot);
    this.minCacheTokens = 1024;
  }

  /**
   * Estima la cantidad de tokens según longitud de caracteres (heurística 1 token ≈ 4 caracteres).
   */
  estimateTokens(text = '') {
    if (!text || typeof text !== 'string') return 0;
    return Math.ceil(text.length / 4);
  }

  /**
   * Particiona un payload en prefijo estático inmutable (elegible para caché KV) y sufijo dinámico.
   */
  partitionPayload(components = {}) {
    const governance = components.governance || '';
    const tools = components.tools || '';
    const memory = components.memory || '';
    const activeTask = components.activeTask || '';
    const turnHistory = Array.isArray(components.turnHistory) ? components.turnHistory : [];

    // Ordenamiento canónico inmutable del prefijo
    const staticPrefixRaw = [
      '<!-- AXION_STATIC_PREFIX_START -->',
      governance.trim(),
      tools.trim(),
      memory.trim(),
      '<!-- AXION_STATIC_PREFIX_END -->'
    ].filter(Boolean).join('\n\n');

    const prefixTokens = this.estimateTokens(staticPrefixRaw);
    const prefixDigest = crypto.createHash('sha256').update(staticPrefixRaw).digest('hex');

    // Deduplicar el historial en el sufijo dinámico
    const deduplicatedHistory = this.deduplicateTurnHistory(turnHistory);
    const dynamicSuffixRaw = [
      activeTask.trim(),
      JSON.stringify(deduplicatedHistory)
    ].filter(Boolean).join('\n\n');

    const suffixTokens = this.estimateTokens(dynamicSuffixRaw);
    const isCacheEligible = prefixTokens >= this.minCacheTokens;

    return {
      isCacheEligible,
      prefixTokens,
      suffixTokens,
      totalTokens: prefixTokens + suffixTokens,
      prefixDigest,
      staticPrefix: staticPrefixRaw,
      dynamicSuffix: dynamicSuffixRaw,
      cacheSavingsRatio: isCacheEligible ? Number((prefixTokens / (prefixTokens + suffixTokens)).toFixed(2)) : 0
    };
  }

  /**
   * Deduplica lecturas de archivos y salidas voluminosas en el historial de mensajes de la sesión.
   */
  deduplicateTurnHistory(messages = []) {
    const seenHashes = new Set();

    return messages.map(msg => {
      if (!msg || typeof msg.content !== 'string') return msg;

      // Si el mensaje es una salida de herramienta voluminosa (> 500 caracteres)
      if (msg.role === 'tool' || msg.type === 'tool_result') {
        const hash = crypto.createHash('sha256').update(msg.content).digest('hex');
        if (seenHashes.has(hash)) {
          return {
            ...msg,
            content: `[CACHED_PAYLOAD_REF: sha256:${hash.slice(0, 16)}]`,
            deduplicated: true
          };
        }
        seenHashes.add(hash);
      }
      return msg;
    });
  }

  /**
   * Calcula el ahorro económico y de cuota estimado por aciertos de caché KV.
   */
  calculateSavings(partitionedResult = {}) {
    const prefixTokens = partitionedResult.prefixTokens || 0;
    const isCacheEligible = partitionedResult.isCacheEligible || false;

    if (!isCacheEligible) {
      return {
        cacheHitDiscountPercent: 0,
        effectiveTokensBilled: partitionedResult.totalTokens || 0,
        savedEquivalentTokens: 0
      };
    }

    // Descuento típico de caché KV en proveedores (Anthropic/Google/DeepSeek): 90% sobre tokens cacheados
    const discountRate = 0.90;
    const savedEquivalentTokens = Math.floor(prefixTokens * discountRate);
    const effectiveBilled = (partitionedResult.totalTokens || 0) - savedEquivalentTokens;

    return {
      cacheHitDiscountPercent: 90,
      effectiveTokensBilled: effectiveBilled,
      savedEquivalentTokens,
      savingsMultiplier: Number(((partitionedResult.totalTokens || 1) / effectiveBilled).toFixed(2))
    };
  }
}

if (require.main === module) {
  const accelerator = new ContextCacheAccelerator();
  const mockGov = 'Reglas de gobernanza determinista Axion Protocol '.repeat(100);
  const mockTools = 'Definición de herramientas y esquemas inmutables '.repeat(100);
  const mockMemory = 'Memoria persistente y convenciones de usuario '.repeat(50);

  const partition = accelerator.partitionPayload({
    governance: mockGov,
    tools: mockTools,
    memory: mockMemory,
    activeTask: 'Ejecutar misión de optimización de caché KV'
  });

  const savings = accelerator.calculateSavings(partition);
  console.log('[Context Cache Accelerator] Resultado de partición y cálculo de caché:');
  console.log(`- Prefijo Estático:   ${partition.prefixTokens} tokens (Elegible: ${partition.isCacheEligible})`);
  console.log(`- Digest SHA-256:     ${partition.prefixDigest.slice(0, 16)}...`);
  console.log(`- Sufijo Dinámico:    ${partition.suffixTokens} tokens`);
  console.log(`- Tokens Facturados:  ${savings.effectiveTokensBilled} (vs ${partition.totalTokens} originales)`);
  console.log(`- Multiplicador:      ${savings.savingsMultiplier}x más eficiente`);
}

module.exports = ContextCacheAccelerator;
