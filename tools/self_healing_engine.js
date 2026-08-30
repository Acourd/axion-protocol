#!/usr/bin/env node
'use strict';

/**
 * Axion Protocol — Autonomous Self-Healing & Backtracking Engine
 *
 * Provee mecanismos deterministas de auto-curación y recuperación en caliente:
 * 1. Monitorea transacciones de mutación de código en el bucle autónomo.
 * 2. Si se detecta una corrupción, excepción sintáctica o fallo de pruebas, intercepta el fallo.
 * 3. Dispara la restauración atómica desde el último punto de control verificado SHA-256.
 * 4. Valida por comparación de digests que el estado del árbol de archivos fue restaurado al 100%.
 *
 * Cero dependencias externas.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { crear: crearCheckpoint, restaurar: restaurarCheckpoint } = require('./checkpoint.js');

const ROOT = path.resolve(__dirname, '..');

class SelfHealingEngine {
  constructor(projectRoot = ROOT) {
    this.root = path.resolve(projectRoot);
    this.stateDir = path.join(this.root, '.axion', 'state');
    if (!fs.existsSync(this.stateDir)) {
      fs.mkdirSync(this.stateDir, { recursive: true });
    }
  }

  /**
   * Ejecuta una operación riesgosa o mutación con auto-curación determinista.
   */
  executeWithSelfHealing(mutationFn, options = {}) {
    const label = options.label || `self-healing-${Date.now()}`;
    const manifest = crearCheckpoint(this.root, { etiqueta: label });

    if (!manifest || !manifest.checkpointId) {
      return {
        ok: false,
        healed: false,
        reason: 'CHECKPOINT_CREATION_FAILED'
      };
    }

    const preManifestHash = manifest.digest;

    try {
      // Ejecutar la mutación
      const mutationResult = mutationFn();

      // Si la mutación declaró fallo explícito o devolvió un resultado con error
      if (mutationResult && mutationResult.shouldFail) {
        throw new Error(mutationResult.errorMessage || 'Explicit mutation failure triggered');
      }

      return {
        ok: true,
        healed: false,
        checkpointHash: preManifestHash,
        result: mutationResult
      };
    } catch (err) {
      // Interceptado: disparar auto-curación determinista con prune
      const restoreRes = restaurarCheckpoint(this.root, manifest.checkpointId, { prune: true });

      if (!restoreRes || !restoreRes.pass) {
        return {
          ok: false,
          healed: false,
          reason: 'CRITICAL_HEALING_RESTORE_FAILED',
          originalError: err.message,
          restoreError: restoreRes ? restoreRes.status : 'UNKNOWN'
        };
      }

      // Validar que el estado quedó restaurado
      const postManifest = crearCheckpoint(this.root, { etiqueta: `post-heal-check-${Date.now()}` });
      const postManifestHash = postManifest ? postManifest.digest : null;

      return {
        ok: false,
        healed: true,
        originalError: err.message,
        restoredCheckpointId: manifest.checkpointId,
        preManifestHash,
        postManifestHash,
        hashesMatch: preManifestHash === postManifestHash
      };
    }
  }
}

if (require.main === module) {
  const engine = new SelfHealingEngine();
  console.log('[Axion Self-Healing] Ejecutando simulación de fallo e inyección de corrupción...');

  const res = engine.executeWithSelfHealing(() => {
    // Simular corrupción
    return { shouldFail: true, errorMessage: 'Injected corrupt AST syntax node' };
  });

  console.log(`[Axion Self-Healing] Resultado: Healed=${res.healed}, Match=${res.hashesMatch}`);
}

module.exports = SelfHealingEngine;
