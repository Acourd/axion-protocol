'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  RISK_DOMAIN,
  SUPPORTED_REQUIREMENTS,
  SUPPORTED_ENFORCEMENT,
  compileRiskPolicy,
  evaluateRiskRequirements
} = require('../../tools/risk_policy_compiler.js');

console.log('=== AX-F-035 Compilación Estricta de Políticas de Riesgo, Invariantes y Evaluación ===\n');

const ROOT = path.resolve(__dirname, '..', '..');

// --- 1. Los dominios y modos soportados son inmutables ---
// La política es dato, pero el conjunto de niveles y requisitos que el compilador admite no
// lo es: si se pudiera ampliar en caliente, una política podría inventarse su propio nivel.
assert.strictEqual(Object.isFrozen(RISK_DOMAIN), true);
assert.strictEqual(Object.isFrozen(SUPPORTED_REQUIREMENTS), true);
assert.strictEqual(Object.isFrozen(SUPPORTED_ENFORCEMENT), true);
console.log('✓ Inmutabilidad de dominios de riesgo y modos de enforcement verificada');

// --- 2. Rechazo de entradas que no son una política ---
// Se comprueban las dos caras: el mensaje, que es lo que lee la persona, y el tipo de error,
// que es lo que puede distinguir un llamador.
assert.throws(() => compileRiskPolicy(''), /no vacío/);
assert.throws(() => compileRiskPolicy(null), /no vacío/);
assert.throws(() => compileRiskPolicy(null), TypeError);
assert.throws(() => compileRiskPolicy('   '), TypeError);
assert.throws(() => compileRiskPolicy(123), TypeError);
console.log('✓ Rechazo por TypeError ante entradas vacías, en blanco o no textuales verificado');

// --- 3. Rechazo fail-closed de políticas malformadas ---
const yamlIncompleto = `
levels:
  LOW:
    human_gate_required: false
`;
assert.throws(() => compileRiskPolicy(yamlIncompleto), /no declara human_gate_required/);

const yamlDuplicado = `
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
  - written_human_approval
`;
assert.throws(() => compileRiskPolicy(yamlDuplicado), /duplicado/i);
console.log('✓ Rechazo ante omisión de niveles y requisitos duplicados verificado');

// --- 4. Rechazo de enforcement y requisitos fuera del dominio soportado ---
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

// --- 5. Compilación de una política sintética y segregación HIGH vs CRITICAL ---
// El fixture es sintético a propósito: fija los requisitos bajo control de la prueba, para
// que la segregación se compruebe contra lo declarado aquí y no contra lo que hoy traiga
// policies/risk.yaml. Si adversarial_premortem se promoviera de CRITICAL a HIGH, esta
// aserción es la que tiene que hablar.
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

// --- 6. Evaluación determinista sobre la política sintética ---
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

// --- 7. La política que se distribuye de verdad compila y evalúa ---
// Los fixtures sintéticos prueban el compilador; esto prueba el producto. Una política que
// el compilador rechaza deja el runtime sin gobernanza, y no lo detectaría ningún fixture.
const validYaml = fs.readFileSync(path.join(ROOT, 'policies', 'risk.yaml'), 'utf8');
const compiled = compileRiskPolicy(validYaml);
assert.strictEqual(Object.isFrozen(compiled), true);
assert.strictEqual(Object.isFrozen(compiled.levels), true);

const satisfiedFacts = {
  scope: ['src/core.js', 'package.json'],
  satisfiedRequirements: new Set([
    'written_human_approval',
    'executable_check',
    'rollback_plan',
    'independent_audit',
    'adversarial_premortem'
  ])
};

const evalCritical = evaluateRiskRequirements(compiled, 'CRITICAL', satisfiedFacts);
assert.strictEqual(evalCritical.satisfied, true);
assert.strictEqual(evalCritical.missing.length, 0);
assert.strictEqual(Object.isFrozen(evalCritical), true);

// Un nivel de riesgo inventado no se degrada a "sin requisitos": se rechaza por identidad.
const evalInvalidRisk = evaluateRiskRequirements(compiled, 'EXTREME_DANGER', satisfiedFacts);
assert.strictEqual(evalInvalidRisk.satisfied, false);
assert.deepStrictEqual(evalInvalidRisk.missing, ['valid_risk_identity']);
console.log('✓ Compilación de policies/risk.yaml y rechazo de identidades inválidas verificado');

console.log('\nPASS AX-F-035 — Compilador de políticas de riesgo, invariantes y evaluación verificados al 100%.\n');
