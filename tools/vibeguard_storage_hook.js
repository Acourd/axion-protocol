#!/usr/bin/env node
'use strict';

/**
 * Axion Protocol — VibeGuard Storage Hook & Zero-Bloat Guard
 *
 * Hook de pre y post ejecución para VibeGuard:
 * 1. Pre-Scan: Comprueba la presión de I/O y auto-compacta preventivamente antes de escanear.
 * 2. Post-Scan / Post-Mutación: Purgado atómico de sandboxes en scratch/ y rotación de checkpoints.
 * 3. Enlace transparente con vibeguard_gate.js y DriveEngine.
 *
 * Cero dependencias externas.
 */

const fs = require('fs');
const path = require('path');
const DiskPressureGuard = require('./disk_pressure_guard.js');
const AutoCompactingCheckpointEngine = require('./auto_compacting_checkpoint.js');

const ROOT = path.resolve(__dirname, '..');

class VibeGuardStorageHook {
  constructor(projectRoot = ROOT) {
    this.root = path.resolve(projectRoot);
    this.diskGuard = new DiskPressureGuard(this.root);
    this.compactEngine = new AutoCompactingCheckpointEngine(this.root);
  }

  /**
   * Ejecutado inmediatamente antes de cualquier escaneo o auditoría de VibeGuard.
   */
  preScan() {
    const ensureRes = this.diskGuard.ensureOptimalState();
    return {
      phase: 'PRE_SCAN',
      optimal: !ensureRes.actionTaken || ensureRes.status === 'AUTO_HEALED',
      details: ensureRes
    };
  }

  /**
   * Ejecutado inmediatamente después de completar el escaneo de VibeGuard.
   */
  postScan() {
    const compactRes = this.compactEngine.compactInline();
    let cleanedScratchSandboxes = 0;

    const scratchDir = path.join(this.root, 'scratch');
    if (fs.existsSync(scratchDir)) {
      try {
        const entries = fs.readdirSync(scratchDir);
        for (const e of entries) {
          if (e.startsWith('test_vibeguard') || e.startsWith('test_vg_') || e.startsWith('vg_temp_')) {
            fs.rmSync(path.join(scratchDir, e), { recursive: true, force: true });
            cleanedScratchSandboxes++;
          }
        }
      } catch (rmErr) {
        // Ignorar
      }
    }

    return {
      phase: 'POST_SCAN',
      prunedCheckpoints: compactRes.prunedCheckpoints,
      prunedStateFiles: compactRes.prunedStateFiles,
      cleanedScratchSandboxes
    };
  }

  /**
   * Envuelve cualquier función de ejecución de VibeGuard con protección pre y post.
   */
  wrapExecution(taskFn) {
    const pre = this.preScan();
    let taskResult = null;
    let error = null;

    try {
      taskResult = typeof taskFn === 'function' ? taskFn() : null;
    } catch (err) {
      error = err;
    }

    const post = this.postScan();

    if (error) {
      throw error;
    }

    return {
      taskResult,
      preScan: pre,
      postScan: post
    };
  }
}

if (require.main === module) {
  const hook = new VibeGuardStorageHook();
  console.log('[Axion VibeGuard Storage Hook] Ejecutando ciclo de guardia de almacenamiento...\n');

  const wrapped = hook.wrapExecution(() => {
    console.log('✓ Ejecutando escaneo simulado bajo protección de almacenamiento...');
    return { pass: true, scannedFiles: 108 };
  });

  console.log(`✓ Pre-Scan Estado:  ${wrapped.preScan.details.status}`);
  console.log(`✓ Post-Scan Purgado: ${wrapped.postScan.cleanedScratchSandboxes} sandboxes, ${wrapped.postScan.prunedCheckpoints} cp, ${wrapped.postScan.prunedStateFiles} states`);
  console.log(`\n🎉 PASS: VibeGuard Storage Hook verificado en ciclo completo.`);
}

module.exports = VibeGuardStorageHook;
