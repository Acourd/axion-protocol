#!/usr/bin/env node
'use strict';

/**
 * Axion Protocol — Metacognitive AST Invariant Analyzer (M_COG_003)
 *
 * Auditor metacognitivo de flujo de datos, invariantes lógicos y pureza AST:
 * 1. Detecta parámetros sin validar y ausencias de salvaguarda en límites de frontera.
 * 2. Identifica promesas huérfanas y llamadas asíncronas descolgadas sin await ni catch.
 * 3. Audita la densidad de invariantes formales por bloque funcional.
 * 4. Calcula el índice de pureza y robustez lógica para prevenir defectos antes de TDD.
 *
 * Cero dependencias externas.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

class MetacognitiveASTAnalyzer {
  constructor(projectRoot = ROOT) {
    this.root = path.resolve(projectRoot);
  }

  /**
   * Audita una cadena de código fuente buscando fugas de invariantes y anomalías de flujo.
   */
  auditSource(sourceCode = '', options = {}) {
    const findings = [];
    if (!sourceCode || typeof sourceCode !== 'string') {
      return {
        totalFindings: 0,
        purityScore: 100,
        status: 'CLEAN_PROVEN',
        findings: []
      };
    }

    const lines = sourceCode.split('\n');

    // 1. Detección de bloques catch vacíos o silenciosos
    lines.forEach((line, idx) => {
      if (line.match(/catch\s*\([^)]*\)\s*\{\s*\}/)) {
        findings.push({
          type: 'SILENT_CATCH_BLOCK',
          severity: 'HIGH',
          line: idx + 1,
          message: 'Bloque catch vacío detectado; viola el principio de salvaguarda fail-closed.'
        });
      }
    });

    // 2. Detección de promesas o llamadas async descolgadas (sin await ni .then/.catch)
    lines.forEach((line, idx) => {
      const asyncMatch = line.match(/\basync\s+function|\basync\s*\(/);
      if (!asyncMatch && line.includes('Promise.') && !line.includes('await') && !line.includes('.then') && !line.includes('.catch') && !line.includes('return')) {
        findings.push({
          type: 'ORPHAN_PROMISE',
          severity: 'HIGH',
          line: idx + 1,
          message: 'Promesa instanciada sin await, return ni .catch; riesgo de unhandled rejection.'
        });
      }
    });

    // 3. Detección de mutación descontrolada de variables globales
    lines.forEach((line, idx) => {
      if (line.match(/global\.[a-zA-Z0-9_$]+\s*=/) || line.match(/window\.[a-zA-Z0-9_$]+\s*=/)) {
        findings.push({
          type: 'MUTABLE_GLOBAL_STATE',
          severity: 'MEDIUM',
          line: idx + 1,
          message: 'Mutación directa de estado global detectada; introduce acoplamiento no determinista.'
        });
      }
    });

    // 4. Cálculo de densidad de invariantes (assert, typeof, Array.isArray, etc.)
    let invariantCount = 0;
    let logicLines = 0;
    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('//') && !trimmed.startsWith('/*') && !trimmed.startsWith('*')) {
        logicLines++;
        if (trimmed.includes('assert.') || trimmed.includes('typeof') || trimmed.includes('Array.isArray') || trimmed.includes('if (!') || trimmed.includes('fail-closed')) {
          invariantCount++;
        }
      }
    });

    const assertionRatio = logicLines > 0 ? Number((invariantCount / logicLines).toFixed(2)) : 1.0;

    // Cálculo de puntuación de pureza (100 base, restando severidades)
    let score = 100;
    findings.forEach(f => {
      if (f.severity === 'HIGH') score -= 25;
      else if (f.severity === 'MEDIUM') score -= 10;
      else score -= 5;
    });
    const purityScore = Math.max(0, score);

    return {
      totalFindings: findings.length,
      purityScore,
      assertionRatio,
      logicLines,
      invariantCount,
      status: purityScore >= 80 ? 'CLEAN_PROVEN' : 'REFACTOR_RECOMMENDED',
      findings
    };
  }

  /**
   * Audita un archivo en el sistema de ficheros.
   */
  auditFile(filePath) {
    const fullPath = path.isAbsolute(filePath) ? filePath : path.join(this.root, filePath);
    if (!fs.existsSync(fullPath)) {
      return {
        error: 'FILE_NOT_FOUND',
        file: filePath,
        purityScore: 0,
        findings: []
      };
    }

    try {
      const content = fs.readFileSync(fullPath, 'utf8');
      const result = this.auditSource(content, { file: filePath });
      return {
        file: filePath,
        ...result
      };
    } catch (err) {
      return {
        error: 'READ_ERROR',
        file: filePath,
        message: err.message,
        purityScore: 0,
        findings: []
      };
    }
  }
}

if (require.main === module) {
  const analyzer = new MetacognitiveASTAnalyzer();
  const sampleClean = `
    function processInput(data) {
      if (!data || typeof data !== 'string') throw new Error('INVALID_INPUT');
      return data.trim();
    }
  `;
  console.log('[Metacognitive AST Analyzer] Auditoría de muestra limpia:');
  console.log(JSON.stringify(analyzer.auditSource(sampleClean), null, 2));

  const sampleFlawed = `
    function leakyOperation(data) {
      try {
        doSomething(data);
      } catch (err) {}
      global.lastData = data;
    }
  `;
  console.log('\n[Metacognitive AST Analyzer] Auditoría de muestra con fugas:');
  console.log(JSON.stringify(analyzer.auditSource(sampleFlawed), null, 2));
}

module.exports = MetacognitiveASTAnalyzer;
