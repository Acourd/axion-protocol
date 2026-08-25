'use strict';

const assert = require('assert');
const {
  RISK_DOMAIN,
  SUPPORTED_REQUIREMENTS,
  SUPPORTED_ENFORCEMENT,
  compileRiskPolicy,
  evaluateRiskRequirements
} = require('../../tools/risk_policy_compiler.js');

console.log('=== AX-F-035 Compilación Estricta de Políticas de Riesgo y Evaluación de Requisitos ===\n');

// 1. Rechazo de entradas inválidas
assert.throws(() => compileRiskPolicy(''), /no vacío/);
assert.throws(() => compileRiskPolicy(null), /no vacío/);

// 2. Rechazo de políticas con niveles incompletos
const yamlIncompleto = `
levels:
  LOW:
    human_gate_required: false
`;
assert.throws(() => compileRiskPolicy(yamlIncompleto), /no declara human_gate_required/);
console.log('✓ Rechazo de entradas vacías y niveles incompletos verificado');

// 3. Rechazo de enforcement no soportado o requisitos desconocidos
const yamlEnforcementInvalido = `
enforcement: MAGIC_AUTO_FIX
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
`;
assert.throws(() => compileRiskPolicy(yamlEnforcementInvalido), /Modo de enforcement no soportado/);

const yamlRequisitoInvalido = `
enforcement: RUNTIME_ENFORCED_BY_WORKFLOW_RUNNER
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
  - requisito_fantasma_no_soportado
`;
assert.throws(() => compileRiskPolicy(yamlRequisitoInvalido), /Requisito no soportado/);
console.log('✓ Rechazo de enforcement desconocido y requisitos no soportados verificado');

// 4. Compilación válida y evaluación determinista
const yamlValido = `
enforcement: RUNTIME_ENFORCED_BY_WORKFLOW_RUNNER
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
  - explicit_scope
required_for_critical_only:
  - adversarial_premortem
`;

const compilado = compileRiskPolicy(yamlValido);
assert.strictEqual(compilado.enforcement, 'RUNTIME_ENFORCED_BY_WORKFLOW_RUNNER');
assert.strictEqual(compilado.levels.HIGH.humanGateRequired, true);
assert.strictEqual(compilado.levels.CRITICAL.requirements.includes('adversarial_premortem'), true);
assert.strictEqual(compilado.levels.HIGH.requirements.includes('adversarial_premortem'), false);
console.log('✓ Compilación estricta y segregación de requisitos HIGH vs CRITICAL verificada');

// 5. Evaluación de requisitos cumplidos y alcances válidos
const rLow = evaluateRiskRequirements(compilado, 'LOW');
assert.strictEqual(rLow.satisfied, true);

const rHighSinScope = evaluateRiskRequirements(compilado, 'HIGH', {
  satisfiedRequirements: new Set(['written_human_approval']),
  scope: []
});
assert.strictEqual(rHighSinScope.satisfied, false);
assert.strictEqual(rHighSinScope.missing.includes('explicit_scope'), true);

const rHighConScope = evaluateRiskRequirements(compilado, 'HIGH', {
  satisfiedRequirements: new Set(['written_human_approval']),
  scope: ['src/core.js']
});
assert.strictEqual(rHighConScope.satisfied, true);
assert.strictEqual(rHighConScope.missing.length, 0);
console.log('✓ Evaluación determinista de facts y validación de scope verificada');

console.log('\nPASS AX-F-035 — Compilador de políticas de riesgo verificado al 100%.\n');
