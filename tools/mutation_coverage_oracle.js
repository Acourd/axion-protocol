#!/usr/bin/env node
'use strict';

/**
 * Axion Protocol — Mutation Coverage Oracle & Adversarial Testing Engine (M_COG_007)
 *
 * Oráculo de cobertura mutacional y pruebas adversariales sintéticas:
 * 1. Genera mutantes atómicos en memoria alterando operadores de comparación, lógicos y retornos.
 * 2. Ejecuta arneses de prueba contra cada mutante para verificar si las aserciones detectan el defecto.
 * 3. Clasifica mutantes como KILLED (detectado) o SURVIVED (cobertura semántica deficiente).
 * 4. Deriva la puntuación de mutación (Mutation Score) garantizando tests resistentes a regresiones.
 *
 * Cero dependencias externas.
 */

const path = require('path');

const ROOT = path.resolve(__dirname, '..');

class MutationCoverageOracle {
  constructor(projectRoot = ROOT) {
    this.root = path.resolve(projectRoot);
  }

  /**
   * Genera mutantes atómicos en memoria a partir de una fuente de código JavaScript.
   */
  generateMutants(sourceCode = '') {
    if (!sourceCode || typeof sourceCode !== 'string') return [];

    const lines = sourceCode.split('\n');
    const mutants = [];
    let mutantId = 1;

    lines.forEach((line, lineIndex) => {
      // Regla de mutación 1: Igualdad estricta === a !==
      if (line.includes('===')) {
        const mutatedLine = line.replace('===', '!==');
        const copy = [...lines];
        copy[lineIndex] = mutatedLine;
        mutants.push({
          id: `MUT_${String(mutantId++).padStart(3, '0')}`,
          type: 'EQUALITY_FLIP',
          line: lineIndex + 1,
          original: line.trim(),
          mutated: mutatedLine.trim(),
          mutatedSource: copy.join('\n')
        });
      }

      // Regla de mutación 2: Operador lógico && a ||
      if (line.includes('&&')) {
        const mutatedLine = line.replace('&&', '||');
        const copy = [...lines];
        copy[lineIndex] = mutatedLine;
        mutants.push({
          id: `MUT_${String(mutantId++).padStart(3, '0')}`,
          type: 'LOGICAL_OPERATOR_FLIP',
          line: lineIndex + 1,
          original: line.trim(),
          mutated: mutatedLine.trim(),
          mutatedSource: copy.join('\n')
        });
      }

      // Regla de mutación 3: Retorno booleano true a false
      if (line.includes('return true')) {
        const mutatedLine = line.replace('return true', 'return false');
        const copy = [...lines];
        copy[lineIndex] = mutatedLine;
        mutants.push({
          id: `MUT_${String(mutantId++).padStart(3, '0')}`,
          type: 'BOOLEAN_RETURN_INVERSION',
          line: lineIndex + 1,
          original: line.trim(),
          mutated: mutatedLine.trim(),
          mutatedSource: copy.join('\n')
        });
      }
    });

    return mutants;
  }

  /**
   * Evalúa una suite o función de prueba contra la fuente original y sus mutantes generados.
   */
  evaluateMutationScore(sourceCode = '', testHarnessFn) {
    if (typeof testHarnessFn !== 'function') {
      throw new TypeError('testHarnessFn must be a function');
    }

    // 1. La fuente original debe superar el test obligatoriamente
    let baselinePassed = false;
    try {
      testHarnessFn(sourceCode);
      baselinePassed = true;
    } catch (err) {
      return {
        pass: false,
        error: `BASELINE_TEST_FAILED: Original code failed test harness: ${err.message}`,
        mutationScore: '0.0%',
        mutantsKilled: 0,
        totalMutants: 0
      };
    }

    const mutants = this.generateMutants(sourceCode);
    if (mutants.length === 0) {
      return {
        pass: true,
        mutationScore: '100.0%',
        totalMutants: 0,
        mutantsKilled: 0,
        survivedMutants: []
      };
    }

    let killedCount = 0;
    const survivedMutants = [];

    mutants.forEach(mutant => {
      try {
        testHarnessFn(mutant.mutatedSource);
        // Si no lanza excepción, el mutante sobrevivió
        survivedMutants.push({
          id: mutant.id,
          type: mutant.type,
          line: mutant.line,
          original: mutant.original
        });
      } catch {
        // Si lanza excepción, el test detectó la mutación
        killedCount++;
      }
    });

    const mutationScore = Number(((killedCount / mutants.length) * 100).toFixed(1));
    return {
      pass: mutationScore >= 75.0,
      mutationScore: `${mutationScore}%`,
      totalMutants: mutants.length,
      mutantsKilled: killedCount,
      mutantsSurvived: survivedMutants.length,
      rating: mutationScore >= 90.0 ? 'MUTATION_SOVEREIGN' : (mutationScore >= 75.0 ? 'MUTATION_RESILIENT' : 'MUTATION_FRAGILE'),
      survivedMutants
    };
  }
}

if (require.main === module) {
  const oracle = new MutationCoverageOracle();
  const sampleCode = `
    function isEligible(tokenCount, isCacheEnabled) {
      if (tokenCount >= 1024 && isCacheEnabled === true) {
        return true;
      }
      return false;
    }
  `;

  console.log('[Mutation Coverage Oracle] Evaluando mutantes...');
  const mutants = oracle.generateMutants(sampleCode);
  console.log(`- Mutantes sintéticos generados: ${mutants.length}`);

  // Test harness robusto que valida tanto igualdad como lógica
  const testHarness = (code) => {
    const fn = new Function(code + '\nreturn isEligible;')();
    if (fn(2048, true) !== true) throw new Error('Failed positive assertion');
    if (fn(2048, false) !== false) throw new Error('Failed cache disabled assertion');
  };

  const audit = oracle.evaluateMutationScore(sampleCode, testHarness);
  console.log('\n[Mutation Coverage Oracle] Resultado de Auditoría Mutacional:');
  console.log(JSON.stringify(audit, null, 2));
}

module.exports = MutationCoverageOracle;
