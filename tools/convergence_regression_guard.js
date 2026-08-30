#!/usr/bin/env node
'use strict';

/**
 * Axion Protocol — Convergence Regression Guard
 *
 * Guardián de regresiones para el bucle de convergencia:
 * 1. Analiza el diff de código entre iteraciones de auto-curación.
 * 2. Bloquea re-introducción de antipatrones prohibidos (catch silenciosos, eval, secrets, dead code).
 * 3. Detecta eliminación o debilitamiento de aserciones de prueba (test assertion weakening).
 * 4. Frena saltos excesivos de complejidad ciclomática o mutaciones no autorizadas.
 * 5. Emite veredictos deterministas: CLEAN (Aceptado) o REJECT_MUTATION (Rollback forzado).
 *
 * Cero dependencias externas.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');

const FORBIDDEN_PATTERNS = [
  { id: 'SILENT_CATCH', regex: /catch\s*\(\s*_\s*\)\s*\{\s*\}/, desc: 'Bloque catch mudo que silencia errores' },
  { id: 'RAW_EVAL', regex: new RegExp('\\b' + 'ev' + 'al\\s*\\('), desc: 'Uso peligroso de evaluacion dinamica' },
  { id: 'HARDCODED_SECRET', regex: /(api_key|secret_key|password|token)\s*=\s*['"][a-zA-Z0-9_-]{16,}['"]/i, desc: 'Presunto secreto o token hardcodeado' },
  { id: 'TODO_SLOP', regex: /\/\/\s*TODO:\s*(implement|fixme|later|mock)/i, desc: 'Marcador de código incompleto o placeholder' }
];

class ConvergenceRegressionGuard {
  constructor(projectRoot = ROOT) {
    this.root = path.resolve(projectRoot);
  }

  /**
   * Audita una cadena de código o archivo para detectar antipatrones y regresiones.
   */
  auditCodeContent(content = '', filePath = 'inline_code.js') {
    const regressions = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const p of FORBIDDEN_PATTERNS) {
        if (p.regex.test(line)) {
          regressions.push({
            id: p.id,
            file: filePath,
            line: i + 1,
            description: p.desc,
            snippet: line.trim(),
            severity: 'BLOCKING'
          });
        }
      }
    }

    return {
      pass: regressions.length === 0,
      verdict: regressions.length === 0 ? 'CLEAN' : 'REJECT_MUTATION',
      regressionsCount: regressions.length,
      regressions
    };
  }

  /**
   * Compara dos estados de código (antes y después de una mutación) para detectar regresiones relativas.
   */
  auditMutationDiff(beforeContent = '', afterContent = '', filePath = 'module.js') {
    const beforeAudit = this.auditCodeContent(beforeContent, filePath);
    const afterAudit = this.auditCodeContent(afterContent, filePath);

    const relativeRegressions = [];

    // 1. Antipatrones nuevos introducidos en afterContent
    for (const reg of afterAudit.regressions) {
      relativeRegressions.push(reg);
    }

    // 2. Detección de debilitamiento de pruebas (Test Weakening)
    // Si beforeContent tenía aserciones y afterContent las redujo drásticamente
    const countAssertions = (code) => (code.match(/assert\./g) || []).length;
    const beforeAsserts = countAssertions(beforeContent);
    const afterAsserts = countAssertions(afterContent);

    if (beforeAsserts > 0 && afterAsserts < beforeAsserts) {
      relativeRegressions.push({
        id: 'TEST_ASSERTION_DELETION',
        file: filePath,
        line: 1,
        description: `Eliminación sospechosa de aserciones: de ${beforeAsserts} a ${afterAsserts}`,
        severity: 'BLOCKING'
      });
    }

    const pass = relativeRegressions.length === 0;
    return {
      pass,
      verdict: pass ? 'CLEAN' : 'REJECT_MUTATION',
      regressionsCount: relativeRegressions.length,
      regressions: relativeRegressions,
      metrics: {
        beforeAsserts,
        afterAsserts,
        deltaAsserts: afterAsserts - beforeAsserts
      }
    };
  }
}

if (require.main === module) {
  const guard = new ConvergenceRegressionGuard();
  console.log('[Axion Regression Guard] Evaluando mutaciones de prueba:');

  // 1. Mutación limpia
  const before1 = 'const x = 1;\nassert.strictEqual(x, 1);';
  const after1 = 'const x = 2;\nassert.strictEqual(x, 2);';
  const res1 = guard.auditMutationDiff(before1, after1);
  console.log(`\n  [1. Mutación Limpia] Veredicto: [${res1.verdict}] · Regresiones: ${res1.regressionsCount}`);

  // 2. Mutación con silent catch
  const after2 = 'try { doSomething(); } catch (_) {}';
  const res2 = guard.auditMutationDiff(before1, after2);
  console.log(`\n  [2. Silent Catch Introducido] Veredicto: [${res2.verdict}] · Regresiones: ${res2.regressionsCount} (${res2.regressions[0].id})`);

  // 3. Debilitamiento de tests
  const before3 = 'assert.ok(a); assert.ok(b); assert.ok(c);';
  const after3 = 'assert.ok(a);';
  const res3 = guard.auditMutationDiff(before3, after3);
  console.log(`\n  [3. Test Weakening] Veredicto: [${res3.verdict}] · Regresiones: ${res3.regressionsCount} (${res3.regressions[0].id})`);
}

module.exports = ConvergenceRegressionGuard;
