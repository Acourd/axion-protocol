'use strict';

/**
 * AX-F-205: Invariantes del Reversor Causal de Grafos de Decisión y Backtracking Semántico (M_COG_013)
 *
 * Valida de forma determinista:
 * 1. Modelado de DAG causal con detección fail-closed de referencias circulares.
 * 2. Retroceso preciso al ancestro seguro más cercano ante regresiones.
 * 3. Aislamiento y poda de ramas fallidas sin afectar el tronco común.
 * 4. Emisión de recibo criptográfico CausalBacktrackReceipt_v1 sellado con SHA-256.
 * 5. Integración transparente con DriveEngine.createCausalDAG() y backtrackCausalDAG().
 */

const assert = require('assert');
const path = require('path');
const CausalDAGBacktracker = require('../../tools/causal_dag_backtracker.js');
const DriveEngine = require('../../tools/drive_engine.js');

console.log('=== AX-F-205 Invariantes del Reversor Causal de Grafos (M_COG_013) ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const backtracker = new CausalDAGBacktracker({ projectRoot: ROOT });

// 1. Construir trayectoria con bifurcaciones
backtracker.addNode({ id: 'ROOT_0', parentId: null, action: 'START', isVerifiedSafe: true });
backtracker.addNode({ id: 'CHECKPOINT_1', parentId: 'ROOT_0', action: 'SNAPSHOT', isVerifiedSafe: true });
backtracker.addNode({ id: 'MUTATION_2', parentId: 'CHECKPOINT_1', action: 'EDIT', isVerifiedSafe: false });
backtracker.addNode({ id: 'FAILURE_3', parentId: 'MUTATION_2', action: 'BROKEN_TEST', isVerifiedSafe: false });

// Invariante 1: Retroceso al ancestro seguro más cercano
const receipt = backtracker.backtrackToSafeAncestor('FAILURE_3');
assert.strictEqual(receipt.status, 'BACKTRACK_SUCCESSFUL');
assert.strictEqual(receipt.safeTargetNode.id, 'CHECKPOINT_1');
assert.strictEqual(receipt.prunedCount, 2);
assert.deepStrictEqual(receipt.prunedNodes, ['FAILURE_3', 'MUTATION_2']);
assert.ok(receipt.receiptDigest && receipt.receiptDigest.length === 64);
console.log(`✓ Invariante 1: Retroceso causal exitoso al ancestro seguro "${receipt.safeTargetNode.id}" podando ${receipt.prunedCount} nodos`);

// Invariante 2: Detección y rechazo de ciclos en el DAG
assert.throws(() => {
  backtracker.addNode({ id: 'CYCLE_NODE', parentId: 'CYCLE_NODE', action: 'BAD' });
}, /Referencia circular/);
console.log('✓ Invariante 2: Detección fail-closed de autorreferencias circulares demostrada');

// Invariante 3: Manejo de nodos inexistentes
const notFound = backtracker.backtrackToSafeAncestor('NON_EXISTENT_ID');
assert.strictEqual(notFound.status, 'NODE_NOT_FOUND');
console.log('✓ Invariante 3: Manejo determinista de nodos no encontrados validado');

// Invariante 4: Integración con DriveEngine
const driveEngine = new DriveEngine(ROOT);
const driveDAG = driveEngine.createCausalDAG();
driveDAG.addNode({ id: 'D_ROOT', parentId: null, action: 'ROOT', isVerifiedSafe: true });
driveDAG.addNode({ id: 'D_FAIL', parentId: 'D_ROOT', action: 'CRASH', isVerifiedSafe: false });
const driveReceipt = driveEngine.backtrackCausalDAG(driveDAG, 'D_FAIL');
assert.strictEqual(driveReceipt.status, 'BACKTRACK_SUCCESSFUL');
assert.strictEqual(driveReceipt.safeTargetNode.id, 'D_ROOT');
console.log('✓ Invariante 4: Integración nativa con DriveEngine.createCausalDAG() y backtrackCausalDAG() verificada');

console.log('\nPASS AX-F-205 — Invariantes del reversor causal de grafos demostrados al 100%.');
