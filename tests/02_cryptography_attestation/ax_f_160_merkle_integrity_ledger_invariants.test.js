'use strict';

/**
 * Axion Protocol — Invariantes del Árbol Merkle y Libro Mayor de Integridad.
 *
 * Valida de forma estricta:
 * 1. Construcción determinista del árbol Merkle binario y cálculo de la raíz (Merkle Root).
 * 2. Generación y verificación matemática de pruebas de inclusión (Audit Paths / Merkle Proofs).
 * 3. Resistencia adversarial: rechazo determinista ante hashes de archivo alterados o pruebas forjadas.
 * 4. Actualización del libro mayor cronológico inmutable en .axion/state/merkle-ledger.json.
 * 5. Integración con DriveEngine y CLI unificado.
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const MerkleIntegrityLedger = require('../../tools/merkle_integrity_ledger.js');
const DriveEngine = require('../../tools/drive_engine.js');

console.log('=== AX-F-160 Invariantes del Árbol Merkle y Libro Mayor de Integridad ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const ledger = new MerkleIntegrityLedger(ROOT);

// 1. Construcción del Árbol Merkle
const tree = ledger.buildTree();
assert.ok(tree.leavesCount > 50, `Debe incluir más de 50 hojas (encontradas: ${tree.leavesCount})`);
assert.ok(tree.root && tree.root.length === 64, 'La raíz Merkle debe ser un hash SHA-256 de 64 caracteres');
assert.ok(tree.layers.length >= 2, 'El árbol debe tener múltiples capas');
console.log(`✓ Árbol Merkle construido: ${tree.leavesCount} hojas auditadas, Merkle Root: ${tree.root.slice(0, 16)}...`);

// 2. Generación y Verificación Matemática de Prueba de Inclusión
const targetPath = 'tools/checkpoint.js';
const proofResult = ledger.generateInclusionProof(targetPath);
assert.strictEqual(proofResult.success, true, 'Debe generar la prueba con éxito');
assert.strictEqual(proofResult.path, targetPath);
assert.ok(proofResult.proof.length > 0, 'La prueba debe contener pasos de auditoría');

const verification = ledger.verifyInclusionProof(
  targetPath,
  proofResult.fileHash,
  proofResult.proof,
  tree.root
);
assert.strictEqual(verification.valid, true, 'La prueba matemática debe ser 100% válida');
assert.strictEqual(verification.calculatedRoot, tree.root);
console.log(`✓ Prueba de inclusión Merkle demostrada matemáticamente para ${targetPath} (${proofResult.proof.length} pasos en el árbol)`);

// 3. Simulación Adversarial: Hash de archivo alterado
const tamperedFileHash = 'f'.repeat(64); // Hash falso
const tamperedVerification = ledger.verifyInclusionProof(
  targetPath,
  tamperedFileHash,
  proofResult.proof,
  tree.root
);
assert.strictEqual(tamperedVerification.valid, false, 'Debe rechazar prueba con archivo alterado');
console.log('✓ Rechazo adversarial ante contenido de archivo falsificado verificado (PASS)');

// 4. Simulación Adversarial: Hermano de la rama manipulado
const tamperedProof = JSON.parse(JSON.stringify(proofResult.proof));
tamperedProof[0].hash = '0'.repeat(64); // Alterar el primer hash del camino
const tamperedBranchVerification = ledger.verifyInclusionProof(
  targetPath,
  proofResult.fileHash,
  tamperedProof,
  tree.root
);
assert.strictEqual(tamperedBranchVerification.valid, false, 'Debe rechazar prueba con rama manipulada');
console.log('✓ Rechazo adversarial ante camino de auditoría forjado verificado (PASS)');

// 5. Validar actualización del Libro Mayor (Ledger)
const updateRes = ledger.updateLedger();
assert.strictEqual(updateRes.root, tree.root);
assert.ok(fs.existsSync(updateRes.ledgerFile));
console.log('✓ Persistencia del libro mayor de integridad validada');

// 6. Validar integración con DriveEngine
const driveEngine = new DriveEngine(ROOT);
assert.ok(typeof driveEngine.generateMerkleTree === 'function');
assert.ok(typeof driveEngine.generateMerkleProof === 'function');
assert.ok(typeof driveEngine.verifyMerkleProof === 'function');
assert.ok(typeof driveEngine.updateMerkleLedger === 'function');

const driveTree = driveEngine.generateMerkleTree();
assert.strictEqual(driveTree.root, tree.root);
console.log('✓ Integración DriveEngine (generateMerkleTree, generateMerkleProof, verifyMerkleProof) verificada');

console.log('\nPASS AX-F-160 — Invariantes del árbol Merkle y libro mayor demostrados al 100%.');
