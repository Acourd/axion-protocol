#!/usr/bin/env node
'use strict';

/**
 * Axion Protocol — Speculative Token Expander & Pointer Decompressor (M_TOK_009)
 *
 * Expansor especulativo y descompresor de punteros de contexto:
 * 1. Pre-resuelve y descompacta punteros <!-- AXION_REF: {hash} --> de forma anticipada.
 * 2. Verifica criptográficamente la integridad SHA-256 de cada bloque antes de la inyección.
 * 3. Aplica salvaguarda fail-closed si un puntero no existe o sufre corrupción de hash.
 * 4. Emite un informe formal SpeculativeExpansionReport sellado con SHA-256.
 *
 * Cero dependencias externas.
 */

const crypto = require('crypto');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

class SpeculativeTokenExpander {
  constructor(options = {}) {
    this.root = path.resolve(options.projectRoot || ROOT);
    this.cache = new Map();
  }

  /**
   * Pre-calienta la caché de resolución de punteros con bloques canónicos.
   */
  warmCache(entries = {}) {
    if (!entries) return;
    if (entries instanceof Map) {
      for (const [k, v] of entries.entries()) {
        this.cache.set(k, v);
      }
    } else if (typeof entries === 'object') {
      for (const [k, v] of Object.entries(entries)) {
        this.cache.set(k, v);
      }
    }
  }

  /**
   * Verifica el digest de 12 caracteres de un bloque de texto candidato.
   */
  verifyBlockHash(block = '', expectedHash = '') {
    const computed = crypto.createHash('sha256').update(block).digest('hex').slice(0, 12);
    return computed === expectedHash;
  }

  /**
   * Expande de forma especulativa y segura todos los punteros presentes en el texto.
   */
  expandSpeculative(text = '', customCache = null) {
    const raw = String(text || '');
    if (!raw) {
      return {
        status: 'EMPTY_PAYLOAD',
        expandedText: '',
        pointersFound: 0,
        pointersResolved: 0,
        missingCount: 0,
        corruptedCount: 0,
        integrityVerified: true,
        reportDigest: '0'.repeat(64)
      };
    }

    this.warmCache(customCache);

    let pointersFound = 0;
    let pointersResolved = 0;
    let missingCount = 0;
    let corruptedCount = 0;

    const expandedText = raw.replace(/<!-- AXION_REF: ([a-f0-9]{12}) -->/g, (match, hashKey) => {
      pointersFound++;

      if (!this.cache.has(hashKey)) {
        missingCount++;
        return match; // Preservar puntero intacto ante ausencia
      }

      const candidate = this.cache.get(hashKey);
      if (this.verifyBlockHash(candidate, hashKey)) {
        pointersResolved++;
        return candidate;
      } else {
        corruptedCount++;
        return match; // Rechazar inyección si el hash no coincide con el contenido
      }
    });

    const integrityVerified = missingCount === 0 && corruptedCount === 0;

    const payload = JSON.stringify({
      pointersFound,
      pointersResolved,
      missingCount,
      corruptedCount,
      integrityVerified,
      timestamp: new Date().toISOString()
    });

    const reportDigest = crypto.createHash('sha256').update(payload).digest('hex');

    return {
      status: 'EXPANSION_COMPLETED',
      reportType: 'SpeculativeExpansionReport_v1',
      expandedText,
      pointersFound,
      pointersResolved,
      missingCount,
      corruptedCount,
      integrityVerified,
      reportDigest
    };
  }
}

if (require.main === module) {
  const expander = new SpeculativeTokenExpander();

  const originalBlock = 'Política inmutable de seguridad: zero-trust y firmas Ed25519.';
  const hash12 = crypto.createHash('sha256').update(originalBlock).digest('hex').slice(0, 12);

  // Pre-calentar
  expander.warmCache({ [hash12]: originalBlock });

  const compacted = `Sección 1:\n<!-- AXION_REF: ${hash12} -->\nFin de sección.`;
  console.log('[Speculative Token Expander] Expandiendo punteros de contexto:\n');

  const report = expander.expandSpeculative(compacted);
  console.log(report.expandedText);
  console.log('\n--- INFORME DE EXPANSIÓN ---');
  console.log(JSON.stringify({
    pointersFound: report.pointersFound,
    pointersResolved: report.pointersResolved,
    integrityVerified: report.integrityVerified,
    reportDigest: report.reportDigest.slice(0, 16) + '...'
  }, null, 2));
}

module.exports = SpeculativeTokenExpander;
