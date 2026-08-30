'use strict';

const assert = require('assert');
const {
  RISK_DOMAIN,
  SUPPORTED_REQUIREMENTS,
  SUPPORTED_ENFORCEMENT,
  compileRiskPolicy,
  evaluateRiskRequirements
} = require('../../tools/risk_policy_compiler.js');

console.log('=== AX-F-067 Invariantes Adversariales del Compilador y Evaluador de Políticas de Riesgo ===\n');

// 1. Inmutabilidad de los vocabularios del dominio de riesgo
assert.strictEqual(Object.isFrozen(RISK_DOMAIN), true);
assert.strictEqual(Object.isFrozen(SUPPORTED_REQUIREMENTS), true);
assert.strictEqual(Object.isFrozen(SUPPORTED_ENFORCEMENT), true);
assert.deepStrictEqual([...RISK_DOMAIN], ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
console.log('✓ Vocabularios cerrados de riesgo y requisitos inmutables');

// 2. Rechazo de fuentes YAML vacías o inválidas
assert.throws(() => compileRiskPolicy(''), TypeError);
assert.throws(() => compileRiskPolicy('   '), TypeError);
assert.throws(() => compileRiskPolicy(null), TypeError);
assert.throws(() => compileRiskPolicy(undefined), TypeError);
console.log('✓ Rechazo de fuentes YAML no válidas con TypeError verificado');

// 3. Compilación de política válida completa
const validYaml = `
enforcement: RUNTIME_ENFORCED_BY_WORKFLOW_RUNNER

levels:
  LOW:
    human_gate_required: false
  MEDIUM:
    human_gate_required: conditional
  HIGH:
    human_gate_required: true
  CRITICAL:
    human_gate_required: true

required_for_high_or_critical:
  - written_human_approval
  - explicit_scope
  - executable_check
  - rollback_plan
  - independent_audit

required_for_critical_only:
  - adversarial_premortem
`;

const compiled = compileRiskPolicy(validYaml);
assert.strictEqual(compiled.enforcement, 'RUNTIME_ENFORCED_BY_WORKFLOW_RUNNER');
assert.strictEqual(Object.isFrozen(compiled), true);
assert.strictEqual(Object.isFrozen(compiled.levels), true);
assert.strictEqual(compiled.levels.LOW.humanGateRequired, false);
assert.strictEqual(compiled.levels.MEDIUM.humanGateRequired, 'conditional');
assert.strictEqual(compiled.levels.HIGH.humanGateRequired, true);
assert.strictEqual(compiled.levels.CRITICAL.humanGateRequired, true);
assert.strictEqual(compiled.levels.HIGH.requirements.length, 5);
assert.strictEqual(compiled.levels.CRITICAL.requirements.length, 6);
console.log('✓ Compilación determinista de política válida con inmutabilidad profunda verificada');

// 4. Matriz de rechazos adversariales en compilación
// 4a. Falta un nivel de riesgo
const missingLevelYaml = `
levels:
  LOW:
    human_gate_required: false
  MEDIUM:
    human_gate_required: false
  HIGH:
    human_gate_required: true
required_for_high_or_critical:
  - written_human_approval
`;
assert.throws(() => compileRiskPolicy(missingLevelYaml), /no declara human_gate_required para CRITICAL/);

// 4b. Requisito no soportado por el runtime
const unsuppReqYaml = `
levels:
  LOW:
    human_gate_required: false
  MEDIUM:
    human_gate_required: false
  HIGH:
    human_gate_required: true
  CRITICAL:
    human_gate_required: true
required_for_high_or_critical:
  - requisito_magico_desconocido
`;
assert.throws(() => compileRiskPolicy(unsuppReqYaml), /Requisito no soportado por el runtime/);

// 4c. Requisito duplicado
const duplicateReqYaml = `
levels:
  LOW:
    human_gate_required: false
  MEDIUM:
    human_gate_required: false
  HIGH:
    human_gate_required: true
  CRITICAL:
    human_gate_required: true
required_for_high_or_critical:
  - written_human_approval
  - written_human_approval
`;
assert.throws(() => compileRiskPolicy(duplicateReqYaml), /Requisito normativo duplicado/);
console.log('✓ Matriz de rechazo ante niveles faltantes, requisitos espurios o duplicados verificada');

// 5. Evaluación de requisitos de riesgo (evaluateRiskRequirements)
// 5a. Fallo cerrado ante compiledPolicy inválido
const resInvalidPolicy = evaluateRiskRequirements(null, 'HIGH');
assert.strictEqual(resInvalidPolicy.satisfied, false);
assert.strictEqual(resInvalidPolicy.missing[0], 'invalid_compiled_policy');

// 5b. Fallo cerrado ante nivel de riesgo inválido o no reconocido
const resInvalidRisk = evaluateRiskRequirements(compiled, 'EXTREMO');
assert.strictEqual(resInvalidRisk.satisfied, false);
assert.strictEqual(resInvalidRisk.missing[0], 'valid_risk_identity');

// 5c. Evaluación de nivel LOW (0 requisitos exigidos)
const resLow = evaluateRiskRequirements(compiled, 'LOW');
assert.strictEqual(resLow.satisfied, true);
assert.strictEqual(resLow.missing.length, 0);

// 5d. Evaluación de nivel HIGH con hechos incompletos (falta scope y firmas)
const resHighIncomplete = evaluateRiskRequirements(compiled, 'HIGH', {
  satisfiedRequirements: new Set(['written_human_approval']),
  scope: [] // scope vacío no satisface explicit_scope
});
assert.strictEqual(resHighIncomplete.satisfied, false);
assert.strictEqual(resHighIncomplete.missing.includes('explicit_scope'), true);
assert.strictEqual(resHighIncomplete.missing.includes('rollback_plan'), true);

// 5e. Evaluación de nivel HIGH completamente satisfecho
const resHighComplete = evaluateRiskRequirements(compiled, 'HIGH', {
  satisfiedRequirements: new Set([
    'written_human_approval',
    'executable_check',
    'rollback_plan',
    'independent_audit'
  ]),
  scope: ['tools/risk_policy_compiler.js']
});
assert.strictEqual(resHighComplete.satisfied, true);
assert.strictEqual(resHighComplete.missing.length, 0);
console.log('✓ Evaluación estricta y fail-closed de hechos y explicit_scope verificada');

console.log('\nPASS AX-F-067 — Invariantes del compilador y evaluador de políticas demostrados al 100%.\n');
