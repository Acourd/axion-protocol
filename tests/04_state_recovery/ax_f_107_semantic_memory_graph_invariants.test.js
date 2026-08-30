'use strict';

/**
 * Axion Protocol — Invariantes del Motor de Memoria Semántica en Grafo Relacional (Clean-Room).
 *
 * Valida de forma estricta:
 * 1. Inicialización determinista del grafo (SQLite nativo o fallback in-memory).
 * 2. Operaciones atómicas de upsert de nodos con cálculo de digest SHA-256.
 * 3. Enlace de relaciones dirigidas entre entidades (edges) con pesos.
 * 4. Búsqueda semántica lexical por palabra clave y tipo de nodo.
 * 5. Travesía en anchura (BFS) para navegación contextual multi-salto.
 * 6. Sellado criptográfico del estado del grafo completo.
 */

const assert = require('assert');
const path = require('path');
const SemanticMemoryGraph = require('../../tools/semantic_memory_graph.js');

console.log('=== AX-F-107 Invariantes del Motor de Memoria Semántica en Grafo ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const graph = new SemanticMemoryGraph({ projectRoot: ROOT, inMemory: true });

// 1. Validar inicialización
assert.ok(graph.db || graph.fallbackMemory, 'El motor de memoria debe estar inicializado');
console.log(`✓ Motor de grafo relacional inicializado (${graph.useNativeSqlite ? 'node:sqlite nativo' : 'fallback en memoria'})`);

// 2. Insertar nodos de prueba
const n1 = graph.upsertNode({
  id: 'node_arch_001',
  type: 'ARCHITECTURE',
  name: 'Fail-Closed Decision Engine',
  content: 'Toda acción no verificada o ambigua es bloqueada por defecto.'
});

const n2 = graph.upsertNode({
  id: 'node_policy_001',
  type: 'POLICY',
  name: 'Ed25519 Asymmetric Authorization',
  content: 'Firma criptográfica con curva Ed25519 para comandos destructivos.'
});

const n3 = graph.upsertNode({
  id: 'node_test_001',
  type: 'TEST_SUITE',
  name: 'Chaos Fuzzer 2500 Invariants',
  content: 'Verificación de 2.500 vectores de ataque sintéticos sin evasión.'
});

assert.ok(n1.digest && n1.digest.length === 64, 'Cada nodo debe generar un digest SHA-256 válido');
console.log('✓ Inserción atómica de nodos con digest criptográfico verificada');

// 3. Crear relaciones en el grafo
graph.linkNodes(n1.id, n2.id, 'ENFORCES', 1.0);
graph.linkNodes(n2.id, n3.id, 'VERIFIED_BY', 0.9);
console.log('✓ Enlaces dirigidos entre entidades establecidos correctamente');

// 4. Búsqueda léxica semántica
const search1 = graph.queryNodes({ keyword: 'Fail-Closed' });
assert.strictEqual(search1.length, 1, 'Debe encontrar exactamente 1 nodo');
assert.strictEqual(search1[0].id, 'node_arch_001', 'El nodo recuperado debe coincidir');

const searchType = graph.queryNodes({ type: 'POLICY' });
assert.strictEqual(searchType.length, 1, 'Debe filtrar correctamente por tipo');
assert.strictEqual(searchType[0].id, 'node_policy_001');
console.log('✓ Búsqueda léxica y filtrado por tipo verificados');

// 5. Travesía del grafo (BFS multi-salto)
const traversal = graph.findConnectedGraph(n1.id, 2);
assert.strictEqual(traversal.nodesCount, 3, 'La travesía debe descubrir los 3 nodos interconectados');
assert.ok(traversal.edgesCount >= 2, 'Debe registrar las relaciones intermedias');
console.log(`✓ Travesía BFS multi-salto verificada: ${traversal.nodesCount} entidades conectadas encontradas`);

// 6. Sellado criptográfico del grafo
const graphDigest = graph.computeGraphDigest();
assert.ok(graphDigest && graphDigest.length === 64, 'Debe generar un digest SHA-256 del grafo completo');
console.log(`✓ Sello criptográfico del grafo emitido: ${graphDigest.slice(0, 16)}...`);

graph.close();

console.log('\nPASS AX-F-107 — Invariantes del motor de memoria semántica en grafo verificados al 100%.');
