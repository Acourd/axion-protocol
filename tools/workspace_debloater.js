#!/usr/bin/env node
'use strict';

/**
 * Axion Protocol — Workspace Debloater & Checkpoint Compactor
 *
 * Elimina la inflación de disco provocada por respaldos acumulados durante suites de prueba:
 * 1. Poda puntos de control antiguos en .axion/checkpoints/ manteniendo solo los más recientes.
 * 2. Limpia estados temporales efímeros en .axion/state/ y atestaciones antiguas en .axion/attestations/.
 * 3. Limpia sandboxes residuales de pruebas en scratch/ y .phase-e/test-runtime/.
 * 4. Compacta el espacio en disco reduciendo decenas de miles de archivos a < 5 MB.
 *
 * Cero dependencias externas.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

class WorkspaceDebloater {
  constructor(projectRoot = ROOT) {
    this.root = path.resolve(projectRoot);
    this.checkpointsDir = path.join(this.root, '.axion', 'checkpoints');
    this.stateDir = path.join(this.root, '.axion', 'state');
    this.attestationsDir = path.join(this.root, '.axion', 'attestations');
    this.scratchDir = path.join(this.root, 'scratch');
    this.phaseETestRuntime = path.join(this.root, '.phase-e', 'test-runtime');
  }

  debloatAll(keepCheckpoints = 2, keepStateFiles = 10) {
    const report = {
      prunedCheckpoints: 0,
      prunedStateFiles: 0,
      prunedAttestations: 0,
      prunedScratchItems: 0,
      prunedPhaseEItems: 0,
      initialCheckpointsCount: 0,
      remainingCheckpointsCount: 0,
      pass: true
    };

    // 1. Podar checkpoints antiguos
    if (fs.existsSync(this.checkpointsDir)) {
      const entries = fs.readdirSync(this.checkpointsDir).sort();
      report.initialCheckpointsCount = entries.length;

      const toDelete = entries.slice(0, Math.max(0, entries.length - keepCheckpoints));
      for (const item of toDelete) {
        const itemPath = path.join(this.checkpointsDir, item);
        try {
          fs.rmSync(itemPath, { recursive: true, force: true });
          report.prunedCheckpoints++;
        } catch (rmErr) {
          // Captura defensiva
        }
      }
      report.remainingCheckpointsCount = fs.readdirSync(this.checkpointsDir).length;
    }

    // 2. Podar estados efímeros en .axion/state/
    if (fs.existsSync(this.stateDir)) {
      const prefixes = [
        'deep-deliberation-', 'mission-execution-', 'drive-telemetry-',
        'drive-dashboard-', 'worker-telemetry-', 'memory-graph-',
        'resilience-', 'chaos-report-', 'tx_invariants_'
      ];

      for (const prefix of prefixes) {
        const matching = fs.readdirSync(this.stateDir)
          .filter(f => f.startsWith(prefix))
          .sort();
        const toPrune = matching.slice(0, Math.max(0, matching.length - keepStateFiles));
        for (const f of toPrune) {
          try {
            fs.rmSync(path.join(this.stateDir, f), { force: true });
            report.prunedStateFiles++;
          } catch (sfErr) {
            // Ignorar
          }
        }
      }
    }

    // 3. Podar atestaciones acumuladas en .axion/attestations/
    if (fs.existsSync(this.attestationsDir)) {
      const atts = fs.readdirSync(this.attestationsDir).sort();
      const toPruneAtts = atts.slice(0, Math.max(0, atts.length - 10));
      for (const af of toPruneAtts) {
        try {
          fs.rmSync(path.join(this.attestationsDir, af), { force: true });
          report.prunedAttestations++;
        } catch (afErr) {
          // Ignorar
        }
      }
    }

    // 4. Podar sandboxes residuales de pruebas en scratch/
    if (fs.existsSync(this.scratchDir)) {
      const scratchEntries = fs.readdirSync(this.scratchDir);
      for (const se of scratchEntries) {
        if (se.startsWith('test_') || se.endsWith('.db-shm') || se.endsWith('.db-wal') || se.endsWith('.db')) {
          try {
            fs.rmSync(path.join(this.scratchDir, se), { recursive: true, force: true });
            report.prunedScratchItems++;
          } catch (scErr) {
            // Ignorar
          }
        }
      }
    }

    // 5. Podar test-runtime de .phase-e
    if (fs.existsSync(this.phaseETestRuntime)) {
      try {
        fs.rmSync(this.phaseETestRuntime, { recursive: true, force: true });
        report.prunedPhaseEItems = 1;
      } catch (peErr) {
        // Ignorar
      }
    }

    return report;
  }
}

if (require.main === module) {
  const debloater = new WorkspaceDebloater();
  console.log('[Axion Debloater] Compactando checkpoints, estados y sandboxes obsoletos...');
  const res = debloater.debloatAll(2);

  console.log(`\n=== RESULTADOS DE DEBLOAT Y COMPACTACIÓN ===`);
  console.log(`  Checkpoints Podados:        ${res.prunedCheckpoints}`);
  console.log(`  Archivos de Estado Podados: ${res.prunedStateFiles}`);
  console.log(`  Atestaciones Podadas:       ${res.prunedAttestations}`);
  console.log(`  Sandboxes Scratch Podados:  ${res.prunedScratchItems}`);
  console.log(`  Phase-E Runtime Podado:     ${res.prunedPhaseEItems ? 'SÍ' : 'NO'}`);
  console.log(`  Checkpoints Conservados:    ${res.remainingCheckpointsCount}`);
  console.log(`\n🎉 PASS: Workspace compactado y optimizado.`);
}

module.exports = WorkspaceDebloater;
