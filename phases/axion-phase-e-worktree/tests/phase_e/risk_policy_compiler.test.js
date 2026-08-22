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
