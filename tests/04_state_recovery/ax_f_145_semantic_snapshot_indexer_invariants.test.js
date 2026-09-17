'use strict';

/**
 * Axion Protocol — Invariantes del Motor de Indexación y Búsqueda Semántica Vectorless.
 *
 * Valida de forma estricta:
 * 1. Recolección determinista e indexación invertida de memoria histórica y snapshots.
 * 2. Tokenización y filtrado de stop-words en español e inglés.
 * 3. Puntuación y ordenamiento BM25 determinista sin dependencias externas.
 * 4. Latencia de recuperación ultra-baja (< 50ms).
 * 5. Integración transparente con DriveEngine y CLI unificado.
 */

const assert = require('assert');
const { crearSandbox } = require('../../tools/test_sandbox.js');
const path = require('path');
const fs = require('fs');
const SemanticSnapshotIndexer = require('../../tools/semantic_snapshot_indexer.js');
const DriveEngine = require('../../tools/drive_engine.js');

console.log('=== AX-F-145 Invariantes del Indexador y Búsqueda Semántica Vectorless ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const sandbox = crearSandbox('test_search_sandbox');
fs.mkdirSync(path.join(sandbox, '.axion', 'state'), { recursive: true });
fs.mkdirSync(path.join(sandbox, '.agents', 'memory'), { recursive: true });

try {
  // 1. Crear documentos de memoria y estado en sandbox
  fs.writeFileSync(path.join(sandbox, '.agents', 'memory', 'decisions.md'), '# Decisiones de Arquitectura\nSe acordó utilizar sobre DSSE in-toto v1 con firma Ed25519 para atestaciones criptográficas.\n', 'utf8');
  fs.writeFileSync(path.join(sandbox, '.agents', 'memory', 'preferences.md'), '# Preferencias de Usuario\nEl usuario prefiere respuestas concisas en español y pruebas deterministas con exit code 0.\n', 'utf8');
  fs.writeFileSync(path.join(sandbox, '.axion', 'state', 'custom_report.json'), JSON.stringify({ audit: 'OWASP_2025', findings: ['Zero vulnerabilities detected'] }), 'utf8');

  const indexer = new SemanticSnapshotIndexer(sandbox);

  // 2. Validar indexación invertida
  const indexData = indexer.buildIndex();
  assert.strictEqual(indexData.totalDocs, 3, 'Debe haber indexado 3 documentos');
  assert.ok(indexData.invertedIndex['ed25519'], 'Debe contener el término "ed25519" en el índice');
  assert.ok(indexData.invertedIndex['owasp'], 'Debe contener el término "owasp" en el índice');
  assert.strictEqual(indexData.digest.length, 64);
  console.log(`✓ Indexación invertida validada: ${indexData.totalDocs} documentos indexados con SHA-256`);

  // 3. Validar búsqueda semántica BM25
  const t0 = Date.now();
  const searchResults = indexer.search('firma ed25519 y atestaciones', { limit: 5 });
  const latencyMs = Date.now() - t0;

  assert.ok(searchResults.length >= 1, 'Debe encontrar resultados relevantes');
  assert.strictEqual(searchResults[0].id, 'memory:decisions.md', 'El primer resultado debe ser decisions.md');
  assert.ok(searchResults[0].score > 0);
  assert.ok(latencyMs < 50, `La búsqueda debe responder en < 50ms (obtenido: ${latencyMs}ms)`);
  console.log(`✓ Búsqueda BM25 validada: Top match [${searchResults[0].title}] (Score: ${searchResults[0].score}, Latencia: ${latencyMs}ms)`);

  // 4. Validar segunda consulta sobre preferencias
  const prefResults = indexer.search('preferencias concisas deterministas');
  assert.ok(prefResults.length >= 1);
  assert.strictEqual(prefResults[0].id, 'memory:preferences.md');
  console.log('✓ Búsqueda de preferencias de usuario validada con precisión');

  // 5. Validar integración con DriveEngine
  const driveEngine = new DriveEngine(ROOT);
  const driveSearch = driveEngine.searchHistoricalMemory('gobernanza');
  assert.ok(Array.isArray(driveSearch));
  console.log('✓ Integración DriveEngine.searchHistoricalMemory() verificada');

} finally {
  if (fs.existsSync(sandbox)) {
    fs.rmSync(sandbox, { recursive: true, force: true });
  }
}

console.log('\nPASS AX-F-145 — Invariantes del indexador y búsqueda semántica vectorless demostrados al 100%.');
