#!/usr/bin/env node
'use strict';

/**
 * Axion Protocol — Semantic Snapshot Indexer & Vectorless Search Engine
 *
 * Motor de indexación y búsqueda semántica vectorless para /drive:
 * 1. Escanea e indexa snapshots de contexto (.axion/state/), checkpoints, instintos y memoria (.agents/memory/).
 * 2. Implementa un motor de recuperación BM25/TF-IDF determinista en JavaScript nativo (cero APIs externas ni dependencias).
 * 3. Provee consultas ultra-rápidas en milisegundos (< 10ms) sobre decisiones pasadas, mitigaciones y atestaciones.
 * 4. Persiste y actualiza el índice en .axion/state/search_index.json con sellado SHA-256.
 *
 * Cero dependencias externas.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');

const STOP_WORDS = new Set([
  'de', 'la', 'que', 'el', 'en', 'y', 'a', 'los', 'del', 'se', 'las', 'por', 'un', 'para', 'con', 'no', 'una',
  'su', 'al', 'lo', 'como', 'mas', 'pero', 'sus', 'le', 'ya', 'o', 'este', 'si', 'porque', 'esta', 'son', 'entre',
  'the', 'is', 'at', 'which', 'on', 'and', 'a', 'an', 'in', 'to', 'for', 'of', 'with', 'as', 'by', 'that', 'this'
]);

function tokenize(text) {
  if (!text || typeof text !== 'string') return [];
  return text
    .toLowerCase()
    .replace(/[^a-z0-9áéíóúñ]+/gi, ' ')
    .split(/\s+/)
    .filter(t => t.length > 2 && !STOP_WORDS.has(t));
}

class SemanticSnapshotIndexer {
  constructor(projectRoot = ROOT) {
    this.root = path.resolve(projectRoot);
    this.stateDir = path.join(this.root, '.axion', 'state');
    this.indexPath = path.join(this.stateDir, 'search_index.json');
    if (!fs.existsSync(this.stateDir)) {
      fs.mkdirSync(this.stateDir, { recursive: true });
    }
  }

  /**
   * Recolecta documentos históricos desde .axion/state/, .axion/checkpoints/ y .agents/memory/.
   */
  collectHistoricalDocuments() {
    const docs = [];

    // 1. Snapshots y Reportes en .axion/state/
    if (fs.existsSync(this.stateDir)) {
      const files = fs.readdirSync(this.stateDir);
      for (const f of files) {
        if (f.endsWith('.json') && f !== 'search_index.json') {
          const fullPath = path.join(this.stateDir, f);
          try {
            const raw = fs.readFileSync(fullPath, 'utf8');
            docs.push({
              id: `state:${f}`,
              type: 'STATE_DOCUMENT',
              title: f,
              path: path.relative(this.root, fullPath),
              content: raw
            });
          } catch (readErr) {
            // Ignora archivo corrupto o no legible temporalmente
          }
        }
      }
    }

    // 2. Memoria en .agents/memory/
    const memDir = path.join(this.root, '.agents', 'memory');
    if (fs.existsSync(memDir)) {
      const files = fs.readdirSync(memDir);
      for (const f of files) {
        if (f.endsWith('.md') || f.endsWith('.txt')) {
          const fullPath = path.join(memDir, f);
          try {
            const raw = fs.readFileSync(fullPath, 'utf8');
            docs.push({
              id: `memory:${f}`,
              type: 'MEMORY_DOCUMENT',
              title: `Memoria: ${f}`,
              path: path.relative(this.root, fullPath),
              content: raw
            });
          } catch (readErr) {
            // Ignora archivo de memoria no legible
          }
        }
      }
    }

    return docs;
  }

  /**
   * Construye el índice TF-IDF invertido.
   */
  buildIndex() {
    const docs = this.collectHistoricalDocuments();
    const invertedIndex = {};
    const docLengths = {};
    const docMetadata = {};

    let totalLength = 0;

    docs.forEach(doc => {
      const tokens = tokenize(doc.content);
      docLengths[doc.id] = tokens.length;
      totalLength += tokens.length;
      docMetadata[doc.id] = {
        id: doc.id,
        type: doc.type,
        title: doc.title,
        path: doc.path,
        tokensCount: tokens.length,
        snippet: doc.content.slice(0, 200).replace(/[\r\n]+/g, ' ')
      };

      const termFreqs = {};
      tokens.forEach(t => {
        termFreqs[t] = (termFreqs[t] || 0) + 1;
      });

      for (const [term, freq] of Object.entries(termFreqs)) {
        if (!invertedIndex[term]) {
          invertedIndex[term] = {};
        }
        invertedIndex[term][doc.id] = freq;
      }
    });

    const totalDocs = docs.length;
    const avgDocLength = totalDocs > 0 ? (totalLength / totalDocs) : 1;

    const indexData = {
      version: '1.0.0',
      updatedAt: new Date().toISOString(),
      totalDocs,
      avgDocLength,
      docLengths,
      docMetadata,
      invertedIndex
    };

    indexData.digest = crypto.createHash('sha256')
      .update(JSON.stringify(invertedIndex))
      .digest('hex');

    this.cachedIndex = indexData;
    fs.writeFileSync(this.indexPath, JSON.stringify(indexData, null, 2), 'utf8');
    return indexData;
  }

  loadIndex() {
    if (this.cachedIndex) {
      return this.cachedIndex;
    }
    if (fs.existsSync(this.indexPath)) {
      try {
        this.cachedIndex = JSON.parse(fs.readFileSync(this.indexPath, 'utf8'));
        return this.cachedIndex;
      } catch (readErr) {
        // Re-construir si está corrupto
      }
    }
    this.cachedIndex = this.buildIndex();
    return this.cachedIndex;
  }

  /**
   * Ejecuta búsqueda y puntuación BM25 determinista.
   */
  search(query = '', { limit = 5 } = {}) {
    const qTokens = tokenize(query);
    if (qTokens.length === 0) return [];

    const index = this.loadIndex();
    const scores = {};
    const k1 = 1.5;
    const b = 0.75;

    qTokens.forEach(term => {
      const docPostings = index.invertedIndex[term];
      if (!docPostings) return;

      const df = Object.keys(docPostings).length;
      const idf = Math.log(1 + (index.totalDocs - df + 0.5) / (df + 0.5));

      for (const [docId, freq] of Object.entries(docPostings)) {
        const docLen = index.docLengths[docId] || index.avgDocLength;
        const tf = (freq * (k1 + 1)) / (freq + k1 * (1 - b + b * (docLen / index.avgDocLength)));
        const termScore = idf * tf;
        scores[docId] = (scores[docId] || 0) + termScore;
      }
    });

    const results = Object.entries(scores)
      .map(([docId, score]) => ({
        id: docId,
        score: parseFloat(score.toFixed(3)),
        ...index.docMetadata[docId]
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return results;
  }
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const indexer = new SemanticSnapshotIndexer();

  if (args.includes('--reindex') || args.includes('index')) {
    console.log('[Axion Search Indexer] Re-construyendo índice semántico vectorless...');
    const indexData = indexer.buildIndex();
    console.log(`✓ Índice generado: ${indexData.totalDocs} documentos indexados (SHA-256: ${indexData.digest.slice(0, 16)}...)`);
  } else {
    const query = args.join(' ') || 'gobernanza y atestacion';
    console.log(`[Axion Search] Consultando memoria histórica para: "${query}"\n`);
    const results = indexer.search(query, { limit: 5 });

    if (results.length === 0) {
      console.log('  No se encontraron resultados coincidentes.');
    } else {
      results.forEach((r, idx) => {
        console.log(`  ${idx + 1}. [Score: ${r.score}] [${r.type}] ${r.title}`);
        console.log(`     Ruta: ${r.path}`);
        console.log(`     Snippet: ${r.snippet}...\n`);
      });
    }
  }
}

module.exports = SemanticSnapshotIndexer;
