#!/usr/bin/env node
'use strict';

/**
 * Axion Protocol — Adaptive Convergence Loop & AST Feedback Engine
 *
 * Implementación Clean-Room del patrón de Bucle de Convergencia:
 * 1. Ejecuta tareas y suites de verificación en bucle cerrado.
 * 2. Si se detecta un fallo, analiza el stacktrace y extrae aserciones rotas e invariantes comprometidos.
 * 3. Genera un consejo de corrección estructurado (CorrectionAdvice) para guiar la auto-curación.
 * 4. Si la suite no converge tras el límite máximo de intentos (por defecto 3), ejecuta rollback determinista.
 *
 * Cero dependencias externas.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { crear: crearCheckpoint, restaurar: restaurarCheckpoint } = require('./checkpoint.js');

const ROOT = path.resolve(__dirname, '..');

class ConvergenceEngine {
  constructor(projectRoot = ROOT) {
    this.root = path.resolve(projectRoot);
    this.stateDir = path.join(this.root, '.axion', 'state');
    this.ensureStateDir();
  }

  ensureStateDir() {
    if (!fs.existsSync(this.stateDir)) {
      fs.mkdirSync(this.stateDir, { recursive: true });
    }
  }

  /**
   * Audita una mutación de código para evitar la re-introducción de regresiones.
   */
  auditRegressions(beforeCode, afterCode, filePath) {
    const ConvergenceRegressionGuard = require('./convergence_regression_guard.js');
    const guard = new ConvergenceRegressionGuard(this.root);
    return guard.auditMutationDiff(beforeCode, afterCode, filePath);
  }

  /**
   * Analiza la salida de un fallo de pruebas y extrae los detalles estructurales del error.
   */
  analyzeFailure(rawOutput = '') {
    if (!rawOutput || typeof rawOutput !== 'string') {
      return {
        hasFailure: false,
        failures: [],
        summary: 'Salida limpia sin fallos detectados.'
      };
    }

    const failures = [];

    // Detectar fallos en formato run_all (FAIL <suite> (salida 1))
    const failMatches = rawOutput.matchAll(/FAIL\s+([a-zA-Z0-9_\-\.\/]+)\s+\(salida\s+(\d+)\)/g);
    for (const m of failMatches) {
      failures.push({
        suite: m[1],
        exitCode: parseInt(m[2], 10),
        type: 'SUITE_FAILURE'
      });
    }

    // Detectar errores de aserción (ERR_ASSERTION)
    const assertionMatch = rawOutput.match(/code:\s*'ERR_ASSERTION'[\s\S]*?actual:\s*([^\n]+)[\s\S]*?expected:\s*([^\n]+)/);
    let assertionDetails = null;
    if (assertionMatch) {
      assertionDetails = {
        actual: assertionMatch[1].trim(),
        expected: assertionMatch[2].trim()
      };
    }

    // Detectar errores de sintaxis o TypeError
    const typeErrorMatch = rawOutput.match(/(TypeError|ReferenceError|SyntaxError):\s*([^\n]+)/);
    let errorDetails = null;
    if (typeErrorMatch) {
      errorDetails = {
        errorType: typeErrorMatch[1],
        message: typeErrorMatch[2].trim()
      };
    }

    return {
      hasFailure: failures.length > 0 || Boolean(assertionDetails) || Boolean(errorDetails),
      failuresCount: failures.length,
      failures,
      assertionDetails,
      errorDetails,
      rawSnippet: rawOutput.slice(0, 1000)
    };
  }

  /**
   * Genera el consejo de corrección estructurado (CorrectionAdvice).
   */
  generateCorrectionAdvice(analysis) {
    if (!analysis || !analysis.hasFailure) {
      return {
        actionRequired: false,
        advice: 'Todo en orden. No se requiere intervención.'
      };
    }

    const adviceItems = [];

    if (analysis.assertionDetails) {
      adviceItems.push(`Aserción rota: Se esperaba [${analysis.assertionDetails.expected}] pero se obtuvo [${analysis.assertionDetails.actual}]. Ajustar valor o sincronizar invariante.`);
    }

    if (analysis.errorDetails) {
      adviceItems.push(`${analysis.errorDetails.errorType}: ${analysis.errorDetails.message}. Verificar exportaciones de módulos y firmas de funciones.`);
    }

    if (analysis.failures.length > 0) {
      const suites = analysis.failures.map(f => f.suite).join(', ');
      adviceItems.push(`Suites en rojo: ${suites}. Revisar dependencias de prueba.`);
    }

    return {
      actionRequired: true,
      adviceList: adviceItems,
      summary: adviceItems.join(' | ')
    };
  }

  /**
   * Ejecuta un ciclo de convergencia adaptativo con límite de reintentos y rollback automático.
   */
  runConvergenceCycle(taskFn, verifyFn, options = {}) {
    const maxIterations = options.maxIterations || 3;
    const autoRollback = options.autoRollback !== false;
    let checkpointId = null;
    const cycleRecord = {
      iterations: 0,
      maxIterations,
      converged: false,
      checkpointId: null,
      history: []
    };

    // Sellar checkpoint de seguridad previo
    if (typeof crearCheckpoint === 'function') {
      try {
        const cp = crearCheckpoint(this.root, 'pre-convergence-cycle');
        checkpointId = cp ? cp.checkpointId : null;
        cycleRecord.checkpointId = checkpointId;
      } catch (cpErr) {
        cycleRecord.checkpointError = cpErr.message;
      }
    }

    let lastAdvice = null;

    while (cycleRecord.iterations < maxIterations) {
      cycleRecord.iterations++;

      // 1. Ejecutar mutación / tarea con el consejo de la iteración previa
      let taskResult = null;
      try {
        taskResult = typeof taskFn === 'function' ? taskFn(cycleRecord.iterations, lastAdvice) : { pass: true };
      } catch (err) {
        taskResult = { pass: false, error: err.message };
      }

      // 2. Ejecutar verificación
      let verifyResult = null;
      try {
        verifyResult = typeof verifyFn === 'function' ? verifyFn(cycleRecord.iterations) : { pass: true, output: '' };
      } catch (err) {
        verifyResult = { pass: false, output: err.message };
      }

      const isPass = Boolean(taskResult && taskResult.pass && verifyResult && verifyResult.pass);

      if (isPass) {
        cycleRecord.converged = true;
        cycleRecord.history.push({
          iteration: cycleRecord.iterations,
          status: 'CONVERGED_PASS',
          timestamp: new Date().toISOString()
        });
        break;
      }

      // 3. Analizar fallo y generar consejo para el siguiente intento
      const failureAnalysis = this.analyzeFailure(verifyResult.output || (taskResult.error ? taskResult.error : ''));
      lastAdvice = this.generateCorrectionAdvice(failureAnalysis);

      cycleRecord.history.push({
        iteration: cycleRecord.iterations,
        status: 'FAILED_RETRYING',
        failureAnalysis,
        correctionAdvice: lastAdvice,
        timestamp: new Date().toISOString()
      });
    }

    // Si no convergió y autoRollback está activo, restaurar el estado original
    if (!cycleRecord.converged && autoRollback && checkpointId && typeof restaurarCheckpoint === 'function') {
      try {
        restaurarCheckpoint(this.root, checkpointId);
        cycleRecord.rollbackExecuted = true;
      } catch (rErr) {
        cycleRecord.rollbackError = rErr.message;
      }
    }

    // Persistir registro de convergencia
    const digest = crypto.createHash('sha256').update(JSON.stringify(cycleRecord)).digest('hex').slice(0, 16);
    const logPath = path.join(this.stateDir, `convergence-history-${digest}.json`);
    fs.writeFileSync(logPath, JSON.stringify(cycleRecord, null, 2), 'utf8');
    cycleRecord.logPath = logPath;

    return cycleRecord;
  }
}

if (require.main === module) {
  const engine = new ConvergenceEngine();
  console.log('[Axion Convergence Engine] Verificando análisis de fallos:');
  const mockFail = 'FAIL 01_governance_preflight/test_sample (salida 1)\ncode: \'ERR_ASSERTION\'\nactual: false\nexpected: true';
  const analysis = engine.analyzeFailure(mockFail);
  const advice = engine.generateCorrectionAdvice(analysis);
  console.log('  Análisis:   ', analysis.failuresCount, 'fallos detectados');
  console.log('  Consejo:    ', advice.summary);
}

module.exports = ConvergenceEngine;
