#!/usr/bin/env node
'use strict';

/**
 * Axion Protocol — Merkle Root Proof Tree & Integrity Ledger
 *
 * Estructura criptográfica de árbol Merkle y libro mayor de integridad:
 * 1. Construye árboles Merkle binarios deterministas sobre los archivos gobernados.
 * 2. Emite pruebas de inclusión criptográfica individuales (Audit Paths / Merkle Proofs).
 * 3. Valida matemáticamente la pertenencia de un archivo a la raíz Merkle sin revelar el repo completo.
 * 4. Mantiene un libro mayor inmutable de raíces en .axion/state/merkle-ledger.json.
 *
 * Cero dependencias externas.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');

class MerkleIntegrityLedger {
  constructor(projectRoot = ROOT) {
    this.root = path.resolve(projectRoot);
    this.stateDir = path.join(this.root, '.axion', 'state');
    this.ledgerFile = path.join(this.stateDir, 'merkle-ledger.json');
    this.ensureStateDir();
  }

  ensureStateDir() {
    if (!fs.existsSync(this.stateDir)) {
      fs.mkdirSync(this.stateDir, { recursive: true });
    }
  }

  sha256(data) {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  hashPair(left, right) {
    return this.sha256(left + right);
  }

  /**
   * Recolecta las hojas (archivos) gobernadas del proyecto.
   */
  collectLeaves() {
    const leaves = [];
    const scannedDirs = ['tools', 'bin', 'adapters', 'policies', 'schemas'];

    for (const d of scannedDirs) {
      const fullDir = path.join(this.root, d);
      if (!fs.existsSync(fullDir)) continue;

      const entries = fs.readdirSync(fullDir, { withFileTypes: true });
      for (const e of entries) {
        if (e.isFile()) {
          const filePath = path.join(fullDir, e.name);
          const relPath = path.relative(this.root, filePath).split(path.sep).join('/');
          try {
            const content = fs.readFileSync(filePath);
            const hash = this.sha256(content);
            leaves.push({
              path: relPath,
              hash,
              leafHash: this.sha256(`${relPath}:${hash}`)
            });
          } catch (readErr) {
            console.warn(`[MerkleIntegrityLedger] Advertencia al leer hoja ${relPath}: ${readErr.message}`);
          }
        }
      }
    }

    leaves.sort((a, b) => a.path.localeCompare(b.path));
    return leaves;
  }

  /**
   * Construye el árbol Merkle completo y retorna la raíz y capas intermedias.
   */
  buildTree(leaves = null) {
    const leafNodes = leaves || this.collectLeaves();
    if (leafNodes.length === 0) {
      return {
        root: this.sha256('EMPTY_MERKLE_TREE'),
        leavesCount: 0,
        layers: [[]],
        leaves: []
      };
    }

    let currentLayer = leafNodes.map(l => l.leafHash);
    const layers = [currentLayer.slice()];

    while (currentLayer.length > 1) {
      const nextLayer = [];
      for (let i = 0; i < currentLayer.length; i += 2) {
        const left = currentLayer[i];
        const right = (i + 1 < currentLayer.length) ? currentLayer[i + 1] : left;
        nextLayer.push(this.hashPair(left, right));
      }
      layers.push(nextLayer.slice());
      currentLayer = nextLayer;
    }

    const root = currentLayer[0];

    return {
      root,
      leavesCount: leafNodes.length,
      layers,
      leaves: leafNodes
    };
  }

  /**
   * Genera una prueba de inclusión Merkle (Audit Path) para un archivo.
   */
  generateInclusionProof(targetRelPath) {
    const normalizedPath = targetRelPath.split(path.sep).join('/');
    const tree = this.buildTree();
    const leafIndex = tree.leaves.findIndex(l => l.path === normalizedPath);

    if (leafIndex === -1) {
      return {
        success: false,
        error: `Archivo no encontrado en el árbol: ${normalizedPath}`
      };
    }

    const targetLeaf = tree.leaves[leafIndex];
    const proof = [];
    let currentIndex = leafIndex;

    for (let layerIndex = 0; layerIndex < tree.layers.length - 1; layerIndex++) {
      const layer = tree.layers[layerIndex];
      const isRightSibling = currentIndex % 2 === 1;
      const siblingIndex = isRightSibling ? currentIndex - 1 : currentIndex + 1;

      if (siblingIndex < layer.length) {
        proof.push({
          position: isRightSibling ? 'left' : 'right',
          hash: layer[siblingIndex]
        });
      } else {
        // Impar sin hermano, se duplicó a sí mismo
        proof.push({
          position: 'right',
          hash: layer[currentIndex]
        });
      }

      currentIndex = Math.floor(currentIndex / 2);
    }

    return {
      success: true,
      path: normalizedPath,
      fileHash: targetLeaf.hash,
      leafHash: targetLeaf.leafHash,
      merkleRoot: tree.root,
      leavesCount: tree.leavesCount,
      proof
    };
  }

  /**
   * Verifica matemáticamente una prueba de inclusión contra la raíz Merkle.
   */
  verifyInclusionProof(relPath, fileHash, proof, expectedRoot) {
    const normalizedPath = relPath.split(path.sep).join('/');
    let currentHash = this.sha256(`${normalizedPath}:${fileHash}`);

    for (const step of proof) {
      if (step.position === 'left') {
        currentHash = this.hashPair(step.hash, currentHash);
      } else {
        currentHash = this.hashPair(currentHash, step.hash);
      }
    }

    const matches = currentHash === expectedRoot;

    return {
      valid: matches,
      calculatedRoot: currentHash,
      expectedRoot,
      proofLength: proof.length
    };
  }

  /**
   * Actualiza el libro mayor de integridad inmutable.
   */
  updateLedger() {
    const tree = this.buildTree();
    let history = [];

    if (fs.existsSync(this.ledgerFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(this.ledgerFile, 'utf8'));
        history = data.history || [];
      } catch (parseErr) {
        console.warn(`[MerkleIntegrityLedger] Advertencia al leer historial del libro mayor: ${parseErr.message}`);
      }
    }

    const prevRoot = history.length > 0 ? history[history.length - 1].root : null;
    const entry = {
      timestamp: new Date().toISOString(),
      leavesCount: tree.leavesCount,
      root: tree.root,
      prevRoot
    };

    history.push(entry);

    const payload = {
      updatedAt: new Date().toISOString(),
      currentRoot: tree.root,
      totalEntries: history.length,
      history
    };

    fs.writeFileSync(this.ledgerFile, JSON.stringify(payload, null, 2), 'utf8');

    return {
      root: tree.root,
      leavesCount: tree.leavesCount,
      ledgerFile: this.ledgerFile
    };
  }
}

if (require.main === module) {
  const ledger = new MerkleIntegrityLedger();
  console.log('[Axion Merkle Ledger] Construyendo árbol Merkle y libro mayor...\n');

  const tree = ledger.buildTree();
  console.log(`✓ Árbol Merkle construido sobre ${tree.leavesCount} archivos gobernados.`);
  console.log(`  Merkle Root: ${tree.root}\n`);

  const samplePath = 'tools/checkpoint.js';
  const proof = ledger.generateInclusionProof(samplePath);
  console.log(`✓ Prueba de inclusión generada para ${samplePath} (${proof.proof.length} pasos en el audit path)`);

  const verification = ledger.verifyInclusionProof(samplePath, proof.fileHash, proof.proof, tree.root);
  console.log(`✓ Verificación matemática de inclusión: ${verification.valid ? 'PASS (100% Criptográficamente Válida)' : 'FAIL'}`);

  const updateRes = ledger.updateLedger();
  console.log(`✓ Libro mayor actualizado en: ${updateRes.ledgerFile}\n`);
}

module.exports = MerkleIntegrityLedger;
