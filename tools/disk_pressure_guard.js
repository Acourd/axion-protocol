#!/usr/bin/env node
'use strict';

/**
 * Axion Protocol — Disk Pressure & I/O Latency Guard
 *
 * Sensor proactivo y protector de latencia de I/O para /drive y VibeGuard:
 * 1. Mide la latencia de travesía del sistema de archivos en milisegundos.
 * 2. Monitorea el volumen y conteo de archivos en .axion/ y sandboxes en scratch/.
 * 3. Si detecta cuellos de botella (latencia > 150ms o archivos > 1500), auto-compacta preventivamente.
 * 4. Restablece el rendimiento óptimo antes de ejecutar suites de prueba o escaneos estáticos.
 *
 * Cero dependencias externas.
 */

const fs = require('fs');
const path = require('path');
const WorkspaceDebloater = require('./workspace_debloater.js');
const AutoCompactingCheckpointEngine = require('./auto_compacting_checkpoint.js');

const ROOT = path.resolve(__dirname, '..');

const DEFAULT_THRESHOLDS = {
  maxTraverseLatencyMs: 300,
  maxAxionFiles: 3500,
  maxScratchSandboxes: 5
};

class DiskPressureGuard {
  constructor(projectRoot = ROOT, thresholds = {}) {
    this.root = path.resolve(projectRoot);
    this.thresholds = Object.assign({}, DEFAULT_THRESHOLDS, thresholds);
    this.axionDir = path.join(this.root, '.axion');
    this.scratchDir = path.join(this.root, 'scratch');
  }

  /**
   * Mide el tiempo de travesía y audita el estado de presión de almacenamiento.
   */
  measurePressure() {
    const t0 = Date.now();
    let axionFilesCount = 0;
    let axionBytes = 0;
    let scratchSandboxesCount = 0;

    // 1. Auditar .axion/
    if (fs.existsSync(this.axionDir)) {
      const stack = [this.axionDir];
      while (stack.length > 0) {
        const current = stack.pop();
        try {
          const entries = fs.readdirSync(current, { withFileTypes: true });
          for (const e of entries) {
            const full = path.join(current, e.name);
            if (e.isDirectory()) stack.push(full);
            else if (e.isFile()) {
              axionBytes += fs.statSync(full).size;
              axionFilesCount++;
            }
          }
        } catch (readErr) {
          // Ignorar
        }
      }
    }

    // 2. Auditar scratch/
    if (fs.existsSync(this.scratchDir)) {
      try {
        const scratchEntries = fs.readdirSync(this.scratchDir);
        scratchSandboxesCount = scratchEntries.filter(e => e.startsWith('test_') || e.endsWith('.db')).length;
      } catch (scErr) {
        // Ignorar
      }
    }

    const traverseLatencyMs = Date.now() - t0;
    const axionMb = parseFloat((axionBytes / (1024 * 1024)).toFixed(2));

    const issues = [];
    if (traverseLatencyMs > this.thresholds.maxTraverseLatencyMs) {
      issues.push(`Traverse Latency excesiva: ${traverseLatencyMs}ms > ${this.thresholds.maxTraverseLatencyMs}ms`);
    }
    if (axionFilesCount > this.thresholds.maxAxionFiles) {
      issues.push(`Conteo de archivos en .axion/ excesivo: ${axionFilesCount} > ${this.thresholds.maxAxionFiles}`);
    }
    if (scratchSandboxesCount > this.thresholds.maxScratchSandboxes) {
      issues.push(`Sandboxes residuales en scratch/: ${scratchSandboxesCount} > ${this.thresholds.maxScratchSandboxes}`);
    }

    const hasPressure = issues.length > 0;

    return {
      traverseLatencyMs,
      axionFilesCount,
      axionMb,
      scratchSandboxesCount,
      hasPressure,
      status: hasPressure ? 'PRESSURE_DETECTED' : 'OPTIMAL',
      issues
    };
  }

  /**
   * Asegura que el disco esté en estado óptimo; si hay presión, auto-cura preventivamente.
   */
  ensureOptimalState() {
    const initial = this.measurePressure();
    if (!initial.hasPressure) {
      return {
        actionTaken: false,
        status: 'OPTIMAL',
        metrics: initial
      };
    }

    // Auto-curación preventiva en caliente
    const debloater = new WorkspaceDebloater(this.root);
    const debloatRes = debloater.debloatAll(2, 5);

    const compacter = new AutoCompactingCheckpointEngine(this.root);
    compacter.compactInline();

    const post = this.measurePressure();

    return {
      actionTaken: true,
      status: post.hasPressure ? 'STILL_PRESSURE' : 'AUTO_HEALED',
      debloatResult: debloatRes,
      beforeMetrics: initial,
      afterMetrics: post
    };
  }
}

if (require.main === module) {
  const guard = new DiskPressureGuard();
  const args = process.argv.slice(2);

  if (args.includes('ensure') || args.length === 0) {
    console.log('[Axion Disk Pressure Guard] Auditando salud de I/O y asegurando estado óptimo...\n');
    const res = guard.ensureOptimalState();
    if (res.actionTaken) {
      console.log(`⚠️ Presión detectada. Auto-curación ejecutada con éxito:`);
      console.log(`  - Latencia Pre:  ${res.beforeMetrics.traverseLatencyMs} ms -> Post: ${res.afterMetrics.traverseLatencyMs} ms`);
      console.log(`  - Archivos Pre:  ${res.beforeMetrics.axionFilesCount} -> Post: ${res.afterMetrics.axionFilesCount}`);
      console.log(`  - Estado Actual: ${res.status}`);
    } else {
      console.log(`✓ Estado del disco: OPTIMAL`);
      console.log(`  - Latencia I/O:     ${res.metrics.traverseLatencyMs} ms`);
      console.log(`  - Archivos .axion/: ${res.metrics.axionFilesCount} (${res.metrics.axionMb} MB)`);
      console.log(`  - Sandboxes:        ${res.metrics.scratchSandboxesCount}`);
    }
  }
}

module.exports = DiskPressureGuard;
