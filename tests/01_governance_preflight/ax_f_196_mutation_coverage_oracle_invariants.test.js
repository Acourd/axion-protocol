'use strict';

/**
 * AX-F-196: Invariantes del Oráculo de Cobertura Mutacional y Testing Adversarial (M_COG_007)
 *
 * Valida de forma determinista:
 * 1. Generación de mutantes atómicos sintéticos (operadores lógicos, igualdad y retornos).
 * 2. Validación obligatoria de línea base (fail-closed si el código original no pasa).
 * 3. Ejecución adversarial con cálculo riguroso de puntuación de mutación (Mutation Score).
 * 4. Integración transparente con DriveEngine.runMutationAudit().
 */

const assert = require('assert');
const path = require('path');
const MutationCoverageOracle = require('../../tools/mutation_coverage_oracle.js');
const DriveEngine = require('../../tools/drive_engine.js');

console.log('=== AX-F-196 Invariantes del Oráculo de Cobertura Mutacional (M_COG_007) ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const oracle = new MutationCoverageOracle(ROOT);

const sampleCode = `
  function validateThreshold(tokens, enabled) {
    if (tokens >= 1024 && enabled === true) {
      return true;
    }
    return false;
  }
`;

// Invariante 1: Generación de mutantes sintéticos
const mutants = oracle.generateMutants(sampleCode);
assert.ok(mutants.length >= 2, 'Debe generar al menos 2 mutantes');
assert.ok(mutants.some(m => m.type === 'EQUALITY_FLIP'), 'Debe generar mutación de igualdad');
assert.ok(mutants.some(m => m.type === 'LOGICAL_OPERATOR_FLIP'), 'Debe generar mutación lógica');
console.log(`✓ Invariante 1: Generación atómica de ${mutants.length} mutantes sintéticos validada`);

// Invariante 2: Rechazo de línea base si el test falla
assert.strictEqual(
  oracle.evaluateMutationScore(sampleCode, () => { throw new Error('Test roto'); }).pass,
  false,
  'Debe abortar si el código original falla el arnés'
);
console.log('✓ Invariante 2: Verificación fail-closed de línea base demostrada');

// Invariante 3: Auditoría mutacional con eliminación completa de mutantes
const robustHarness = (code) => {
  const fn = new Function(code + '\nreturn validateThreshold;')();
  if (fn(2048, true) !== true) throw new Error('Failed positive');
  if (fn(2048, false) !== false) throw new Error('Failed enabled false');
  if (fn(512, true) !== false) throw new Error('Failed under threshold');
};

const audit = oracle.evaluateMutationScore(sampleCode, robustHarness);
assert.strictEqual(audit.pass, true);
assert.strictEqual(audit.mutantsKilled, audit.totalMutants);
assert.strictEqual(audit.mutantsSurvived, 0);
assert.strictEqual(audit.mutationScore, '100%');
assert.strictEqual(audit.rating, 'MUTATION_SOVEREIGN');
console.log(`✓ Invariante 3: Cobertura mutacional soberana demostrada (Score: ${audit.mutationScore}, 100% mutantes aniquilados)`);

// Invariante 4: Integración con DriveEngine
const driveEngine = new DriveEngine(ROOT);
const driveAudit = driveEngine.runMutationAudit(sampleCode, robustHarness);
assert.strictEqual(driveAudit.pass, true);
assert.strictEqual(driveAudit.rating, 'MUTATION_SOVEREIGN');
console.log('✓ Invariante 4: Integración nativa con DriveEngine.runMutationAudit() verificada');

console.log('\nPASS AX-F-196 — Invariantes del oráculo de cobertura mutacional demostrados al 100%.');
