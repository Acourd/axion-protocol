'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const {
  compileRiskPolicy,
  evaluateRiskRequirements,
} = require('../../tools/risk_policy_compiler.js');

const policyPath = path.join(__dirname, '..', '..', 'policies', 'risk.yaml');
const compiled = compileRiskPolicy(fs.readFileSync(policyPath, 'utf8'));
const required = [
  'written_human_approval',
  'explicit_scope',
  'executable_check',
  'rollback_plan',
  'independent_audit',
];

assert.deepStrictEqual(compiled.levels.HIGH.requirements, required);
assert.deepStrictEqual(compiled.levels.CRITICAL.requirements, required);
assert.strictEqual(compiled.levels.HIGH.humanGateRequired, true);
assert.strictEqual(compiled.levels.CRITICAL.humanGateRequired, true);

const missing = evaluateRiskRequirements(compiled, 'CRITICAL', {
  scope: [],
});
assert.deepStrictEqual(missing.missing, required);
assert.strictEqual(missing.satisfied, false);

assert.throws(
  () => compileRiskPolicy([
    'levels:',
    '  LOW:',
    '    human_gate_required: false',
    '  MEDIUM:',
    '    human_gate_required: conditional',
    '  HIGH:',
    '    human_gate_required: true',
    '  CRITICAL:',
    '    human_gate_required: true',
    'required_for_high_or_critical:',
    '  - invented_requirement',
  ].join('\n')),
  /requisito no soportado/i,
  'un requisito normativo desconocido debe bloquear la compilación',
);

console.log('PASS policy compiler — HIGH/CRITICAL compilan cinco requisitos y fallan cerrado');

// --- Enforcement: la politica declara como se hace cumplir -------------------
// Antes esta clave existia en risk.yaml y ningun modulo la leia: era una afirmacion
// que nada verificaba. Ahora el compilador la valida y el runner la exige.

const {
  SUPPORTED_ENFORCEMENT,
} = require('../../tools/risk_policy_compiler.js');

const politicaMinima = [
  'levels:',
  '  LOW:',
  '    human_gate_required: false',
  '  MEDIUM:',
  '    human_gate_required: conditional',
  '  HIGH:',
  '    human_gate_required: true',
  '  CRITICAL:',
  '    human_gate_required: true',
  'required_for_high_or_critical:',
  '  - explicit_scope',
].join('\n');

assert.deepStrictEqual(
  [...SUPPORTED_ENFORCEMENT].sort(),
  ['DOCUMENT_ONLY', 'RUNTIME_ENFORCED_BY_WORKFLOW_RUNNER'],
  'el runtime solo puede honrar los modos de enforcement que declara soportar',
);

assert.strictEqual(
  compiled.enforcement,
  'RUNTIME_ENFORCED_BY_WORKFLOW_RUNNER',
  'policies/risk.yaml declara enforcement por runtime y el compilador debe reflejarlo',
);

assert.strictEqual(
  compileRiskPolicy(politicaMinima).enforcement,
  'DOCUMENT_ONLY',
  'no declarar enforcement no puede otorgarlo: el valor conservador es DOCUMENT_ONLY',
);

assert.throws(
  () => compileRiskPolicy(`enforcement: RUNTIME_ENFORCED_BY_OTRA_COSA\n${politicaMinima}`),
  /enforcement no soportado/i,
  'un modo de enforcement que el runtime no sabe honrar debe bloquear la compilación',
);

console.log('PASS policy compiler — enforcement validado y respaldado por el runtime');
