#!/usr/bin/env node
'use strict';

/**
 * Axion Protocol — Convergence Drift Analyzer & Metacognitive Loop Guardian (M_COG_016)
 *
 * Analizador de deriva de convergencia en bucle metacognitivo:
 * 1. Monitorea la tasa de convergencia empírica hacia el objetivo (progreso de tests y aserciones).
 * 2. Detecta ciclos degenerativos de estancamiento (stagnation) u oscilaciones circulares en el código.
 * 3. Aplica salvaguarda fail-closed (HALT_STAGNATION_LOOP) ante 3 iteraciones sin progreso neto.
 * 4. Emite un certificado formal ConvergenceDriftCertificate sellado con SHA-256.
 *
 * Cero dependencias externas.
 */

const crypto = require('crypto');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

class ConvergenceDriftAnalyzer {
  constructor(options = {}) {
    this.root = path.resolve(options.projectRoot || ROOT);
    this.stagnationLimit = Math.max(2, Math.min(options.stagnationLimit || 3, 10));
    this.history = [];
  }

  /**
   * Registra un paso de ejecución en la trayectoria del bucle.
   */
  recordStep(step = {}) {
    const record = {
      stepIndex: Number(step.stepIndex) || (this.history.length + 1),
      testsPassed: Math.max(0, Number(step.testsPassed) || 0),
      testsTotal: Math.max(1, Number(step.testsTotal) || 1),
      filesTouched: Array.isArray(step.filesTouched) ? step.filesTouched : [],
      tokenCost: Math.max(0, Number(step.tokenCost) || 0),
      timestamp: new Date().toISOString()
    };

    this.history.push(record);
    return record;
  }

  /**
   * Analiza la trayectoria acumulada y dictamina el veredicto de convergencia.
   */
  analyzeConvergence(options = {}) {
    if (this.history.length < 2) {
      return {
        status: 'INSUFFICIENT_HISTORY',
        verdict: 'CONTINUE_MONITORING',
        isAllowed: true,
        stepsRecorded: this.history.length
      };
    }

    const authorizedScope = Array.isArray(options.authorizedFiles) ? new Set(options.authorizedFiles) : null;
    let driftViolations = 0;
    let totalFilesTouched = 0;

    for (const h of this.history) {
      for (const f of h.filesTouched) {
        totalFilesTouched++;
        if (authorizedScope && !authorizedScope.has(f)) {
          driftViolations++;
        }
      }
    }

    const driftScore = totalFilesTouched > 0 ? Number((driftViolations / totalFilesTouched).toFixed(3)) : 0.0;

    // Detección de estancamiento en la ventana más reciente
    let isStagnated = false;
    if (this.history.length >= this.stagnationLimit) {
      const recent = this.history.slice(-this.stagnationLimit);
      const baselinePassed = recent[0].testsPassed;
      const allSameOrWorse = recent.every((s) => s.testsPassed <= baselinePassed);
      const lastPassed = recent[recent.length - 1].testsPassed;
      const lastTotal = recent[recent.length - 1].testsTotal;

      // Solo estancado si no está al 100% de éxito
      if (allSameOrWorse && lastPassed < lastTotal) {
        isStagnated = true;
      }
    }

    // Derivación de veredicto
    let verdict = 'CONVERGING_HEALTHY';
    let isAllowed = true;

    if (isStagnated) {
      verdict = 'HALT_STAGNATION_LOOP';
      isAllowed = false;
    } else if (driftScore > 0.40) {
      verdict = 'HALT_SCOPE_DRIFT';
      isAllowed = false;
    }

    const payload = JSON.stringify({
      stepsRecorded: this.history.length,
      driftScore,
      isStagnated,
      verdict,
      timestamp: new Date().toISOString()
    });

    const certificateDigest = crypto.createHash('sha256').update(payload).digest('hex');

    return {
      certificateType: 'ConvergenceDriftCertificate_v1',
      stepsRecorded: this.history.length,
      driftScore,
      isStagnated,
      verdict,
      isAllowed,
      certificateDigest
    };
  }
}

if (require.main === module) {
  const analyzer = new ConvergenceDriftAnalyzer();

  console.log('[Convergence Drift Analyzer] Simulando trayectoria saludable:\n');
  analyzer.recordStep({ stepIndex: 1, testsPassed: 10, testsTotal: 20 });
  analyzer.recordStep({ stepIndex: 2, testsPassed: 15, testsTotal: 20 });
  analyzer.recordStep({ stepIndex: 3, testsPassed: 20, testsTotal: 20 });
  console.log(analyzer.analyzeConvergence());

  console.log('\n[Convergence Drift Analyzer] Simulando bucle de estancamiento degenerativo:\n');
  const stagnationAnalyzer = new ConvergenceDriftAnalyzer();
  stagnationAnalyzer.recordStep({ stepIndex: 1, testsPassed: 5, testsTotal: 10 });
  stagnationAnalyzer.recordStep({ stepIndex: 2, testsPassed: 5, testsTotal: 10 });
  stagnationAnalyzer.recordStep({ stepIndex: 3, testsPassed: 5, testsTotal: 10 });
  console.log(stagnationAnalyzer.analyzeConvergence());
}

module.exports = ConvergenceDriftAnalyzer;
